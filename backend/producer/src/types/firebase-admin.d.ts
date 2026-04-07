declare module "firebase-admin" {
  const admin: unknown;

  namespace admin {
    namespace app {
      type App = unknown;
    }
    namespace credential {
      type Credential = unknown;
    }
    type ServiceAccount = unknown;
  }

  export = admin;
}
