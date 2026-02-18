import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';

/**
 * 🛡️ HUMAN CHECK - WebSocket Auth Guard (Mock)
 * En un entorno real, esto validaría un JWT.
 * Para este taller, validamos un token estático 'elite-hardened-token'.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
    private readonly logger = new Logger(WsAuthGuard.name);

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        if (context.getType() !== 'ws') {
            return true;
        }

        const client: Socket = context.switchToWs().getClient();
        const token = client.handshake.auth?.token || client.handshake.headers?.authorization;

        const isValid = token === 'elite-hardened-token';

        if (!isValid) {
            this.logger.warn(`Unauthorized WS connection attempt from ${client.id}`);
            client.disconnect();
            return false;
        }

        return true;
    }
}
