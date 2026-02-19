import { AssignAvailableOfficesUseCase } from '../../domain/ports/inbound/assign-available-offices.use-case';
import { AppointmentRepository } from '../../domain/ports/outbound/appointment.repository';
import { ConsultationPolicy } from '../../domain/policies/consultation.policy';
import { LoggerPort } from '../../domain/ports/outbound/logger.port';
import { ClockPort } from '../../domain/ports/outbound/clock.port';
import { AppointmentAssignedEvent } from '../../domain/events/appointment-assigned.event';

/**
 * 🛰️ HUMAN CHECK - H-25 Fix: Automation via Repository Decorator
 */
export class AssignAvailableOfficesUseCaseImpl implements AssignAvailableOfficesUseCase {
    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly logger: LoggerPort,
        private readonly clock: ClockPort,
        private readonly totalOffices: number,
        // ⚕️ HUMAN CHECK - H-07 Fix: Injectable dependency, not static call
        private readonly consultationPolicy: ConsultationPolicy,
    ) { }

    async execute(): Promise<void> {
        // 1. Get available offices (Logic encapsulated in Repository - H-31)
        const allOffices = Array.from({ length: this.totalOffices }, (_, i) => String(i + 1));
        const freeOffices = await this.appointmentRepository.findAvailableOffices(allOffices);

        if (freeOffices.length === 0) return;

        // 2. Get waiting appointments
        const waiting = await this.appointmentRepository.findWaiting();
        if (waiting.length === 0) return;

        // 3. Batch Assignment
        const possibleAssignments = Math.min(freeOffices.length, waiting.length);

        for (let i = 0; i < possibleAssignments; i++) {
            const appointment = waiting[i];
            const office = freeOffices[i];

            // ⚕️ HUMAN CHECK - DIP: Logic delegated to injected Domain Policy (H-07)
            const randomDuration = this.consultationPolicy.getRandomDurationSeconds();

            appointment.assignOffice(office, randomDuration, this.clock.now());

            // 🧠 Intent: Business Rule record
            appointment.recordEvent(new AppointmentAssignedEvent(appointment));

            // 🎯 Automated Side-effects (H-25)
            await this.appointmentRepository.save(appointment);

            this.logger.log(`Assigned office ${office} to appointment ${appointment.idCard.toValue()}`, 'AssignAvailableOfficesUseCase');
        }
    }
}
