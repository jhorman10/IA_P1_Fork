declare module "firebase-admin" {
  namespace admin {
    namespace app {
      interface App {
        auth(): {
          verifyIdToken(
            idToken: string,
          ): Promise<{ uid: string; email?: string }>;
          createUser(data: {
            email: string;
            password: string;
          }): Promise<{ uid: string }>;
        };
      }
    }

    namespace credential {
      interface Credential {}
      function cert(serviceAccount: ServiceAccount): Credential;
      function applicationDefault(): Credential;
    }

    interface ServiceAccount {
      projectId?: string;
      clientEmail?: string;
      privateKey?: string;
      [key: string]: any;
    }

    const apps: app.App[];
    function initializeApp(opt?: {
      credential?: credential.Credential;
      projectId?: string;
    }): app.App;
  }

  interface AdminNamespace {
    apps: admin.app.App[];
    initializeApp(opt?: {
      credential?: admin.credential.Credential;
      projectId?: string;
    }): admin.app.App;
    credential: {
      cert(serviceAccount: admin.ServiceAccount): admin.credential.Credential;
      applicationDefault(): admin.credential.Credential;
    };
  }

  const admin: AdminNamespace;
  export = admin;
}
