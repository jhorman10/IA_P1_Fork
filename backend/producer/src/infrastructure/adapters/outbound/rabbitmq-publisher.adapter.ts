import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

import {
  AppointmentPublisherPort,
  PublishAppointmentCommand,
} from "../../../domain/ports/outbound/appointment-publisher.port";

@Injectable()
export class RabbitMQPublisherAdapter implements AppointmentPublisherPort {
  private readonly logger = new Logger(RabbitMQPublisherAdapter.name);

  constructor(
    @Inject("APPOINTMENTS_SERVICE") private readonly client: ClientProxy,
  ) {}

  async publishAppointmentCreated(
    command: PublishAppointmentCommand,
  ): Promise<void> {
    try {
      this.client.emit("create_appointment", command);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to publish message to RabbitMQ: ${message}`);
      throw error;
    }
  }
}
