# Test Plan - SPEC-004 Operational Access Foundation

## 1. Resumen ejecutivo

El proyecto evaluado es el Sistema Inteligente de Gestion de Turnos Medicos y, para SPEC-004, el objetivo de pruebas es demostrar que el producto ya puede operar con personal interno autenticado sin romper el flujo publico heredado.

Este plan cubre tres objetivos simultaneos:

- validar los flujos criticos del negocio definidos en el contexto corregido,
- comprobar el enforcement real de roles y restricciones operativas,
- y dejar evidencia compatible con Semanas 2, 3 y 4.

Estado conocido al momento del plan:

- Producer: 30/30 suites, 185/185 tests reportados en verde.
- Consumer: 34/34 suites, 427/427 tests reportados en verde.
- Frontend: suite completa en verde y build limpio despues del ajuste de Firebase/Auth lazy-loading.
- CI: workflow presente en `.github/workflows/ci.yml`.

## 2. Contexto fuente usado por este plan

### Flujos criticos priorizados

- Inicio de sesion operativo.
- Administracion admin-only de Perfiles.
- Registro de turnos protegido.
- Contexto medico propio.
- Continuidad del flujo publico como excepcion operativa.

### Modulos o funcionalidades criticas

- Auth + sesion operativa.
- CRUD de Perfiles.
- Registro de turnos.
- Contexto medico y modulo de medicos.
- Pantalla publica y dashboard.
- CI/CD y seguridad Docker.

### Restricciones y excepciones relevantes para QA

- La pantalla publica sigue sin auth y expone datos visibles.
- No existe E2E auth-aware completo.
- Branch protection es externo al repo.
- WebSocket auth sigue fuera de alcance.

## 3. Alcance del plan

### En alcance

- Resolucion de sesion operativa con Firebase + Perfil activo.
- CRUD admin-only de Perfiles operativos.
- Proteccion de registro de turnos y modulo de medicos por rol.
- Restriccion de contexto para medicos.
- Estado de autenticacion y redirecciones del frontend.
- Regresion de consumer, WebSocket y pantalla publica.
- Build, pipeline y seguridad Docker visibles en el repo.
- Riesgos de privacidad y control de acceso derivados del contexto de negocio.

### Fuera de alcance o no evidenciado automaticamente

- Signup publico, recuperacion de password y MFA.
- Proteccion del canal WebSocket con `idToken`.
- Branch protection efectiva en GitHub.
- E2E automatizado del journey autenticado completo.
- Evidencia remota de Actions verde y artifacts descargables.

## 4. Inventario de suites y niveles

| Suite o grupo                                    | Capa     | Nivel            | Herramienta             | Objetivo principal                                         | Estado QA                               |
| ------------------------------------------------ | -------- | ---------------- | ----------------------- | ---------------------------------------------------------- | --------------------------------------- |
| `firebase-auth.guard.spec.ts`                    | Producer | Unit             | Jest                    | Bearer token, Perfil activo, 401/403                       | Implementado                            |
| `role.guard.spec.ts`                             | Producer | Unit             | Jest                    | Metadata `@Roles()` y rechazo de rol invalido              | Implementado                            |
| `doctor-context.guard.spec.ts`                   | Producer | Unit             | Jest                    | Ownership medico -> doctor propio                          | Implementado                            |
| `profile.service.impl.spec.ts`                   | Producer | Unit             | Jest                    | Duplicados, `doctor_id`, update y session resolution       | Implementado                            |
| `mongoose-profile.repository.spec.ts`            | Producer | Unit             | Jest                    | Persistencia, defaults, filtros y paginacion               | Implementado                            |
| `auth.controller.spec.ts`                        | Producer | Integracion      | Jest + Supertest        | `POST /auth/session` con allowed modules y errores 401/403 | Implementado                            |
| `profiles.controller.spec.ts`                    | Producer | Integracion      | Jest + Supertest        | CRUD/listado protegido y `GET /profiles/me`                | Implementado                            |
| `spec-004-auth-flow.integration.spec.ts`         | Producer | Integracion      | Jest + Supertest        | Login operativo + registro permitido/bloqueado por rol     | Implementado                            |
| `doctor.controller.spec.ts`                      | Producer | Integracion      | Jest + Supertest        | Roles de medicos, duplicados y doctor context              | Implementado                            |
| `useAuth.spec.ts` y `useAuth.session.spec.tsx`   | Frontend | Unit             | Jest + Testing Library  | Estado auth, logout, limpieza de sesion y error state      | Implementado                            |
| `LoginForm.spec.tsx` y `app/login/page.spec.tsx` | Frontend | Component        | Jest + Testing Library  | Formulario, mensajes de error, redireccion por rol         | Implementado                            |
| `RoleGate.spec.tsx`                              | Frontend | Component        | Jest + Testing Library  | Bloqueo visual por rol                                     | Implementado                            |
| `app/admin/profiles/page.spec.tsx`               | Frontend | Component        | Jest + Testing Library  | Acceso admin, lista de Perfiles y logout                   | Implementado                            |
| `useAppointmentRegistration.spec.ts`             | Frontend | Unit             | Jest + Testing Library  | Reenvio de Bearer token al registro de turnos              | Implementado                            |
| Suite consumer                                   | Consumer | Unit/Integracion | Jest                    | Regresion del pipeline de asignacion y notificaciones      | Implementado                            |
| `backend/e2e/appointment.e2e.spec.ts`            | Backend  | E2E caja negra   | ts-node + MongoDB + API | Flujo publico legado `API -> queue -> MongoDB`             | Implementado, no auth-aware             |
| `ci.yml`                                         | DevOps   | Pipeline         | GitHub Actions          | Build, pruebas y seguridad                                 | Implementado con brechas de enforcement |

## 5. Casos de prueba priorizados

| ID    | Flujo / HU        | Tipo                    | Prioridad | Precondicion                                                     | Resultado esperado                                                              |
| ----- | ----------------- | ----------------------- | --------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| TP-01 | HU-01             | Integracion             | Alta      | Usuario interno con Perfil admin activo                          | La sesion operativa se resuelve y habilita modulos de admin                     |
| TP-02 | HU-01             | Validacion              | Alta      | Token valido sin Perfil operativo                                | El backend responde 403 y el frontend no mantiene sesion usable                 |
| TP-03 | HU-01             | Component               | Media     | Credenciales incorrectas                                         | La pantalla muestra mensaje amigable sin exponer error tecnico crudo            |
| TP-04 | HU-01             | Unit                    | Alta      | `onAuthStateChanged` entrega usuario pero falla `resolveSession` | El frontend hace sign-out, limpia estado y expone el error                      |
| TP-05 | HU-02             | Integracion             | Alta      | Admin autenticado                                                | Puede crear Perfil nuevo y este nace activo por defecto                         |
| TP-06 | HU-02             | Unit                    | Alta      | `uid` o `email` ya existen                                       | El sistema bloquea alta con 409                                                 |
| TP-07 | HU-02             | Unit                    | Alta      | Rol doctor sin `doctor_id`                                       | El sistema bloquea alta/edicion con 400                                         |
| TP-08 | HU-02             | Integracion             | Alta      | Recepcionista autenticado                                        | No puede crear ni listar Perfiles                                               |
| TP-09 | HU-03             | Integracion             | Alta      | Recepcionista autenticado                                        | Puede registrar turnos y producer acepta la solicitud                           |
| TP-10 | HU-03             | Component + Integracion | Alta      | Doctor autenticado                                               | La UI bloquea registro y el backend devuelve 403 si se intenta directo          |
| TP-11 | HU-03             | Integracion             | Alta      | Doctor autenticado sobre su propio contexto                      | El check-in/check-out esta permitido                                            |
| TP-12 | HU-03             | Integracion             | Alta      | Doctor autenticado sobre otro contexto                           | El sistema devuelve 403                                                         |
| TP-13 | Excepcion publica | Black-box               | Media     | Home publica sin autenticacion                                   | La pantalla publica sigue operando en tiempo real y el riesgo queda documentado |
| TP-14 | Pipeline          | DevOps                  | Media     | Push o PR en GitHub                                              | El workflow ejecuta build, pruebas y seguridad                                  |

## 6. Los 7 principios del testing aplicados

1. El testing muestra presencia de defectos. Aqui se priorizan errores de seguridad, autorizacion y privacidad.
2. El testing exhaustivo es imposible. La matriz se focaliza en auth, Perfiles, registro y contexto medico.
3. Testing temprano. La distribucion de pruebas alrededor de guards, servicios, hooks y componentes sugiere construccion orientada a prueba.
4. Defect clustering. La mayor densidad de riesgo esta en producer y frontend auth, no en consumer.
5. Pesticide paradox. No basta un login feliz; se agregan Perfil faltante, Perfil inactivo, duplicados, doctor sin contexto y bloqueo de rol.
6. Testing depends on context. En un sistema medico-operativo, confidencialidad y acceso correcto pesan mas que una optimizacion cosmetica.
7. Absence-of-errors fallacy. Una suite verde no elimina riesgos como pantalla publica con nombres visibles, gaps de E2E auth o falta de branch protection.

## 7. Estrategia multinivel y distribucion real

| Nivel               | Objetivo                                            | Evidencia actual                      | Lectura QA                            |
| ------------------- | --------------------------------------------------- | ------------------------------------- | ------------------------------------- |
| Unit                | Cobertura de ramas y reglas de negocio              | Alta en producer, consumer y frontend | Nivel mas fuerte del feature          |
| Integracion         | Validar controller + guard + contrato HTTP          | Fuerte en producer                    | Bien cubierto para auth/profile/role  |
| E2E                 | Ver flujo real entre procesos                       | Existe solo para flujo publico legado | Brecha para auth journey              |
| Manual exploratoria | Confirmar redirecciones, UX y politica real por rol | Necesaria                             | Debe complementar el cierre local     |
| Pipeline            | Automatizar build, test y seguridad                 | Existe `ci.yml`                       | Requiere endurecimiento de compuertas |

## 8. Pipeline y quality gates

El workflow actual incluye cinco jobs:

1. `lint-and-build`
2. `component-tests`
3. `integration-tests`
4. `docker-security`
5. `deploy-ready`

Lectura QA del pipeline actual:

- Es consistente con el objetivo de testing multinivel de Semana 3.
- Ejecuta coverage, pero no se observa un threshold explicito de fail-under.
- Las corridas de integracion y E2E usan `continue-on-error`, por lo que hoy funcionan mas como observabilidad que como compuerta dura.
- `deploy-ready` depende de jobs previos y corre en pull request, pero su valor real depende de endurecer la politica anterior.

## 9. Criterios de entrada y salida

### Entry criteria

- Spec aprobada y codigo de auth/profile/role presente.
- Suites locales reportadas en verde para producer, consumer y frontend.
- Documentacion QA generada.

### Exit criteria locales

- Estrategia, plan, contexto, refinamiento y casos IA completos.
- Gherkin y riesgos ASD generados en `docs/output/qa/`.
- Riesgos altos explicitados con mitigacion.
- Diferenciacion Verificar vs Validar sustentada con pruebas reales.

### Exit criteria que siguen externos o parciales

- Link o evidencia remota de GitHub Actions verde.
- Branch protection activa en `main`.
- Auth E2E automatizado de punta a punta.
- Enforcement automatico de cobertura e integracion como gates duros.

## 10. Go / no-go local

Decision QA local: GO condicional.

Justificacion:

- La implementacion de producer y frontend esta suficientemente soportada por pruebas unitarias e integracion.
- Consumer da confianza de no regresion del pipeline heredado.
- El cierre de release sigue condicionado por privacidad de la pantalla publica, CI sin compuertas duras completas, branch protection manual y ausencia de E2E auth-aware.
