export interface PublishAppointmentCommand {
  idCard: number;
  fullName: string;
  priority?: "high" | "medium" | "low";
}

export interface AppointmentPublisherPort {
  publishAppointmentCreated(command: PublishAppointmentCommand): Promise<void>;
}
