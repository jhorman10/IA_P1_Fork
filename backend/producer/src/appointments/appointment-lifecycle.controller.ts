import {
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { FirebaseAuthGuard } from "../auth/guards/firebase-auth.guard";
import { RoleGuard } from "../auth/guards/role.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { Auditable } from "../common/decorators/auditable.decorator";
import { AuditInterceptor } from "../common/interceptors/audit.interceptor";
import {
  AppointmentLifecyclePublisherPort,
  LIFECYCLE_PUBLISHER_TOKEN,
} from "../domain/ports/outbound/appointment-lifecycle-publisher.port";
import { AppointmentReadRepository } from "../domain/ports/outbound/appointment-read.repository";
import { CreateAppointmentResponseDto } from "../dto/create-appointment-response.dto";

// ⚕️ HUMAN CHECK - SPEC-012: Lifecycle controller handles explicit complete/cancel flows.
// Follows the CQRS pattern: producer validates preconditions (read-only) and publishes;
// consumer performs the actual state transition.

@ApiTags("Appointments")
@ApiBearerAuth()
@Controller("appointments")
export class AppointmentLifecycleController {
  constructor(
    @Inject("AppointmentReadRepository")
    private readonly appointmentReadRepository: AppointmentReadRepository,
    @Inject(LIFECYCLE_PUBLISHER_TOKEN)
    private readonly lifecyclePublisher: AppointmentLifecyclePublisherPort,
  ) {}

  /**
   * SPEC-012 — HU-01: Doctor marks current appointment as completed.
   * Roles: admin, doctor.
   * If actor is a doctor, validates ownership (turno must belong to their doctor_id).
   */
  @Patch(":id/complete")
  @HttpCode(200)
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin", "doctor")
  @UseInterceptors(AuditInterceptor)
  @Auditable("APPOINTMENT_COMPLETED")
  @ApiOperation({ summary: "Completar turno explícitamente (doctor o admin)" })
  @ApiParam({ name: "id", description: "MongoDB ObjectId del turno" })
  @ApiResponse({
    status: 200,
    description: "Turno marcado como completado",
    type: CreateAppointmentResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "No autorizado para completar turno de otro médico",
  })
  @ApiResponse({ status: 404, description: "Turno no encontrado" })
  @ApiResponse({ status: 409, description: "Turno no está en estado called" })
  async completeAppointment(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreateAppointmentResponseDto> {
    const appointment = await this.appointmentReadRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException("Turno no encontrado");
    }

    if (appointment.status !== "called") {
      throw new ConflictException(
        appointment.status === "completed"
          ? "Turno ya fue completado"
          : "Solo turnos en atención (called) pueden completarse",
      );
    }

    // Ownership check: if actor is doctor, turno must be assigned to them.
    if (user.role === "doctor") {
      if (!user.doctor_id || appointment.doctorId !== user.doctor_id) {
        throw new ForbiddenException(
          "No autorizado para completar turno de otro médico",
        );
      }
    }

    await this.lifecyclePublisher.publishCompleteAppointment({
      appointmentId: id,
      actorUid: user.uid,
      timestamp: Date.now(),
    });

    return { status: "accepted", message: "Turno marcado como completado" };
  }

  /**
   * SPEC-012 — HU-02: Receptionist or admin cancels a waiting appointment.
   * Roles: admin, recepcionista.
   */
  @Patch(":id/cancel")
  @HttpCode(200)
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin", "recepcionista")
  @UseInterceptors(AuditInterceptor)
  @Auditable("APPOINTMENT_CANCELLED")
  @ApiOperation({ summary: "Cancelar turno en espera (recepcionista o admin)" })
  @ApiParam({ name: "id", description: "MongoDB ObjectId del turno" })
  @ApiResponse({
    status: 200,
    description: "Turno cancelado",
    type: CreateAppointmentResponseDto,
  })
  @ApiResponse({ status: 403, description: "Rol no autorizado" })
  @ApiResponse({ status: 404, description: "Turno no encontrado" })
  @ApiResponse({
    status: 409,
    description: "Solo turnos en espera (waiting) pueden cancelarse",
  })
  async cancelAppointment(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreateAppointmentResponseDto> {
    const appointment = await this.appointmentReadRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException("Turno no encontrado");
    }

    if (appointment.status !== "waiting") {
      throw new ConflictException(
        "Solo turnos en espera (waiting) pueden cancelarse",
      );
    }

    await this.lifecyclePublisher.publishCancelAppointment({
      appointmentId: id,
      actorUid: user.uid,
      timestamp: Date.now(),
    });

    return { status: "accepted", message: "Turno cancelado" };
  }
}
