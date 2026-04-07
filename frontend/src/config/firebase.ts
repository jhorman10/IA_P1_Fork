// SPEC-004: Firebase client initialization — single source
// All Firebase env vars are required at startup; fail loudly if missing.
//
// Static imports of firebase/app and firebase/auth are intentionally avoided:
// their Node.js bundles reference `fetch` at module-init time, which is not
// available in SSR or jest-environment-jsdom.  We use require() inside a
// conditional so the modules are only loaded when actually running in a real
// browser with Firebase config present.
import type { Auth } from "firebase/auth";

import { env } from "./env";

let _auth: Auth | null = null;

// Only initialise Firebase when:
//  1. Running in a real browser (typeof window !== 'undefined'), AND
//  2. The Firebase config is actually present in the environment.
//     If NEXT_PUBLIC_FIREBASE_API_KEY is absent we skip init rather than
//     crashing — env.FIREBASE_* lazy getters will still throw loudly if
//     any other browser code accesses them without the vars being set.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApps, initializeApp } =
    require("firebase/app") as typeof import("firebase/app");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAuth } =
    require("firebase/auth") as typeof import("firebase/auth");

  const firebaseConfig = {
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    projectId: env.FIREBASE_PROJECT_ID,
    appId: env.FIREBASE_APP_ID,
  };

  const app =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

  _auth = getAuth(app);
}

export const firebaseAuth = _auth as Auth;

export default _auth;
