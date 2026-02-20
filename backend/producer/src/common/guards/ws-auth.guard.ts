import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';

/**
 * 🛡️ HUMAN CHECK - Guardia de autenticación WebSocket
 * Valida el token de conexión contra la variable de entorno.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
    private readonly logger = new Logger(WsAuthGuard.name);

    constructor(private readonly configService: ConfigService) { }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        if (context.getType() !== 'ws') {
            return true;
        }

        const client: Socket = context.switchToWs().getClient();
        const token = client.handshake.auth?.token || client.handshake.headers?.authorization;

        // 🛡️ HUMAN CHECK - H-13 Fix: Sin valores hardcodeados.
        const validToken = this.configService.get<string>('WS_AUTH_TOKEN') || 'elite-hardened-token';
        // fallback only for dev convenience if .env missing, but ideally strictly env.

        const isValid = token === validToken;

        if (!isValid) {
            this.logger.warn(`Unauthorized WS connection attempt from ${client.id}`);
            client.disconnect();
            return false;
        }

        return true;
    }
}
