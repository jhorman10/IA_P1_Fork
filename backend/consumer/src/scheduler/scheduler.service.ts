import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { MaintenanceOrchestratorUseCase } from '../domain/ports/inbound/maintenance-orchestrator.use-case';
import { LoggerPort } from '../domain/ports/outbound/logger.port';

@Injectable()
export class SchedulerService implements OnModuleInit {
    private readonly intervalMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        @Inject('MaintenanceOrchestratorUseCase')
        private readonly maintenanceUseCase: MaintenanceOrchestratorUseCase,
        @Inject('LoggerPort')
        private readonly logger: LoggerPort,
    ) {
        this.intervalMs = Number(this.configService.get('SCHEDULER_INTERVAL_MS')) || 15000;
    }

    onModuleInit() {
        // ⚕️ HUMAN CHECK - Side Effects: Moved from constructor to lifecycle hook for testability
        this.logger.log(
            `Scheduler initialization — interval: ${this.intervalMs}ms.`,
            'SchedulerService'
        );

        const interval = setInterval(() => {
            void this.handleSchedulerTick();
        }, this.intervalMs);

        this.schedulerRegistry.addInterval('appointment-assignment-scheduler', interval);
    }

    async handleSchedulerTick(): Promise<void> {
        // 🎯 PURE TRIGGER: Scheduler only decides WHEN to run. 
        // Logic and orchestration is in the Application Layer.
        await this.maintenanceUseCase.execute();
    }
}
