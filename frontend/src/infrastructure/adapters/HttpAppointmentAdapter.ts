import { Appointment } from "@/domain/Appointment";
import { env } from "@/config/env";
import { AppointmentRepository } from "@/domain/ports/AppointmentRepository";
import { CreateAppointmentDTO, CreateAppointmentResponse } from "@/domain/CreateAppointment";
// 🛡️ HUMAN CHECK - Adapter uses raw HTTP Client (Infrastructure)
const headers = { "Content-Type": "application/json" };

export class HttpAppointmentAdapter implements AppointmentRepository {

    async getAppointments(): Promise<Appointment[]> {
        const res = await fetch(`${env.API_BASE_URL}/appointments`);
        if (!res.ok) throw new Error("HTTP_ERROR");
        return res.json();
    }

    async createAppointment(data: CreateAppointmentDTO): Promise<CreateAppointmentResponse> {
        const res = await fetch(`${env.API_BASE_URL}/appointments`, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("HTTP_ERROR");
        return res.json();
    }
}
