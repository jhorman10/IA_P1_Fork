import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

import {
  DecodedToken,
  FirebaseAuthPort,
} from "../../../domain/ports/outbound/firebase-auth.port";

/**
 * SPEC-004: Adapter — Firebase Admin SDK implementation of FirebaseAuthPort.
 * Initializes once on module start from environment variables.
 *
 * Required env vars (one of):
 *   - FIREBASE_CREDENTIAL_JSON  — full service account JSON string
 *   - FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   - GOOGLE_APPLICATION_CREDENTIALS — path to service account file
 *
 * For test/emulator: set FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
 *
 * E2E test bypass (strictly scoped):
 *   Set NODE_ENV=test and E2E_TEST_MODE=true to skip Firebase SDK initialization.
 *   Tokens with prefix "e2e::" are decoded locally: "e2e::<uid>".
 *   This bypass is NEVER active by default and requires the explicit env var.
 */
@Injectable()
export class FirebaseAuthAdapter implements FirebaseAuthPort, OnModuleInit {
  private readonly logger = new Logger(FirebaseAuthAdapter.name);
  private app!: admin.app.App;
  /** True only when NODE_ENV=test and E2E_TEST_MODE=true are explicitly set. */
  private readonly e2eTestMode: boolean;

  constructor(private readonly config: ConfigService) {
    const isTestEnv =
      this.config.get<string>("NODE_ENV")?.toLowerCase() === "test";
    const explicitE2EFlag =
      this.config.get<string>("E2E_TEST_MODE")?.toLowerCase() === "true";

    this.e2eTestMode = isTestEnv && explicitE2EFlag;

    if (explicitE2EFlag && !isTestEnv) {
      this.logger.warn(
        "Ignoring E2E_TEST_MODE because NODE_ENV is not 'test'. " +
          "Firebase bypass stays disabled.",
      );
    }
  }

  onModuleInit(): void {
    if (this.e2eTestMode) {
      this.logger.warn(
        "E2E_TEST_MODE active — Firebase Admin SDK initialization skipped. " +
          "Only e2e:: prefixed tokens are accepted.",
      );
      return;
    }

    // Re-use an already-initialized app (e.g., in test environments).
    if (admin.apps.length > 0) {
      this.app = admin.apps[0]!;
      this.logger.log("Re-using existing Firebase app instance");
      return;
    }

    const credential = this.buildCredential();
    const projectId = this.config.get<string>("FIREBASE_PROJECT_ID");

    this.app = admin.initializeApp({ credential, projectId });
    this.logger.log("Firebase Admin SDK initialized");
  }

  async verifyIdToken(idToken: string): Promise<DecodedToken> {
    if (this.e2eTestMode) {
      const E2E_PREFIX = "e2e::";
      if (idToken.startsWith(E2E_PREFIX)) {
        const uid = idToken.slice(E2E_PREFIX.length).trim();
        if (!uid) {
          throw new UnauthorizedException("E2E token: uid vacío");
        }
        return { uid };
      }
      throw new UnauthorizedException(
        "E2E_TEST_MODE activo — solo se aceptan tokens e2e::<uid>",
      );
    }

    try {
      const decoded = await this.app.auth().verifyIdToken(idToken);
      return { uid: decoded.uid, email: decoded.email };
    } catch {
      throw new UnauthorizedException("Token de Firebase inválido o expirado");
    }
  }

  async createUser(email: string, password: string): Promise<{ uid: string }> {
    if (this.e2eTestMode) {
      return { uid: `e2e_${email.replace(/[^a-zA-Z0-9]/g, "_")}` };
    }

    try {
      const userRecord = await this.app.auth().createUser({ email, password });
      return { uid: userRecord.uid };
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === "auth/email-already-exists") {
        throw new ConflictException(
          "Ya existe un usuario en Firebase con ese correo",
        );
      }
      if (firebaseError.code === "auth/invalid-password") {
        throw new BadRequestException(
          "La contraseña debe tener al menos 6 caracteres",
        );
      }
      throw new BadRequestException(
        firebaseError.message ?? "Error al crear usuario en Firebase",
      );
    }
  }

  async getUserByEmail(email: string): Promise<{ uid: string } | null> {
    if (this.e2eTestMode) {
      return { uid: `e2e_${email.replace(/[^a-zA-Z0-9]/g, "_")}` };
    }
    try {
      // firebase-admin v11: auth() return type is narrowed; cast to access BaseAuth.getUserByEmail
      const authService = this.app.auth() as unknown as {
        getUserByEmail(email: string): Promise<{ uid: string }>;
      };
      const userRecord = await authService.getUserByEmail(email);
      return { uid: userRecord.uid };
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/user-not-found") return null;
      throw new BadRequestException(
        "Error al buscar usuario en Firebase por correo",
      );
    }
  }

  private buildCredential(): admin.credential.Credential {
    const credentialJson = this.config.get<string>("FIREBASE_CREDENTIAL_JSON");
    if (credentialJson) {
      try {
        const parsed = JSON.parse(credentialJson) as admin.ServiceAccount;
        return admin.credential.cert(parsed);
      } catch {
        this.logger.error("FIREBASE_CREDENTIAL_JSON is not valid JSON");
        throw new Error("Invalid FIREBASE_CREDENTIAL_JSON");
      }
    }

    const projectId = this.config.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = this.config.get<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = this.config.get<string>("FIREBASE_PRIVATE_KEY");

    if (projectId && clientEmail && privateKey) {
      return admin.credential.cert({
        projectId,
        clientEmail,
        // Handle escaped newlines often injected via .env
        privateKey: privateKey.replace(/\\n/g, "\n"),
      });
    }

    this.logger.warn(
      "No explicit Firebase credentials configured — falling back to application default credentials (GOOGLE_APPLICATION_CREDENTIALS)",
    );
    return admin.credential.applicationDefault();
  }
}
