import { AssignAvailableOfficesUseCase } from '../../domain/ports/inbound/assign-available-offices.use-case';
import { AppointmentRepository } from '../../domain/ports/outbound/appointment.repository';
import { NotificationPort } from '../../domain/ports/outbound/notification.port';
import { ConsultationPolicy } from '../../domain/policies/consultation.policy';
import { LoggerPort } from '../../domain/ports/outbound/logger.port';
import { ClockPort } from '../../domain/ports/outbound/clock.port';

export class AssignAvailableOfficesUseCaseImpl implements AssignAvailableOfficesUseCase {
    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly notificationPort: NotificationPort,
        private readonly logger: LoggerPort,
        private readonly clock: ClockPort,
        private readonly totalOffices: number,
    ) { }

    async execute(): Promise<void> {
        // 1. Get available offices
        const occupied = await this.appointmentRepository.getOccupiedOfficeIds();
        const allOffices = Array.from({ length: this.totalOffices }, (_, i) => String(i + 1));
        const freeOffices = allOffices.filter(id => !occupied.includes(id));

        if (freeOffices.length === 0) return;

        // 2. Get waiting appointments
        const waiting = await this.appointmentRepository.findWaiting();
        if (waiting.length === 0) return;

        // 3. Batch Assignment
        const possibleAssignments = Math.min(freeOffices.length, waiting.length);

        for (let i = 0; i < possibleAssignments; i++) {
            const appointment = waiting[i];
            const office = freeOffices[i];

            // ⚕️ HUMAN CHECK - DIP: Logic delegated to Domain Policy
            const randomDuration = ConsultationPolicy.getRandomDurationSeconds();

            appointment.assignOffice(office, randomDuration, this.clock.now());

            await this.appointmentRepository.save(appointment);
            await this.notificationPort.notifyAppointmentUpdated(appointment);

            this.logger.log(`Assigned office ${office} to appointment ${appointment.idCard}`, 'AssignAvailableOfficesUseCase');
        }
    }
}
