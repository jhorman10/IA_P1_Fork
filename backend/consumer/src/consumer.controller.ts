import { Controller, Inject, Logger } from "@nestjs/common";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";

import { RegisterAppointmentCommand } from "./application/commands/register-appointment.command";
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
}
