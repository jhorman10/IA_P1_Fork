import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

import {
  AppointmentLifecyclePublisherPort,
  CancelAppointmentEvent,
  CompleteAppointmentEvent,
  DoctorCheckedInEvent,
} from "../../../domain/ports/outbound/appointment-lifecycle-publisher.port";

@Injectable()
export class RabbitMQLifecyclePublisherAdapter implements AppointmentLifecyclePublisherPort {
  private readonly logger = new Logger(RabbitMQLifecyclePublisherAdapter.name);

  constructor(
    @Inject("APPOINTMENTS_SERVICE") private readonly client: ClientProxy,
  ) {}

  async publishCompleteAppointment(
    event: CompleteAppointmentEvent,
  ): Promise<void> {
    try {
      this.client.emit("complete_appointment", event);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to publish complete_appointment: ${message}`);
      throw error;
    }
  }

  async publishCancelAppointment(event: CancelAppointmentEvent): Promise<void> {
    try {
      this.client.emit("cancel_appointment", event);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to publish cancel_appointment: ${message}`);
      throw error;
    }
  }

  async publishDoctorCheckedIn(event: DoctorCheckedInEvent): Promise<void> {
    try {
      this.client.emit("doctor_checked_in", event);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to publish doctor_checked_in: ${message}`);
      throw error;
    }
  }
}
