import { RegisterAppointmentCommand } from "../../../application/commands/register-appointment.command";
import { Appointment } from "../../entities/appointment.entity";

export interface RegisterAppointmentUseCase {
  execute(command: RegisterAppointmentCommand): Promise<Appointment>;
}
