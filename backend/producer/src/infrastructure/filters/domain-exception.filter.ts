import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * Filter to catch Domain Errors (which currently throw generic Error in VOs)
 * and map them to HTTP 400 Bad Request immediately.
 */
@Catch(Error)
export class DomainExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(DomainExceptionFilter.name);

    catch(exception: Error, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        // 🛡️ HUMAN CHECK - Resilience:
        // If it's already an HttpException (e.g. 404, 403), let it pass or handle standard.
        // We only want to catch "Domain Validation Errors" which are generic JS Errors here.
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const responseBody = exception.getResponse();
            response.status(status).json(responseBody);
            return;
        }

        // Check if it's likely a Domain Validation Error (based on VO messages)
        // In a perfect world, we'd have `class DomainError extends Error`.
        // For now, we trust that VOs throw simple messages.
        const message = exception.message;

        // Log as warn, not error (it's client fault, not server)
        this.logger.warn(`Domain Validation Failed: ${message}`);

        response.status(HttpStatus.BAD_REQUEST).json({
            statusCode: HttpStatus.BAD_REQUEST,
            message: message,
            error: 'Bad Request',
        });
    }
}
