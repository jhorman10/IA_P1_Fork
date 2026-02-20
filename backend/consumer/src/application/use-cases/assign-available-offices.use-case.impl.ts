import { AssignAvailableOfficesUseCase } from '../../domain/ports/inbound/assign-available-offices.use-case';
import { AppointmentRepository } from '../../domain/ports/outbound/appointment.repository';
import { ConsultationPolicy } from '../../domain/policies/consultation.policy';
import { LoggerPort } from '../../domain/ports/outbound/logger.port';
import { ClockPort } from '../../domain/ports/outbound/clock.port';
import { AppointmentAssignedEvent } from '../../domain/events/appointment-assigned.event';

/**
 * 🛰️ HUMAN CHECK - H-25 Fix: Automatización mediante el Decorador del Repositorio
 */
export class AssignAvailableOfficesUseCaseImpl implements AssignAvailableOfficesUseCase {
    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly logger: LoggerPort,
        private readonly clock: ClockPort,
        private readonly totalOffices: number,
        // ⚕️ HUMAN CHECK - H-07 Fix: Dependencia inyectable, no llamada estática
        private readonly consultationPolicy: ConsultationPolicy,
    ) { }

    async execute(): Promise<void> {
        this.logger.log('--- INICIO ASIGNACIÓN DE CONSULTORIOS ---', 'AssignAvailableOfficesUseCase');
        const allOffices = Array.from({ length: this.totalOffices }, (_, i) => String(i + 1));
        this.logger.log(`Oficinas totales: ${allOffices.join(', ')}`, 'AssignAvailableOfficesUseCase');
        const freeOffices = await this.appointmentRepository.findAvailableOffices(allOffices);
        this.logger.log(`Oficinas libres detectadas: ${freeOffices.join(', ')}`, 'AssignAvailableOfficesUseCase');

        if (freeOffices.length === 0) {
            this.logger.log('No hay oficinas libres para asignar.', 'AssignAvailableOfficesUseCase');
            return;
        }

        let waiting = await this.appointmentRepository.findWaiting();
        this.logger.log(`Turnos en espera detectados: ${waiting.map(a => a.idCard.toValue()).join(', ')}`, 'AssignAvailableOfficesUseCase');
        if (waiting.length === 0) {
            this.logger.log('No hay turnos en espera para asignar.', 'AssignAvailableOfficesUseCase');
            return;
        }

        // Ordenar por prioridad (high, medium, low) y luego por timestamp (FIFO)
        waiting = waiting.sort((a, b) => {
            const priorityDiff = a.priority.getNumericWeight() - b.priority.getNumericWeight();
            if (priorityDiff !== 0) return priorityDiff;
            return a.timestamp - b.timestamp;
        });

        const possibleAssignments = Math.min(freeOffices.length, waiting.length);
        this.logger.log(`Asignaciones posibles: ${possibleAssignments}`, 'AssignAvailableOfficesUseCase');

        for (let i = 0; i < possibleAssignments; i++) {
            const appointment = waiting[i];
            const office = freeOffices[i];
            this.logger.log(`Asignando oficina ${office} al turno ${appointment.idCard.toValue()} (prioridad: ${appointment.priority.toValue()})`, 'AssignAvailableOfficesUseCase');
            const randomDuration = this.consultationPolicy.getRandomDurationSeconds();
            this.logger.log(`Duración asignada: ${randomDuration}s`, 'AssignAvailableOfficesUseCase');
            appointment.assignOffice(office, randomDuration, this.clock.now());
            appointment.recordEvent(new AppointmentAssignedEvent(appointment));
            await this.appointmentRepository.save(appointment);
            this.logger.log(`Assigned office ${office} to appointment ${appointment.idCard.toValue()}`, 'AssignAvailableOfficesUseCase');
        }
        this.logger.log('--- FIN ASIGNACIÓN DE CONSULTORIOS ---', 'AssignAvailableOfficesUseCase');
    }
}
