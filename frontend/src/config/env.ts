// 🛡️ HUMAN CHECK:
// Se agregó validación runtime para evitar crash si falta variable.
// En producción, la app debe fallar de forma controlada.

function required(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing env variable: ${name}`);
  }
  return value;
}

export const env = {
  API_BASE_URL: required(
    "NEXT_PUBLIC_API_BASE_URL",
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ),

  POLLING_INTERVAL: Number(process.env.NEXT_PUBLIC_POLLING_INTERVAL ?? 3000),

  // ⚕️ HUMAN CHECK - URL del WebSocket
  // En producción, usar wss:// (WebSocket seguro)
  WS_URL: required("NEXT_PUBLIC_WS_URL", process.env.NEXT_PUBLIC_WS_URL),

  // SPEC-004: Firebase configuration (lazy getters — only called in browser when vars present)
  get FIREBASE_API_KEY() {
    return required(
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    );
  },
  get FIREBASE_AUTH_DOMAIN() {
    return required(
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    );
  },
  get FIREBASE_PROJECT_ID() {
    return required(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    );
  },
  get FIREBASE_APP_ID() {
    return required(
      "NEXT_PUBLIC_FIREBASE_APP_ID",
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    );
  },
};
