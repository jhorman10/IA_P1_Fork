import { Appointment } from "@/domain/Appointment";
import {
  CreateAppointmentDTO,
  CreateAppointmentResponse,
} from "@/domain/CreateAppointment";

export interface AppointmentRepository {
  getAppointments(token: string): Promise<Appointment[]>;
  createAppointment(
    data: CreateAppointmentDTO,
    token: string,
  ): Promise<CreateAppointmentResponse>;
}
