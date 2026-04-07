import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Socket } from "socket.io";

import {
  FIREBASE_AUTH_PORT,
  FirebaseAuthPort,
} from "../../domain/ports/outbound/firebase-auth.port";
import {
  PROFILE_REPOSITORY_TOKEN,
  ProfileRepository,
} from "../../domain/ports/outbound/profile.repository";
import { AuthenticatedUser } from "../types/authenticated-user";

/**
 * SPEC-010: WebSocket guard that authenticates operational clients via Firebase idToken.
 *
 * Strategy:
 * 1. Extract token from client.handshake.auth.token or Authorization: Bearer header.
 * 2. Verify idToken with FirebaseAuthPort.
 * 3. Resolve Profile by uid — reject if not found or status != active.
 * 4. Attach client.data.user = AuthenticatedUser.
 *
 * On failure: emits WS_AUTH_ERROR event and disconnects the socket.
 */
@Injectable()
export class WsFirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsFirebaseAuthGuard.name);

  constructor(
    @Inject(FIREBASE_AUTH_PORT)
    private readonly firebaseAuth: FirebaseAuthPort,
    @Inject(PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepo: ProfileRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    return this.authenticateSocket(client);
  }

  /**
   * Authenticates a Socket.IO client.
   * Called from handleConnection so auth is enforced at connection time.
   */
  async authenticateSocket(client: Socket): Promise<boolean> {
    const token = this.extractToken(client);

    if (!token) {
      this.rejectClient(
        client,
        "UNAUTHORIZED",
        "Token de autenticación requerido",
      );
      return false;
    }

    try {
      const decoded = await this.firebaseAuth.verifyIdToken(token);
      const profile = await this.profileRepo.findByUid(decoded.uid);

      if (!profile) {
        this.rejectClient(
          client,
          "FORBIDDEN",
          "Perfil operativo no configurado",
        );
        return false;
      }

      if (profile.status !== "active") {
        this.rejectClient(client, "FORBIDDEN", "Perfil inactivo");
        return false;
      }

      const user: AuthenticatedUser = {
        uid: profile.uid,
        role: profile.role,
        status: profile.status,
        doctor_id: profile.doctor_id,
      };

      client.data["user"] = user;
      this.logger.log(
        `Operational WS authenticated: ${user.uid} (${user.role}) — socket ${client.id}`,
      );
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Operational WS auth failed for ${client.id}: ${message}`,
      );
      this.rejectClient(client, "UNAUTHORIZED", "Token inválido o expirado");
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && typeof authHeader === "string") {
      const [scheme, token] = authHeader.split(" ");
      if (scheme?.toLowerCase() === "bearer" && token) return token;
    }

    return null;
  }

  private rejectClient(client: Socket, code: string, message: string): void {
    client.emit("WS_AUTH_ERROR", { type: "WS_AUTH_ERROR", code, message });
    client.disconnect();
    this.logger.warn(
      `Operational WS rejected (${code}): socket ${client.id} — ${message}`,
    );
  }
}
