import { AssignAppointmentsUseCase } from '../../domain/ports/inbound/assign-appointments.use-case';
import { AppointmentRepository } from '../../domain/ports/outbound/appointment.repository';
import { NotificationPort } from '../../domain/ports/outbound/notification.port';
import { Logger } from '@nestjs/common';

// Pattern: Use Case — Orchestrates domain entities and ports
// ⚕️ HUMAN CHECK - SRP: This class only handles the assignment process

export class AssignAppointmentsUseCaseImpl implements AssignAppointmentsUseCase {
    private readonly logger = new Logger(AssignAppointmentsUseCaseImpl.name);
    private readonly totalOffices: number;

    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly notificationPort: NotificationPort,
        totalOffices: number,
    ) {
        this.totalOffices = totalOffices;
    }

    async execute(): Promise<void> {
        const now = Date.now();

        // 1. Complete expired appointments
        const expired = await this.appointmentRepository.findExpiredCalled(now);
        for (const app of expired) {
            app.complete();
            await this.appointmentRepository.save(app);
            await this.notificationPort.notifyAppointmentUpdated(app);
        }

        // 2. Get available offices
        const occupied = await this.appointmentRepository.getOccupiedOfficeIds();
        const allOffices = Array.from({ length: this.totalOffices }, (_, i) => String(i + 1));
        const freeOffices = allOffices.filter(id => !occupied.includes(id));

        if (freeOffices.length === 0) return;

        // 3. Get waiting appointments
        const waiting = await this.appointmentRepository.findWaiting();
        if (waiting.length === 0) return;

        // 4. Batch Assignment
        const possibleAssignments = Math.min(freeOffices.length, waiting.length);

        for (let i = 0; i < possibleAssignments; i++) {
            const appointment = waiting[i];
            const office = freeOffices[i];

            // Pattern: Random attention duration logic moved here from service
            const randomDuration = Math.floor(Math.random() * (15 - 8 + 1)) + 8;

            appointment.assignOffice(office, randomDuration);

            await this.appointmentRepository.save(appointment);
            await this.notificationPort.notifyAppointmentUpdated(appointment);

            this.logger.log(`Assigned office ${office} to appointment ${appointment.id}`);
        }
    }
}
