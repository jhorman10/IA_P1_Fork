SPEC-004 / SPEC-006 — Notas de diseño y decisiones

Resumen:
- La autenticación operativa se realiza validando el `idToken` de Firebase enviado
  en el header `Authorization: Bearer <idToken>` mediante el puerto `FirebaseAuthPort`.
- Se implementaron dos guards diferenciados:
  - `FirebaseTokenOnlyGuard`: valida el token y extrae `uid` sin requerir perfil existente
    (usado por `POST /profiles/self/initialize`).
  - `FirebaseAuthGuard`: valida token y resuelve el `Profile` operativo; bloquea si no existe
    o está inactivo (usado por endpoints operativos).

Audit log:
- Los cambios a perfiles (PATCH) generan una entrada de auditoría escrita en la
  colección `profile_audit_logs` mediante el adaptador Mongoose `MongooseProfileAuditLogAdapter`.
- La escritura de auditoría es "fire-and-forget": el servicio intenta escribir en background
  y no bloquea la respuesta en caso de fallo.

Throttling / Rate limiting:
- El proyecto usa `@nestjs/throttler` y configura `ThrottlerModule` en `AppModule`.
- Endpoints sensibles (`GET /profiles`, `PATCH /profiles/:uid`) aplican `@Throttle`
  con límites por defecto de 20 req/min en el controller; la configuración global
  se puede ajustar vía variables `THROTTLE_TTL` y `THROTTLE_LIMIT`.

Decisiones de integración vs mock:
- Durante desarrollo y tests unitarios/integración se mockea `FirebaseAuthPort`.
  En producción se espera un adaptador real (`FirebaseAuthAdapter`) que haga `verifyIdToken`.
- CI no contiene credenciales Firebase; por tanto los tests usan mocks y el flujo
  real de verificación se valida manualmente en entornos integrados controlados.

Cómo probar localmente:
- Levantar MongoDB y la API Producer con las variables de entorno mínimas:
  - `MONGODB_URI` — URI de MongoDB
  - (Opcional) `THROTTLE_TTL`, `THROTTLE_LIMIT`
- Llamar `POST /auth/session` con `Authorization: Bearer <idToken>` (mockear verifyIdToken
  si se prueba localmente sin Firebase).
- Llamar `POST /profiles/self/initialize` con `Authorization: Bearer <idToken>`.

Notas:
- Este archivo documenta las decisiones principales relacionadas con SPEC-004 y SPEC-006.
