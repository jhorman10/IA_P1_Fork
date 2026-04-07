# Testing Strategy - SPEC-004 Operational Access Foundation

## 1. Proposito y contexto de negocio

SPEC-004 agrega la base de acceso operativo sobre el Sistema Inteligente de Gestion de Turnos Medicos. La estrategia de pruebas debe responder al contexto de negocio corregido:

- habilitar operacion interna con identidad, Perfil y rol,
- proteger flujos criticos sin romper la experiencia publica heredada,
- y documentar explicitamente las excepciones y riesgos del estado actual.

Contexto de evaluacion:

- Semana 2: TDD IA-Native, Verificar vs Validar, Zero Errors.
- Semana 3: DevOps, CI/CD, testing multinivel, GitFlow.
- Semana 4: refinamiento QA asistido por IA, INVEST, Gherkin y documentacion.

Estado conocido al redactar este documento:

- Producer: 30/30 suites y 185/185 tests reportados en verde.
- Consumer: 34/34 suites y 427/427 tests reportados en verde.
- Frontend: suite completa en verde y build limpio despues de lazy-loading para Firebase/Auth.
- CI: existe workflow en `.github/workflows/ci.yml` con jobs de lint/build, component tests, integration tests y seguridad Docker.

## 2. Sistema bajo prueba y contexto base

### Flujos criticos del negocio

- Inicio de sesion operativo.
- Administracion de Perfiles y roles.
- Registro de turnos protegido.
- Contexto medico propio.
- Continuidad de la pantalla publica como excepcion operativa actual.

### Roles relevantes

- Administrador.
- Recepcionista.
- Doctor.
- Paciente / visitante.

### Restricciones y excepciones relevantes para QA

- La pantalla publica sigue sin autenticacion y expone datos visibles.
- El rol doctor no tiene landing dedicada en frontend.
- WebSocket auth sigue fuera de alcance.
- No existe aun un E2E auth-aware completo.
- Branch protection y evidencia remota de Actions dependen de GitHub, no del repo.

## 3. Estrategia multinivel

| Nivel                | Tipo                      | Enfoque real en el repo                                        | Evidencia actual                                                                                                                |
| -------------------- | ------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Estatica             | White-box                 | Lint, TypeScript y build de producer, consumer y frontend      | Workflow `lint-and-build` en CI                                                                                                 |
| Unit                 | White-box                 | Guards, servicios, repositorios, hooks y componentes           | Producer y frontend tienen pruebas focalizadas por unidad                                                                       |
| Integracion          | White-box                 | Controllers con guards reales y dependencias mockeadas         | `auth.controller.spec.ts`, `profiles.controller.spec.ts`, `spec-004-auth-flow.integration.spec.ts`, `doctor.controller.spec.ts` |
| Regresion de dominio | White-box                 | Consumer conserva cobertura alta del pipeline heredado         | Suite consumer completa reportada en verde                                                                                      |
| E2E                  | Black-box                 | Existe E2E legado del flujo publico de turnos                  | `backend/e2e/appointment.e2e.spec.ts`                                                                                           |
| Exploratoria manual  | Black-box                 | Necesaria para login -> Perfiles -> registro -> doctor context | No automatizada completamente en el repo                                                                                        |
| Operacional          | Non-functional / pipeline | Docker build y Trivy                                           | Workflow `docker-security`                                                                                                      |

Lectura QA:

- La base de seguridad esta bien defendida por pruebas unitarias e integracion.
- La evidencia automatizada black-box de auth aun no esta al mismo nivel que la evidencia white-box.
- Consumer aporta confianza de no regresion, pero no valida auth directamente.

## 4. Caja blanca vs caja negra

### Caja blanca

Se usa para verificar contratos internos, ramificaciones y reglas exactas:

- `FirebaseAuthGuard` autentica Bearer token, consulta Perfil y adjunta `request.user`.
- `RoleGuard` interpreta metadata `@Roles()` y rechaza combinaciones invalidas.
- `DoctorContextGuard` protege la regla de ownership del medico.
- `ProfileServiceImpl` resuelve negocio de duplicados, `doctor_id` obligatorio y estado activo.
- `useAuth`, `LoginForm`, `RoleGate`, `AdminProfilesPage` y `useAppointmentRegistration` verifican comportamiento de UI y orquestacion.

### Caja negra

Se usa para observar el comportamiento del sistema como producto:

- El E2E actual del repo valida el flujo publico `HTTP -> RabbitMQ -> MongoDB` sin autenticacion.
- La home publica y el dashboard se comportan como pantallas operativas reales en tiempo real.
- El flujo autenticado completo sigue requiriendo validacion manual o una automatizacion nueva.

Conclusion QA: la estrategia actual protege bien la implementacion, pero no debe presentarse como si ya existiera una automatizacion black-box completa del acceso operativo.

## 5. Verificar vs Validar

- Verificar: demuestra que la implementacion tecnica hace lo que su contrato dice.
- Validar: demuestra que la regla de negocio se sostiene ante condiciones adversas o usos indebidos.

| Categoria | Prueba real del repo                                                             | Que demuestra                                                                  |
| --------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Verificar | `FirebaseAuthGuard` autentica token valido y adjunta `request.user`              | El guard interpreta correctamente el header Bearer y resuelve el Perfil activo |
| Verificar | `RoleGuard` permite acceso cuando el rol requerido coincide                      | La metadata `@Roles()` se traduce correctamente a autorizacion backend         |
| Verificar | `MongooseProfileRepository` crea Perfiles con `status=active` por defecto        | El adaptador preserva el contrato de persistencia esperado                     |
| Verificar | `LoginForm` envia credenciales sanitizadas cuando el formulario es valido        | La UI prepara correctamente los datos antes de delegar login                   |
| Verificar | `useAppointmentRegistration` reenvia el Bearer token al repositorio              | El frontend no pierde el contexto de autenticacion al registrar turnos         |
| Validar   | `FirebaseAuthGuard` rechaza Perfil inexistente o inactivo                        | Un token valido no alcanza para operar sin Perfil activo                       |
| Validar   | `AuthController` devuelve 403 cuando el Perfil no existe o esta inactivo         | La sesion operativa depende de reglas de negocio, no solo de Firebase          |
| Validar   | `ProfileServiceImpl` lanza 409 por `uid` o `email` duplicado                     | El negocio impide alta operativa inconsistente                                 |
| Validar   | `ProfileServiceImpl` lanza 400 cuando un doctor no tiene `doctor_id`             | El modelo de rol protege integridad de contexto medico                         |
| Validar   | `ProfilesController` devuelve 403 cuando un recepcionista intenta crear Perfiles | El CRUD de Perfiles se mantiene admin-only                                     |
| Validar   | `DoctorContextGuard` rechaza a un doctor operando otro contexto                  | El ownership del medico no depende solo de la UI                               |
| Validar   | `RoleGate` bloquea un rol no autorizado y muestra acceso denegado                | La experiencia visual no expone acciones que el backend no deberia permitir    |

## 6. Mocks, aislamiento y limites

| Dependencia                                  | Estrategia real de aislamiento             | Motivo QA                                                                     |
| -------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| Firebase Admin                               | Mock via `FIREBASE_AUTH_PORT` en producer  | Evitar llamadas reales a Firebase y controlar 401/403 de forma determinista   |
| `ProfileRepository`                          | Mock en guards y servicios                 | Separar validacion de negocio del almacenamiento                              |
| Casos de uso/servicios Nest                  | Mock en controladores                      | Probar autorizacion y contratos HTTP sin depender de infraestructura completa |
| `firebase/auth` en frontend                  | Import dinamico y mocks en pruebas         | Evitar crashes de SSR/jsdom y aislar la resolucion de sesion                  |
| `resolveSession` frontend                    | Mock en `AuthProvider` y hooks             | Validar limpieza de sesion, error state y transiciones UX                     |
| RabbitMQ, MongoDB, logger, clock en consumer | Mocks y adaptadores testeados por separado | Mantener suite rapida y cubrir regresion del pipeline asincrono               |

## 7. Los 7 principios del testing aplicados a SPEC-004

1. Testing muestra presencia de defectos, no su ausencia.
2. El testing exhaustivo es imposible.
3. Testing temprano importa.
4. Los defectos se agrupan.
5. La paradoja del pesticida aplica.
6. El testing depende del contexto.
7. La falacia de ausencia de errores sigue vigente.

En este feature el contexto corregido obliga a priorizar seguridad, autorizacion, ownership medico y riesgo de privacidad en la pantalla publica.

## 8. Quality gates y modelo de evidencia

### Gates si evidenciados localmente en el repo

- Existe pipeline CI versionado.
- Existe build seguro del frontend despues de lazy-loading de Firebase/Auth.
- Existen pruebas especificas para auth/profile/role en producer y frontend.
- La suite consumer sigue siendo una regresion fuerte del pipeline asincrono.

### Gates parcialmente soportados o con brecha

- La spec pide cobertura >= 80%, pero en `ci.yml` visible no hay enforcement explicito por threshold.
- El job `integration-tests` usa `continue-on-error` en integracion y E2E.
- El E2E del repo sigue cubriendo el flujo publico legado, no un journey autenticado de SPEC-004.

### Evidencia externa pendiente

- Link o captura de GitHub Actions en verde.
- Branch protection en `main`.
- Evidencia historica de commits RED -> GREEN -> REFACTOR.

## 9. Decision estrategica local

La estrategia de QA para SPEC-004 es suficiente para sostener una evaluacion local seria. El cierre definitivo del feature como evidencia de release requiere completar tres huecos: validacion remota de Actions, endurecimiento del gate de integracion/cobertura y automatizacion black-box del flujo autenticado.
