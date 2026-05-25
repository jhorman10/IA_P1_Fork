# architecture
backend: layered (routes -> services -> repositories -> models), async, FastAPI + Motor
frontend: components + hooks + services + pages, React 19 + Vite, CSS Modules
data: MongoDB; one collection per aggregate; indexes in repository init
auth: Firebase ID token in Authorization: Bearer
patterns_allowed: [Repository, Service, DI via Depends, Factory]
patterns_forbidden: [Singleton mutable global, God objects]
