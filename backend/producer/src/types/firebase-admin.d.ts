declare module "firebase-admin" {
  const admin: any;

  namespace admin {
    namespace app {
      type App = any;
    }
    namespace credential {
      type Credential = any;
    }
    type ServiceAccount = any;
  }

  export = admin;
}
