import { Injectable, Logger, Inject } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { TurnosService } from '../appointments/turnos.service';
import { ConfigService } from '@nestjs/config';

// ⚕️ HUMAN CHECK - Office assignment scheduler
// Interval read from ConfigService: SCHEDULER_INTERVAL_MS
const DEFAULT_OFFICES = 5;

import { AssignAppointmentsUseCase } from '../domain/ports/inbound/assign-appointments.use-case';

// ⚕️ HUMAN CHECK - SRP: This service is now only a TRIGGER for the domain logic
// Pattern: Trigger — Invokes Use Case on a schedule

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);
    private readonly intervalMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        @Inject('AssignAppointmentsUseCase') private readonly useCase: AssignAppointmentsUseCase,
    ) {
        this.intervalMs = Number(this.configService.get('SCHEDULER_INTERVAL_MS')) || 15000;

        this.logger.log(
            `Scheduler started — interval: ${this.intervalMs}ms. Delegating to AssignAppointmentsUseCase.`,
        );

        const interval = setInterval(() => {
            void this.handleSchedulerTick();
        }, this.intervalMs);
        this.schedulerRegistry.addInterval('appointment-assignment-scheduler', interval);
    }

    async handleSchedulerTick(): Promise<void> {
        try {
            await this.useCase.execute();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error in assignment scheduler: ${message}`);
        }
    }
}
