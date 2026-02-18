import { Injectable, Logger } from '@nestjs/common';
import { LoggerPort } from '../../domain/ports/outbound/logger.port';

/**
 * ⚕️ HUMAN CHECK - Infrastructure Adapter: Maps Domain LoggerPort to NestJS Logger.
 */
@Injectable()
export class NestLoggerAdapter implements LoggerPort {
    private readonly logger = new Logger('Application');

    log(message: string, context?: string): void {
        this.logger.log(message, context);
    }

    error(message: string, trace?: string, context?: string): void {
        this.logger.error(message, trace, context);
    }

    warn(message: string, context?: string): void {
        this.logger.warn(message, context);
    }

    debug(message: string, context?: string): void {
        this.logger.debug(message, context);
    }

    verbose(message: string, context?: string): void {
        this.logger.verbose(message, context);
    }
}
