import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RegisterAppointmentUseCase } from './domain/ports/inbound/register-appointment.use-case';
import { DomainError } from './domain/errors/domain.error'; // Changed from ValidationError
import { RmqHeaders } from './infrastructure/messaging/rmq-headers.interface';

import { RegisterAppointmentCommand } from './application/commands/register-appointment.command';

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
            // ⚕️ HUMAN CHECK - DIP: Input mapped to Command before Use Case execution
            const command = new RegisterAppointmentCommand(data.idCard, data.fullName);
            await this.registerUseCase.execute(command);
            channel.ack(originalMsg);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);

            // ⚕️ HUMAN CHECK - Resilience Policy Decision:
            // 1. DomainError (Validation/Business Rules) -> FATAL (Move to DLQ immediately)
            // 2. Infrastructure/Transient Error -> Retry until limit, then DLQ

            if (error instanceof DomainError) {
                this.logger.error(`[FATAL] Domain/Business violation: ${message}. Moving to DLQ.`);
                channel.nack(originalMsg, false, false); // No requeue
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
