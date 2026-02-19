import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '../../../domain/errors/domain.error';
import { RetryPolicyPort } from '../../../domain/ports/outbound/retry-policy.port';

@Injectable()
export class RetryPolicyAdapter implements RetryPolicyPort {
    private readonly maxRetries: number;

    constructor(private readonly configService: ConfigService) {
        this.maxRetries = Number(this.configService.get('MAX_RETRIES') ?? 2);
    }

    shouldMoveToDLQ(retryCount: number, error: unknown): boolean {
        if (error instanceof DomainError) {
            return true; // FATAL: move to DLQ immediately
        }
        return retryCount >= this.maxRetries;
    }

    getMaxRetries(): number {
        return this.maxRetries;
    }
}
