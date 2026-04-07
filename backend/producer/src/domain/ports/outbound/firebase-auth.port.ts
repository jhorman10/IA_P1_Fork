/**
 * SPEC-004: Outbound port — Firebase Auth verification adapter.
 * Abstracts the Firebase Admin SDK so tests can inject a mock.
 */
export interface DecodedToken {
  uid: string;
  email?: string;
}

export interface FirebaseAuthPort {
  verifyIdToken(idToken: string): Promise<DecodedToken>;
  createUser(email: string, password: string): Promise<{ uid: string }>;
  getUserByEmail(email: string): Promise<{ uid: string } | null>;
}

/** NestJS injection token for the Firebase Auth adapter. */
export const FIREBASE_AUTH_PORT = "FirebaseAuthPort";
