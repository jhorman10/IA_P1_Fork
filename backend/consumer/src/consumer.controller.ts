import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RegisterAppointmentUseCase } from './domain/ports/inbound/register-appointment.use-case';
import { ValidationError } from './domain/errors/validation.error';
import { RmqHeaders } from './infrastructure/messaging/rmq-headers.interface';

@Controller()
export class ConsumerController {
    private readonly logger = new Logger(ConsumerController.name);

    constructor(
        @Inject('RegisterAppointmentUseCase')
        private readonly registerUseCase: RegisterAppointmentUseCase,
    ) { }

    @EventPattern('create_appointment')
    async handleCreateAppointment(
        @Payload() data: CreateAppointmentDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        const properties = originalMsg?.properties || {};
        const headers: RmqHeaders = properties.headers || {};
        const retryCount = this.getRetryCount(headers);

        try {
            // 🎯 PURE DELEGATION: Controller only orchestrates the entry point.
            await this.registerUseCase.execute(data);
            channel.ack(originalMsg);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);

            // ⚕️ HUMAN CHECK - Resilience Policy Decision:
            // 1. ValidationError / DomainError -> FATAL (Move to DLQ)
            // 2. InfrastructureError -> TRANSIENT (Requeue)
            // 3. Unknown Error -> Retry until limit, then DLQ

            if (error instanceof ValidationError) {
                this.logger.error(`[FATAL] Validation error: ${message}. Moving to DLQ.`);
                channel.nack(originalMsg, false, false);
                return;
            }

            this.logger.warn(`[RETRY] Processing failure for patient ${data.idCard}: ${message}`);

            if (retryCount >= 2) {
                this.logger.error(`Max retries reached. Moving to DLQ. Error: ${message}`);
                channel.nack(originalMsg, false, false);
            } else {
                channel.nack(originalMsg, false, true); // Requeue
            }
        }
    }

    /**
     * Extracts retry count from RabbitMQ x-death header.
     */
    // ⚕️ HUMAN CHECK - H-04 Fix: Typed RmqHeaders instead of `any`
    private getRetryCount(headers: RmqHeaders): number {
        const xDeath = headers['x-death'];
        if (!xDeath || !Array.isArray(xDeath) || xDeath.length === 0) {
            return 0;
        }
        return xDeath.reduce((acc, entry) => acc + (entry.count || 0), 0);
    }
}
