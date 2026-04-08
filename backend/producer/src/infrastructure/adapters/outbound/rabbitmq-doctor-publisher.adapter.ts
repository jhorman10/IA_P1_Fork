import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

import {
  DoctorCheckedInEvent,
  DoctorEventPublisherPort,
} from "../../../domain/ports/outbound/doctor-event-publisher.port";

/**
 * Adapter: Infrastructure — RabbitMQ publisher for doctor lifecycle events.
 * SPEC-003: Emite doctor_checked_in al Consumer para trigger reactivo de asignación.
 */
@Injectable()
export class RabbitMQDoctorPublisherAdapter implements DoctorEventPublisherPort {
  private readonly logger = new Logger(RabbitMQDoctorPublisherAdapter.name);

  constructor(
    @Inject("APPOINTMENTS_SERVICE") private readonly client: ClientProxy,
  ) {}

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
