import { CompleteExpiredAppointmentsUseCase } from '../domain/ports/inbound/complete-expired-appointments.use-case';
import { AssignAvailableOfficesUseCase } from '../domain/ports/inbound/assign-available-offices.use-case';

// ⚕️ HUMAN CHECK - SRP: Triggered by the scheduler, delegating cleanup and assignment to specialized Use Cases
@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);
    private readonly intervalMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        @Inject('CompleteExpiredAppointmentsUseCase') private readonly completeUseCase: CompleteExpiredAppointmentsUseCase,
        @Inject('AssignAvailableOfficesUseCase') private readonly assignUseCase: AssignAvailableOfficesUseCase,
    ) {
        this.intervalMs = Number(this.configService.get('SCHEDULER_INTERVAL_MS')) || 15000;

        this.logger.log(
            `Scheduler started — interval: ${this.intervalMs}ms. Delegating cleanup and assignment.`,
        );

        const interval = setInterval(() => {
            void this.handleSchedulerTick();
        }, this.intervalMs);
        this.schedulerRegistry.addInterval('appointment-assignment-scheduler', interval);
    }

    async handleSchedulerTick(): Promise<void> {
        try {
            // 1. First, complete what's done
            await this.completeUseCase.execute();
            // 2. Then, assign what's free
            await this.assignUseCase.execute();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error in scheduler orchestration: ${message}`);
        }
    }
}
