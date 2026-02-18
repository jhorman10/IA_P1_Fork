import { Injectable, Logger, Inject } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { TurnosService } from '../appointments/turnos.service';
import { ConfigService } from '@nestjs/config';

// ⚕️ HUMAN CHECK - Office assignment scheduler
// Interval read from ConfigService: SCHEDULER_INTERVAL_MS
const DEFAULT_OFFICES = 5;

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);
    private readonly totalOffices: number;
    private readonly intervalMs: number;
    private readonly allOffices: string[];

    constructor(
        private readonly turnosService: TurnosService,
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        @Inject('TURNOS_NOTIFICATIONS') private readonly notificationsClient: ClientProxy,
    ) {
        this.intervalMs = Number(this.configService.get('SCHEDULER_INTERVAL_MS')) || 15000;
        this.totalOffices = Number(this.configService.get('CONSULTORIOS_TOTAL')) || DEFAULT_OFFICES;

        // Precalculate offices array
        this.allOffices = Array.from(
            { length: this.totalOffices },
            (_, i) => String(i + 1),
        );

        this.logger.log(
            `Scheduler started — ${this.totalOffices} offices, interval: ${this.intervalMs}ms`,
        );

        const interval = setInterval(() => {
            void this.handleSchedulerTick();
        }, this.intervalMs);
        this.schedulerRegistry.addInterval('appointment-assignment-scheduler', interval);
    }

    async handleSchedulerTick(): Promise<void> {
        try {
            // Step 0: Complete previous appointments
            const completed = await this.turnosService.completeCalledAppointments();
            for (const t of completed) {
                this.notificationsClient.emit(
                    'appointment_updated',
                    this.turnosService.toEventPayload(t),
                );
            }

            // 1. Get occupied offices
            const occupied = await this.turnosService.getOccupiedOffices();
            this.logger.debug(`Occupied offices: [${occupied.join(', ')}]`);

            // 2. Filter free offices
            const freeOffices = this.allOffices.filter(c => !occupied.includes(c));

            if (freeOffices.length === 0) {
                this.logger.debug('No free offices — waiting...');
                return;
            }

            // 3. Get waiting appointments
            const waiting = await this.turnosService.findWaitingAppointments();

            if (waiting.length === 0) {
                this.logger.debug('No waiting appointments');
                return;
            }

            // 4. Batch Assignment
            const possibleAssignments = Math.min(freeOffices.length, waiting.length);
            this.logger.log(`Processing batch of ${possibleAssignments} assignments...`);

            for (let i = 0; i < possibleAssignments; i++) {
                const pending = waiting[i];
                const office = freeOffices[i];

                const updatedAppointment = await this.turnosService.assignOffice(
                    String(pending._id),
                    office,
                );

                if (updatedAppointment) {
                    this.logger.log(
                        `✅ [Batch] Office ${office} assigned to ${updatedAppointment.fullName}`,
                    );

                    this.notificationsClient.emit(
                        'appointment_updated',
                        this.turnosService.toEventPayload(updatedAppointment),
                    );
                }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error in assignment scheduler: ${message}`);
        }
    }
}
