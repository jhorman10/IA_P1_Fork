import { Controller, Inject, Logger } from "@nestjs/common";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";

import { RegisterAppointmentCommand } from "./domain/commands/register-appointment.command";
import { CancelAppointmentUseCase } from "./domain/ports/inbound/cancel-appointment.use-case";
import { CompleteAppointmentUseCase } from "./domain/ports/inbound/complete-appointment.use-case";
import { MaintenanceOrchestratorUseCase } from "./domain/ports/inbound/maintenance-orchestrator.use-case";
import { RegisterAppointmentUseCase } from "./domain/ports/inbound/register-appointment.use-case";
import { RetryPolicyPort } from "./domain/ports/outbound/retry-policy.port";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { RmqHeaders } from "./infrastructure/messaging/rmq-headers.interface";

@Controller()
export class ConsumerController {
  private readonly logger = new Logger(ConsumerController.name);

  constructor(
    @Inject("RegisterAppointmentUseCase")
    private readonly registerUseCase: RegisterAppointmentUseCase,
    @Inject("RetryPolicyPort")
    private readonly retryPolicy: RetryPolicyPort,
    @Inject("CompleteAppointmentUseCase")
    private readonly completeUseCase: CompleteAppointmentUseCase,
    @Inject("CancelAppointmentUseCase")
    private readonly cancelUseCase: CancelAppointmentUseCase,
    @Inject("MaintenanceOrchestratorUseCase")
    private readonly maintenanceUseCase: MaintenanceOrchestratorUseCase,
  ) {}

  @EventPattern("create_appointment")
  async handleCreateAppointment(
    @Payload() data: CreateAppointmentDto,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const properties = originalMsg?.properties || {};
    const headers: RmqHeaders = properties.headers || {};
    const retryCount = this.getRetryCount(headers);

    try {
      // ⚕️ HUMAN CHECK - DIP: El input se mapea al Command antes de ejecutar el Caso de Uso
      const command = new RegisterAppointmentCommand(
        data.idCard,
        data.fullName,
        data.priority,
      );
      await this.registerUseCase.execute(command);
      channel.ack(originalMsg);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[RETRY] Processing failure for patient ${data.idCard}: ${message}`,
      );
      if (this.retryPolicy.shouldMoveToDLQ(retryCount, error)) {
        this.logger.error(`[DLQ] Moving to DLQ. Error: ${message}`);
        channel.nack(originalMsg, false, false);
      } else {
        channel.nack(originalMsg, false, true); // Requeue
      }
    }
  }

  /**
   * Extracts retry count from RabbitMQ x-death header.
   */
  // ⚕️ HUMAN CHECK - H-04 Fix: RmqHeaders tipado en lugar de `any`
  private getRetryCount(headers: RmqHeaders): number {
    const xDeath = headers["x-death"];
    if (!xDeath || !Array.isArray(xDeath) || xDeath.length === 0) {
      return 0;
    }
    return xDeath.reduce((acc, entry) => acc + (entry.count || 0), 0);
  }

  @EventPattern("complete_appointment")
  async handleCompleteAppointment(
    @Payload()
    data: { appointmentId: string; actorUid: string; timestamp: number },
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.completeUseCase.execute(data.appointmentId);
      channel.ack(originalMsg);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[ERROR] complete_appointment failed for ${data.appointmentId}: ${message}`,
      );
      channel.ack(originalMsg);
    }
  }

  @EventPattern("cancel_appointment")
  async handleCancelAppointment(
    @Payload()
    data: { appointmentId: string; actorUid: string; timestamp: number },
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.cancelUseCase.execute(data.appointmentId);
      channel.ack(originalMsg);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[ERROR] cancel_appointment failed for ${data.appointmentId}: ${message}`,
      );
      channel.ack(originalMsg);
    }
  }

  /**
   * SPEC-003: When a doctor checks in, trigger reactive assignment
   * to immediately assign waiting patients to the newly available doctor.
   */
  @EventPattern("doctor_checked_in")
  async handleDoctorCheckedIn(
    @Payload() data: { doctorId: string; timestamp: number },
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `[doctor_checked_in] Doctor ${data.doctorId} checked in — triggering assignment`,
      );
      await this.maintenanceUseCase.execute();
      channel.ack(originalMsg);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[ERROR] doctor_checked_in failed for ${data.doctorId}: ${message}`,
      );
      channel.ack(originalMsg);
    }
  }
}
