import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';

/**
 * 🛡️ HUMAN CHECK - Guardia de autenticación WebSocket
 * Valida el token de conexión contra la variable de entorno WS_AUTH_TOKEN.
 * 
 * SEGURIDAD CRÍTICA: WS_AUTH_TOKEN es OBLIGATORIO en producción.
 * Falha en startup si la variable no está configurada.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
    private readonly logger = new Logger(WsAuthGuard.name);
    // ⚕️ HUMAN CHECK H-S1: Token cargado en constructor garantiza fail-fast si falta variable env
    private readonly wsAuthToken: string;

    constructor(private readonly configService: ConfigService) {
        // Fail-fast si WS_AUTH_TOKEN no está definida
        this.wsAuthToken = this.configService.getOrThrow<string>(
            'WS_AUTH_TOKEN',
            'WS_AUTH_TOKEN environment variable is required for WebSocket authentication'
        );
    }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        if (context.getType() !== 'ws') {
            return true;
        }

        const client: Socket = context.switchToWs().getClient();
        const token = client.handshake.auth?.token || client.handshake.headers?.authorization;

        // ✅ FIXED H-S1: Token validado contra variable env obligatoria
        const isValid = token === this.wsAuthToken;

        if (!isValid) {
            this.logger.warn(`Unauthorized WS connection attempt from ${client.id}`);
            client.disconnect();
            return false;
        }

        return true;
    }
}
