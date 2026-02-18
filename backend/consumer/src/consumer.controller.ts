import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RegisterAppointmentUseCase } from './domain/ports/inbound/register-appointment.use-case';
import { ValidationError } from './domain/errors/validation.error';

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
        const headers = properties.headers || {};
        const retryCount = this.getRetryCount(headers);

        try {
            // 🎯 PURE DELEGATION: Controller only orchestrates the entry point.
            // Side effects (Notifications/Dashboard) are now in the Application layer.
            await this.registerUseCase.execute(data);

            channel.ack(originalMsg);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);

            // ⚕️ HUMAN CHECK - Policy Decision: ValidationError is fatal and goes to DLQ
            if (error instanceof ValidationError) {
                this.logger.error(`Validation error for patient ${data.idCard}: ${message}. Moving to DLQ.`);
                channel.nack(originalMsg, false, false); // No requeue
                return;
            }

            if (retryCount >= 2) {
                this.logger.error(`Max retries (3) reached for patient ${data.idCard}: ${message}. Moving to DLQ.`);
                channel.nack(originalMsg, false, false);
            } else {
                this.logger.warn(`Transient error for patient ${data.idCard}: ${message}. Requeuing (Retry ${retryCount + 1}/3)...`);
                channel.nack(originalMsg, false, true);
            }
        }
    }

    /**
     * Extracts retry count from RabbitMQ x-death header.
     */
    private getRetryCount(headers: any): number {
        const xDeath = headers['x-death'];
        if (!xDeath || !Array.isArray(xDeath) || xDeath.length === 0) {
            return 0;
        }
        return xDeath.reduce((acc, entry) => acc + (entry.count || 0), 0);
    }
}
