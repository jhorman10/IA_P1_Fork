# Plan de PRs — Entrega sin Conflictos de Integración

> Generado: 2026-04-06
> Total: **11 PRs · 18 commits (1 por spec) · 6 oleadas**

## Reglas del Plan

- Cada spec = 1 commit con su HU y HT.
- PRs dentro de la misma oleada son **paralelos e independientes** (no tocan los mismos archivos).
- Cada oleada requiere que la oleada anterior esté mergeada.
- Formato de commit: `feat(SPEC-XXX): <descripción corta>`

## Diagrama de Oleadas

```
OLEADA 0:   PR-1 [SPEC-002, 005]
               │
OLEADA 1:   PR-2 [SPEC-003]  ∥  PR-3 [SPEC-004, 006]
               │                    │
OLEADA 2:   PR-4 [009]  ∥  PR-5 [008]  ∥  PR-6 [011]
               │            │     │         │
OLEADA 3:   PR-7 [010]  ∥  PR-8 [012,013]  ∥  PR-9 [014]
                                                  │
OLEADA 4:   PR-10 [015 → 016 → 017 → 018]
               │
OLEADA 5:   PR-11 [007, 003-VAL]
```

---

## OLEADA 0 — Infraestructura

### PR-1: Dependencias y CI

Sin overlap con el resto del sistema. Prepara la base para todo lo demás.

#### Commit 1: SPEC-002 — Actualización Progresiva de Dependencias

> Tarea técnica pura — sin HU asociada. Ningún usuario del sistema interactúa con dependencias de paquetes.

- **HT**: Resolver conflictos de dependencias, eliminar `--legacy-peer-deps` de Dockerfiles, alinear TypeScript target a ES2022.

| Tipo     | Archivos                         |
| -------- | -------------------------------- |
| Backend  | `backend/producer/package.json`  |
| Backend  | `backend/consumer/package.json`  |
| Backend  | `backend/producer/tsconfig.json` |
| Backend  | `backend/consumer/tsconfig.json` |
| Backend  | `backend/producer/Dockerfile`    |
| Backend  | `backend/consumer/Dockerfile`    |
| Frontend | `frontend/package.json`          |
| Frontend | `frontend/Dockerfile`            |
| Config   | `docker-compose.yml`             |

#### Commit 2: SPEC-005 — CI Hardening & TypeScript Rectification

> Tarea técnica pura — sin HU asociada. El pipeline CI es infraestructura de entrega continua, no una interacción de usuario.

- **HT**: Eliminar `continue-on-error` del CI, normalizar `tsc --noEmit` en los 3 paquetes, agregar suite de integración auth-aware (9 escenarios).

| Tipo     | Archivos                                                                 |
| -------- | ------------------------------------------------------------------------ |
| Backend  | `backend/producer/tsconfig.json`                                         |
| Backend  | `backend/producer/tsconfig.spec.json`                                    |
| Backend  | `backend/consumer/tsconfig.json`                                         |
| Backend  | `backend/consumer/tsconfig.spec.json`                                    |
| Backend  | `backend/consumer/test/tsconfig.json`                                    |
| Backend  | `backend/e2e/auth-aware.e2e.spec.ts`                                     |
| Tests    | `backend/producer/test/src/auth/spec-005-auth-aware.integration.spec.ts` |
| Frontend | `frontend/jest.config.ts`                                                |
| Config   | `.github/workflows/ci.yml`                                               |

---

## OLEADA 1 — Fundación del Sistema

> Requiere: Oleada 0 mergeada.
> PR-2 y PR-3 son **paralelos** — no comparten archivos.

### PR-2: Core de Turnos Médicos

#### Commit 1: SPEC-003 — Sistema Inteligente de Gestión de Turnos

- **HU**: Como recepcionista, quiero registrar turnos que se asignen automáticamente al doctor disponible más adecuado, con notificaciones en tiempo real.
- **HT**: Entidad Doctor con disponibilidad (check-in/check-out), motor de asignación por doctor real, endpoint de posición en cola, WebSocket con info de doctor, audit logging.

| Tipo               | Archivos                                                   |
| ------------------ | ---------------------------------------------------------- |
| Backend (producer) | `src/schemas/doctor.schema.ts`                             |
| Backend (producer) | `src/schemas/appointment.schema.ts`                        |
| Backend (producer) | `src/doctors/doctor.controller.ts`                         |
| Backend (producer) | `src/appointments/appointment-query.controller.ts`         |
| Backend (producer) | `src/producer.controller.ts`                               |
| Backend (producer) | `src/types/appointment-event.ts`                           |
| Backend (producer) | `src/dto/*`                                                |
| Backend (producer) | `src/domain/models/appointment-view.ts`                    |
| Backend (producer) | `src/events/appointments.gateway.ts`                       |
| Backend (consumer) | `src/domain/entities/appointment.entity.ts`                |
| Backend (consumer) | `src/schemas/appointment.schema.ts`                        |
| Backend (consumer) | `src/schemas/audit-log.schema.ts`                          |
| Backend (consumer) | `src/application/use-cases/assign-doctor.use-case.impl.ts` |
| Backend (consumer) | `src/types/appointment-event.ts`                           |
| Frontend           | `src/domain/Appointment.ts`                                |
| Frontend           | `src/hooks/useQueuePosition.ts`                            |
| Frontend           | `src/components/AppointmentCard/*`                         |
| Frontend           | `src/components/AssignmentNotification/*`                  |

### PR-3: Autenticación, Roles y Perfiles

#### Commit 1: SPEC-004 — Base de Acceso Operativo

- **HU**: Como usuario, quiero autenticarme con Firebase y ver solo las funciones correspondientes a mi rol (admin, recepcionista, doctor).
- **HT**: Login con Firebase Auth, CRUD de perfiles (admin-only), guards de roles, layout de navegación con RBAC, ecosistema de calidad.

| Tipo               | Archivos                                  |
| ------------------ | ----------------------------------------- |
| Backend (producer) | `src/auth/auth.controller.ts`             |
| Backend (producer) | `src/auth/guards/firebase-auth.guard.ts`  |
| Backend (producer) | `src/auth/guards/role.guard.ts`           |
| Backend (producer) | `src/auth/guards/doctor-context.guard.ts` |
| Backend (producer) | `src/profiles/profiles.controller.ts`     |
| Backend (producer) | `src/profiles/profiles.service.ts`        |
| Backend (producer) | `src/schemas/profile.schema.ts`           |
| Backend (producer) | `src/domain/ports/*`                      |
| Frontend           | `src/app/login/page.tsx`                  |
| Frontend           | `src/hooks/useAuth.ts`                    |
| Frontend           | `src/context/AuthProvider.tsx`            |
| Frontend           | `src/components/RoleGate/*`               |
| Frontend           | `src/app/admin/profiles/page.tsx`         |
| Frontend           | `src/app/registration/page.tsx`           |
| Config             | `.github/workflows/ci.yml`                |
| Docs               | `docs/TESTING_STRATEGY.md`                |
| Docs               | `docs/TEST_PLAN.md`                       |
| Docs               | `docs/BUSINESS_CONTEXT.md`                |

#### Commit 2: SPEC-006 — Mejoras a la Base de Acceso (v2)

- **HU**: Como usuario autenticado, quiero que mi perfil se inicialice automáticamente y no ver pantallazos de carga al ingresar.
- **HT**: Auto-inicialización de perfil (`POST /profiles/self/initialize`), audit persistente de cambios de perfil, rate limiting, `AuthHydrationBoundary`, hook `useClientSideConfig`.

| Tipo               | Archivos                                                                     |
| ------------------ | ---------------------------------------------------------------------------- |
| Backend (producer) | `src/profiles/*` (self-initialize endpoint)                                  |
| Backend (producer) | `src/schemas/profile-audit-log.schema.ts`                                    |
| Backend (producer) | `src/infrastructure/adapters/outbound/mongoose-profile-audit-log.adapter.ts` |
| Frontend           | `src/hooks/useClientSideConfig.ts`                                           |
| Frontend           | `src/components/AuthHydrationBoundary/*`                                     |
| Frontend           | `src/app/admin/layout.tsx`                                                   |
| Frontend           | `src/app/doctor/layout.tsx`                                                  |

---

## OLEADA 2 — Features Independientes

> Requiere: Oleada 1 mergeada.
> PR-4, PR-5 y PR-6 son **100% paralelos** — archivos completamente disjuntos.

### PR-4: Privacidad en Pantalla Pública

#### Commit 1: SPEC-009 — Anonimización de Datos

- **HU**: Como paciente, quiero que mi nombre aparezca anonimizado en la pantalla pública de espera para que mi información personal no sea visible a otras personas en la sala.
- **HT**: Función `anonymizeName`, integración en `AppointmentCard` y `AssignmentNotification`, preservar nombres completos en vistas autenticadas.

| Tipo     | Archivos                                                           |
| -------- | ------------------------------------------------------------------ |
| Frontend | `src/lib/anonymizeName.ts`                                         |
| Frontend | `src/components/AppointmentCard/CalledAppointmentCard.tsx`         |
| Frontend | `src/components/AppointmentCard/WaitingAppointmentCard.tsx`        |
| Frontend | `src/components/AppointmentCard/CompletedAppointmentCard.tsx`      |
| Frontend | `src/components/AppointmentCard/AppointmentCard.tsx`               |
| Frontend | `src/components/AssignmentNotification/AssignmentNotification.tsx` |

### PR-5: Landing del Doctor

#### Commit 1: SPEC-008 — Landing Operativa del Doctor

- **HU**: Como doctor, quiero ver mi estado, hacer check-in/check-out y ver mis pacientes asignados desde mi dashboard dedicado.
- **HT**: Página `/doctor/dashboard`, componente `DoctorStatusCard`, hook `useDoctorDashboard`, servicio `doctorService`, redirección post-login.

| Tipo     | Archivos                                               |
| -------- | ------------------------------------------------------ |
| Frontend | `src/app/doctor/dashboard/page.tsx`                    |
| Frontend | `src/components/DoctorStatusCard/DoctorStatusCard.tsx` |
| Frontend | `src/hooks/useDoctorDashboard.ts`                      |
| Frontend | `src/services/doctorService.ts`                        |

### PR-6: Auditoría Operativa

#### Commit 1: SPEC-011 — Trazabilidad Operativa Estructurada

- **HU**: Como administrador, quiero consultar un log de auditoría paginado de todas las acciones operativas del sistema.
- **HT**: Colección `operational_audit_logs`, interceptor de auditoría, endpoint `GET /audit-logs`, visor en `/admin/audit`.

| Tipo               | Archivos                                                                     |
| ------------------ | ---------------------------------------------------------------------------- |
| Backend (producer) | `src/schemas/operational-audit-log.schema.ts`                                |
| Backend (producer) | `src/domain/ports/outbound/operational-audit.port.ts`                        |
| Backend (producer) | `src/domain/ports/outbound/operational-audit-query.port.ts`                  |
| Backend (producer) | `src/common/interceptors/audit.interceptor.ts`                               |
| Backend (producer) | `src/audit/audit.controller.ts`                                              |
| Backend (producer) | `src/audit/audit.module.ts`                                                  |
| Backend (producer) | `src/infrastructure/adapters/outbound/mongoose-operational-audit.adapter.ts` |
| Frontend           | `src/app/admin/audit/page.tsx`                                               |
| Frontend           | `src/hooks/useAuditLogs.ts`                                                  |
| Frontend           | `src/services/auditService.ts`                                               |

---

## OLEADA 3 — Features Compuestos

> Requiere: Oleada 2 mergeada.
> PR-7, PR-8 y PR-9 son **paralelos entre sí** — archivos disjuntos.

### PR-7: WebSocket Autenticado

> Requiere: PR-4 (SPEC-009) + PR-5 (SPEC-008)

#### Commit 1: SPEC-010 — Canal WebSocket Autenticado

- **HU**: Como recepcionista o doctor, quiero ver actualizaciones de turnos en tiempo real en mi panel operativo sin necesidad de recargar la página.
- **HT**: Namespace `/ws/operational-appointments`, guard WS con Firebase token, preservar canal público, adapter autenticado en frontend.

| Tipo               | Archivos                                                      |
| ------------------ | ------------------------------------------------------------- |
| Backend (producer) | `src/auth/guards/ws-firebase-auth.guard.ts`                   |
| Backend (producer) | `src/events/operational-appointments.gateway.ts`              |
| Backend (producer) | `src/events/appointments.gateway.ts`                          |
| Frontend           | `src/hooks/useOperationalAppointmentsWebSocket.ts`            |
| Frontend           | `src/domain/ports/OperationalRealTimePort.ts`                 |
| Frontend           | `src/infrastructure/adapters/AuthenticatedSocketIoAdapter.ts` |
| Frontend           | `src/context/DependencyContext.tsx`                           |

### PR-8: Ciclo de Vida + Métricas

> Requiere: PR-5 (SPEC-008) + PR-6 (SPEC-011)

#### Commit 1: SPEC-012 — Gestión del Ciclo de Vida de Turnos

- **HU**: Como doctor, quiero marcar un turno como completado; como recepcionista, quiero cancelar turnos en espera.
- **HT**: Endpoints `PATCH /appointments/:id/complete` y `/cancel`, estado `cancelled`, reasignación automática tras completar, eventos RabbitMQ.

| Tipo               | Archivos                                                                       |
| ------------------ | ------------------------------------------------------------------------------ |
| Backend (producer) | `src/appointments/appointment-lifecycle.controller.ts`                         |
| Backend (producer) | `src/domain/ports/outbound/appointment-lifecycle-publisher.port.ts`            |
| Backend (producer) | `src/domain/commands/complete-appointment.command.ts`                          |
| Backend (producer) | `src/domain/commands/cancel-appointment.command.ts`                            |
| Backend (producer) | `src/infrastructure/adapters/outbound/rabbitmq-lifecycle-publisher.adapter.ts` |
| Backend (producer) | `src/types/appointment-event.ts`                                               |
| Backend (producer) | `src/schemas/appointment.schema.ts`                                            |
| Backend (producer) | `src/dto/appointment-response.dto.ts`                                          |
| Backend (producer) | `src/domain/models/appointment-view.ts`                                        |
| Backend (consumer) | `src/consumer.controller.ts`                                                   |
| Backend (consumer) | `src/application/use-cases/complete-appointment.use-case.impl.ts`              |
| Backend (consumer) | `src/application/use-cases/cancel-appointment.use-case.impl.ts`                |
| Backend (consumer) | `src/domain/entities/appointment.entity.ts`                                    |
| Backend (consumer) | `src/types/appointment-event.ts`                                               |
| Backend (consumer) | `src/schemas/appointment.schema.ts`                                            |
| Frontend           | `src/domain/Appointment.ts`                                                    |

#### Commit 2: SPEC-013 — Dashboard de Métricas Operativas

- **HU**: Como administrador, quiero ver KPIs operativos (turnos en espera, doctores disponibles, tiempos promedio) en un dashboard que se actualice automáticamente.
- **HT**: Endpoint de métricas, use-case de agregación, componentes `MetricCard`/`MetricsGrid`, auto-refresh cada 30s.

| Tipo               | Archivos                                                                      |
| ------------------ | ----------------------------------------------------------------------------- |
| Backend (producer) | `src/metrics/metrics.controller.ts`                                           |
| Backend (producer) | `src/metrics/metrics.module.ts`                                               |
| Backend (producer) | `src/application/use-cases/operational-metrics.use-case.impl.ts`              |
| Backend (producer) | `src/domain/ports/inbound/operational-metrics.port.ts`                        |
| Backend (producer) | `src/dto/operational-metrics-response.dto.ts`                                 |
| Backend (producer) | `src/infrastructure/adapters/outbound/mongoose-consumer-audit-log.adapter.ts` |
| Frontend           | `src/app/admin/dashboard/page.tsx`                                            |
| Frontend           | `src/components/MetricCard/MetricCard.tsx`                                    |
| Frontend           | `src/components/MetricsGrid/MetricsGrid.tsx`                                  |
| Frontend           | `src/hooks/useOperationalMetrics.ts`                                          |
| Frontend           | `src/services/metricsService.ts`                                              |
| Frontend           | `src/domain/OperationalMetrics.ts`                                            |

### PR-9: Selector Legible de Doctor

> Requiere: PR-5 (SPEC-008)

#### Commit 1: SPEC-014 — Vinculación Legible de Médicos

- **HU**: Como administrador, quiero seleccionar un doctor desde un selector legible (nombre + especialidad + consultorio) en vez de escribir un ID técnico.
- **HT**: Reemplazar input de texto `doctor_id` por selector en `ProfileFormModal`. Solo frontend — sin cambios de API.

| Tipo     | Archivos                                               |
| -------- | ------------------------------------------------------ |
| Frontend | `src/components/ProfileFormModal/ProfileFormModal.tsx` |

---

## OLEADA 4 — Evolución de Gestión Admin

> Requiere: Oleada 3 mergeada (especialmente PR-9).
> **Secuencial interno**: los 4 specs modifican `admin/profiles/page.tsx` — imposible dividir sin conflicto.

### PR-10: Gestión Operativa Unificada

> 4 commits en orden estricto: SPEC-015 → SPEC-016 → SPEC-017 → SPEC-018

#### Commit 1: SPEC-015 — Creación Unificada de Doctor y Consultorio Dinámico

- **HU**: Como administrador, quiero crear un doctor directamente desde el formulario de perfil y que el doctor elija consultorio libre al hacer check-in.
- **HT**: Creación unificada de doctor+perfil, catálogo de especialidades (CRUD), selector dinámico de consultorio en check-in, office release en check-out.

| Tipo               | Archivos                                                                         |
| ------------------ | -------------------------------------------------------------------------------- |
| Backend (producer) | `src/schemas/doctor.schema.ts` (office nullable, specialtyId)                    |
| Backend (producer) | `src/schemas/specialty.schema.ts`                                                |
| Backend (producer) | `src/specialties/*` (CRUD completo)                                              |
| Backend (producer) | `src/doctors/doctor.controller.ts` (check-in con office body, available-offices) |
| Backend (producer) | `src/profiles/profiles.controller.ts` (creación unificada)                       |
| Frontend           | `src/components/ProfileFormModal/ProfileFormModal.tsx`                           |
| Frontend           | `src/components/DoctorStatusCard/OfficeSelector.tsx`                             |
| Frontend           | `src/components/DoctorStatusCard/DoctorStatusCard.tsx`                           |
| Frontend           | `src/components/SpecialtyManager/SpecialtyManager.tsx`                           |
| Frontend           | `src/hooks/useSpecialties.ts`                                                    |
| Frontend           | `src/hooks/useAvailableOffices.ts`                                               |
| Frontend           | `src/services/specialtyService.ts`                                               |
| Frontend           | `src/services/doctorService.ts`                                                  |
| Frontend           | `src/app/admin/profiles/page.tsx`                                                |
| Frontend           | `src/app/doctor/dashboard/page.tsx`                                              |

#### Commit 2: SPEC-016 — Catálogo Administrable de Consultorios

- **HU**: Como administrador, quiero gestionar un catálogo dinámico de consultorios (habilitar, deshabilitar, expandir) en lugar de un rango fijo 1..5.
- **HT**: Colección `offices`, CRUD de consultorios, validación de check-in contra catálogo, numeración secuencial automática.

| Tipo               | Archivos                                                 |
| ------------------ | -------------------------------------------------------- |
| Backend (producer) | `src/schemas/office.schema.ts`                           |
| Backend (producer) | `src/offices/*` (controller, service, module)            |
| Backend (producer) | `src/doctors/doctor.controller.ts` (validación check-in) |
| Frontend           | `src/components/OfficeManager/OfficeManager.tsx`         |
| Frontend           | `src/hooks/useOfficeCatalog.ts`                          |
| Frontend           | `src/services/officeService.ts`                          |
| Frontend           | `src/app/admin/profiles/page.tsx`                        |

#### Commit 3: SPEC-017 — Navegación Exclusiva de Modos

- **HU**: Como administrador, quiero ver solo un panel a la vez (perfiles, especialidades, consultorios) en la página de gestión operativa.
- **HT**: Rediseño de `/admin/profiles` de multi-panel a selector exclusivo de modos. Solo frontend.

| Tipo     | Archivos                          |
| -------- | --------------------------------- |
| Frontend | `src/app/admin/profiles/page.tsx` |

#### Commit 4: SPEC-018 — Ajustes de Navegación y Gestión Operativa

- **HU**: Como usuario autenticado, quiero que el navbar no muestre "Turnos" (es público) y que el enlace de admin diga "Gestión Operativa".
- **HT**: Eliminar ítem "Turnos" del navbar, renombrar "Perfiles" a "Gestión Operativa", renombrar aria-label a "Selector de gestión", preservar regla de deshabilitar consultorios.

| Tipo     | Archivos                                         |
| -------- | ------------------------------------------------ |
| Frontend | `src/components/Navbar/Navbar.tsx`               |
| Frontend | `src/app/admin/profiles/page.tsx`                |
| Frontend | `src/components/OfficeManager/OfficeManager.tsx` |
| Docs     | `docs/MANUAL_DE_OPERACION.md`                    |

---

## OLEADA 5 — Validación Documental

> Requiere: Todas las oleadas anteriores mergeadas.
> Sin código — solo documentos de validación.

### PR-11: Documentos de Validación

#### Commit 1: SPEC-007 — Validación Técnica Consolidada

> Tarea técnica pura — sin HU asociada. Es documentación interna de reconciliación técnica, no una interacción de usuario.

- **HT**: Documento de validación con matriz consolidada, contratos y design docs de referencia.

| Tipo | Archivos                                                        |
| ---- | --------------------------------------------------------------- |
| Docs | `.github/specs/smart-appointment-management-validation.spec.md` |

#### Commit 2: SPEC-003-VAL — Validación Final del Baseline

> Tarea técnica pura — sin HU asociada. Es un cierre formal de documentación técnica del baseline, no una interacción de usuario.

- **HT**: Documento final confirmando implementación completa, listando observaciones no-bloqueantes (WS hook adoption, payload privacy, aggregation scaling).

| Tipo | Archivos                                                              |
| ---- | --------------------------------------------------------------------- |
| Docs | `.github/specs/smart-appointment-management-final-validation.spec.md` |

---

## Resumen de Independencia por Oleada

| Oleada | PRs              | Paralelos              | Prerequisito |
| ------ | ---------------- | ---------------------- | ------------ |
| 0      | PR-1             | —                      | Ninguno      |
| 1      | PR-2, PR-3       | Sí (2 paralelos)       | Oleada 0     |
| 2      | PR-4, PR-5, PR-6 | Sí (3 paralelos)       | Oleada 1     |
| 3      | PR-7, PR-8, PR-9 | Sí (3 paralelos)       | Oleada 2     |
| 4      | PR-10            | — (secuencial interno) | Oleada 3     |
| 5      | PR-11            | —                      | Oleada 4     |

## Nomenclatura de Branches Sugerida

```
feature/oleada-0/infra-deps-ci
feature/oleada-1/appointment-core
feature/oleada-1/auth-roles-profiles
feature/oleada-2/public-privacy
feature/oleada-2/doctor-landing
feature/oleada-2/audit-trail
feature/oleada-3/auth-websocket
feature/oleada-3/lifecycle-metrics
feature/oleada-3/doctor-selector
feature/oleada-4/gestion-operativa-unificada
feature/oleada-5/validation-docs
```
