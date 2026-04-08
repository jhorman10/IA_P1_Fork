// SPEC-004: HttpAppointmentRepository — AppointmentRepository using the resilient httpClient
import { env } from "@/config/env";
import { Appointment } from "@/domain/Appointment";
import {
  CreateAppointmentDTO,
  CreateAppointmentResponse,
} from "@/domain/CreateAppointment";
import { AppointmentRepository } from "@/domain/ports/AppointmentRepository";
import { httpGet, httpPost } from "@/lib/httpClient";

export class HttpAppointmentRepository implements AppointmentRepository {
  async getAppointments(token: string): Promise<Appointment[]> {
    return httpGet<Appointment[]>(`${env.API_BASE_URL}/appointments`, {
      Authorization: `Bearer ${token}`,
    });
  }

  async createAppointment(
    data: CreateAppointmentDTO,
    token: string,
  ): Promise<CreateAppointmentResponse> {
    return httpPost<CreateAppointmentResponse>(
      `${env.API_BASE_URL}/appointments`,
      data,
      { Authorization: `Bearer ${token}` },
    );
  }
}
