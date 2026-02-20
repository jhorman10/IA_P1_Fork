import { Appointment } from "../../entities/appointment.entity";
import { RegisterAppointmentCommand } from "../../../application/commands/register-appointment.command";

export interface RegisterAppointmentUseCase {
  execute(command: RegisterAppointmentCommand): Promise<Appointment>;
}
