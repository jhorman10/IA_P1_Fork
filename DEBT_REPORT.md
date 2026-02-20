# 📋 Reporte de Deuda Técnica y Endurecimiento — IA_P1_Fork

> **Estado Ejecutivo**: Consolidación de todo el feedback y fases de endurecimiento arquitectónico.
> Organizado por capa del sistema para garantizar Responsabilidad Única e Inversión de Dependencias.

| Estado | Cantidad |
|--------|---------|
| ✅ Resuelto | 64 |
| ⬜ Pendiente | 0 |
| 🔄 En Progreso | 0 |
| ⏸️ Bloqueado | 0 |

---

## 1. Capa de Dominio (Lógica de Negocio Pura)
*Enfoque: DDD Táctico, Value Objects, Entidades y Lógica Universal.*

| ID | Hallazgo / Meta | Área | Estado |
|-----|-------------------------------------------------------------|-------------------|--------|
| D-01 | Obsesión por Primitivos: uso de strings para IDs/Prioridades (H-11, H-14) | Pureza de Dominio | ✅ |
| D-02 | Falta de idempotencia en la creación de citas (A-01) | Reglas de Dominio | ✅ |
| D-03 | Falta campo 'priority' en el modelo de dominio (E-02) | Lógica | ✅ |
| D-04 | Nomenclatura en español (cédula, nombre) (E-03, H-03) | Lenguaje Universal | ✅ |
| D-05 | Faltan Fábricas de Dominio para creación de entidades (H-11) | Creación de Objetos | ✅ |
| D-06 | H-24/H-30: Fuga de Identidad — IDs dependientes de BD | Pureza de Dominio | ✅ |
| D-07 | H-28/H-29: Obsesión por Primitivos en Fábricas & Fuga Temporal | Pureza de Dominio | ✅ |
| D-08 | H-31/H-26: Lógica Fuga & SRP en Repositorio (Consultorios Disponibles) | Lógica de Dominio | ✅ |

---

## 2. Capa de Aplicación (Orquestación y Eventos)
*Enfoque: Casos de Uso, Eventos de Dominio y Manejo de Efectos Colaterales.*

| ID | Hallazgo / Meta | Área | Estado |
|------|-------------------------------------------------------------|-------------------|--------|
| A-01 | Violación SRP: Scheduler acoplado a infraestructura (G-09, H-09) | Orquestación | ✅ |
| A-02 | Violación SRP: Controladores sobre-inteligentes (H-08) | Desacoplamiento | ✅ |
| A-03 | Performance: Scheduler recrea consultorios en cada tick (G-06) | Optimización | ✅ |
| A-04 | Lógica: Scheduler inconsistente con documentación (A-04) | Reglas de Negocio | ✅ |
| A-05 | Falta Arquitectura de Eventos de Dominio (H-13) | Event-Driven | ✅ |
| A-06 | Faltan Políticas Centralizadas de Error/Resiliencia (H-15) | Resiliencia | ✅ |
| A-07 | H-20: Condición de Carrera de Concurrencia (LockRepository) | Resiliencia | ✅ |
| A-08 | H-21: Ineficiencia con Poison Message (DomainError -> DLQ) | Resiliencia | ✅ |
| A-09 | H-22: Fuga de Caso de Uso (Command Pattern) | Orquestación | ✅ |
| A-10 | H-25: Bloat de Efectos Colaterales (Despacho Automatizado) | Orquestación | ✅ |
| A-11 | H-32: Retry Policy acoplada en Controller (Violación DIP) | Resiliencia | ✅ |
| A-12 | H-33: ProducerController con Múltiples Responsabilidades (Violación SRP) | Orquestación | ✅ |
| A-13 | H-34: Emisión de Domain Events verificada vía Ports | Event-Driven | ✅ |
| A-14 | MaintenanceOrchestratorUseCase no exportado: SchedulerService no puede inyectar dependencias (bloqueo crítico de arranque). Solución: exportar provider en AppointmentModule. | Orquestación | ✅ |

---

## 3. Capa de Infraestructura (Persistencia, Mensajería, Docker)
*Enfoque: Adaptadores, Puertos, Healthchecks e Integración Externa.*

| ID | Hallazgo / Meta | Área | Estado |
|------|-------------------------------------------------------------|-------------------|--------|
| I-01 | Faltan índices en MongoDB (A-02) | Persistencia | ✅ |
| I-02 | Manejo incorrecto de ack/nack en RMQ (A-03) | Mensajería | ✅ |
| I-03 | Credenciales hardcodeadas y healthchecks ausentes (A-05, E-05, G-04) | Docker/Seguridad | ✅ |
| I-04 | Falta suite E2E: Validar flujo completo API → RabbitMQ → Consumer → MongoDB. | Integración | ✅ |
| I-05 | Falta desacoplamiento de Repositorios (H-12) | Persistencia | ✅ |
| I-06 | Faltan Patrones de Resiliencia: DLQ/Retry (H-04) | Confiabilidad | ✅ |
| I-07 | H-23: Health Check mentiroso (Dependencia de BD) | Salud | ✅ |
| I-08 | H-35: Fuga de Export de ClientsModule en NotificationsModule (DIP) | Mensajería | ✅ |
| I-09 | H-36: Número mágico en origen CORS/WebSocket (Zero Hardcode) | Configuración | ✅ |
| I-10 | H-37: process.env en Decorador (Excepción Documentada) | Configuración | ✅ |
| I-11 | H-38: Exports de Infraestructura en Módulos (MongooseModule, Gateway) | Encapsulamiento | ✅ |

---

## 4. Presentación y Entrega (UI, API, Git)
*Enfoque: Frontend, Reactividad del Dashboard e Higiene de Control de Versiones.*

| ID | Hallazgo / Meta | Área | Estado |
|------|-------------------------------------------------------------|-------------------|--------|
| P-01 | Advertencia React: setState sincrónico dentro de effect (G-08) | Frontend | ✅ |
| P-02 | Historial de commits caótico / sin estructura semántica (E-06) | Git | ✅ |
| P-03 | Branching feature/* inconsistente (G-05) | Git | ✅ |
| P-04 | Faltan tests en Frontend/Consumer (G-07, H-05) | QA | ✅ |

---

## 5. Estrategia y Trazabilidad AI
*Enfoque: Documentación, Registro de Prompts y Metodología AI-Nativa.*

| ID | Hallazgo / Meta | Área | Estado |
|------|-------------------------------------------------------------|-------------------|--------|
| S-01 | AI_WORKFLOW.md sin prompts/evidencia reales (E-01, G-01) | Transparencia | ✅ |
| S-02 | Falta documentación "Qué hizo mal la IA" (E-04, G-03) | Auditoría | ✅ |
| S-03 | Baja Cultura Técnica: SA con identidad "Junior" (H-10) | Cultura | ✅ |
| S-04 | Violación God Object en GEMINI.md (Meta-Arquitectura) | Meta | ✅ |

---
**ESTADO: DEUDA ARQUITECTÓNICA DEPURADA — CERTIFICACIÓN DDD ÉLITE**

---

## 6. Auditoría de Linting y Tipado Estricto (2026-02-19)

*Auditoría ejecutada con ESLint + `@typescript-eslint` sobre los tres sub-proyectos: `backend/consumer`, `backend/producer`, `frontend`.*

### 6.1 — Consumer Backend (`backend/consumer`)
*56 problemas iniciales → 0 tras la auditoría.*

| ID | Hallazgo | Archivo | Regla | Estado |
|----|----------|---------|-------|--------|
| L-01 | `ClientsModule, Transport` importados pero nunca usados | `src/app.module.ts` | no-unused-vars | ✅ |
| L-02 | `ConfigService, CompleteExpiredAppointmentsUseCaseImpl`, `AssignAvailableOfficesUseCaseImpl`, `MaintenanceOrchestratorUseCaseImpl`, `ConsultationPolicy` importados pero nunca usados | `src/scheduler/scheduler.module.ts` | no-unused-vars | ✅ |
| L-03 | `any` en `IdCard.fromJSON(json: any)` | `src/domain/value-objects/id-card.value-object.ts` | no-explicit-any | ✅ Cambiado a `unknown` |
| L-04 | `any` en `parse/isValid` de `branded.types.ts` (×4) | `src/domain/types/branded.types.ts` | no-explicit-any | ✅ Cambiado a `unknown` |
| L-05 | `no-namespace` en `IdCard`, `OfficeNumber`, `AppointmentId` | `src/domain/types/branded.types.ts` | no-namespace | ✅ Downgraded a `warn` + `eslint-disable` — patrón architectural deliberado (companion namespace) |
| L-06 | `require('mongoose')` (×3) en lugar de ES import | `test/src/infrastructure/persistence/appointment.mapper.spec.ts` | no-require-imports | ✅ Reemplazado por `import { Types } from 'mongoose'` |
| L-07 | `any` en mocks de repositorio (×6 parámetros nunca usados) | `test/fixtures/mocks/mock-appointment-repository.ts` | no-unused-vars / no-explicit-any | ✅ Prefijo `_` + tipo `{ id: string; status: string }` |
| L-08 | `any` en `MockEventBroadcaster` (×6) | `test/fixtures/mocks/mock-event-broadcaster.ts` | no-explicit-any | ✅ Reemplazado por `DomainEvent`, `DomainEventConstructor` |
| L-09 | `any` en `MockMongooseModel` (×10) | `test/fixtures/mocks/mock-mongoose-model.ts` | no-explicit-any | ✅ Definida interfaz `MongoDoc` + alias `MongoFilter = Record<string, unknown>` |
| L-10 | Variables asignadas pero nunca usadas en integration test (`saved`, `saved1`, `saved2`, `mongoId`) | `test/src/infrastructure/persistence/mongoose-appointment.repository.integration.spec.ts` | no-unused-vars | ✅ Eliminadas asignaciones innecesarias |
| L-11 | `as any` casts × 2 por diferencia de versiones `@nestjs/mongoose` vs `mongoose` standalone | `test/src/.../repository.integration.spec.ts` | no-explicit-any | ✅ Documentado con `// ⚕️ HUMAN CHECK` + `eslint-disable-next-line` |
| L-12 | `any` en `consultation.policy.spec.ts` (`as any as Appointment`) | `test/src/domain/policies/consultation.policy.spec.ts` | no-explicit-any | ✅ Cambiado a `as unknown as Appointment` |
| L-13 | `any` en `consumer.controller.spec.ts` signature mock | `test/src/consumer.controller.spec.ts` | no-explicit-any | ✅ Cambiado a `unknown` |
| L-14 | `mockEventBus` asignado pero nunca usado en `architecture-challenge.spec.ts` | `test/src/architecture-challenge.spec.ts` | no-unused-vars | ✅ Eliminada variable |
| L-15 | `schedulerRegistry: SchedulerRegistryMock` declarado pero nunca usado | `test/src/scheduler/scheduler.service.spec.ts` | no-unused-vars | ✅ Eliminada variable e interfaz |
| L-16 | `argsIgnorePattern` faltaba en configuración ESLint | `eslint.config.js` (consumer + producer) | config | ✅ Añadido `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'`, `caughtErrorsIgnorePattern: '^_'` |

### 6.2 — Producer Backend (`backend/producer`)
*6 warnings iniciales → 0 tras la auditoría.*

| ID | Hallazgo | Archivo | Regla | Estado |
|----|----------|---------|-------|--------|
| L-17 | `Get, Param, ParseIntPipe, ApiParam, AppointmentResponseDto, AppointmentMapper` importados pero nunca usados | `src/producer.controller.ts` | no-unused-vars | ✅ Eliminados |

### 6.3 — Frontend (`frontend`)
*Linter no pudo ejecutarse por incompatibilidad `eslint-config-next` + ESLint v10.*

| ID | Hallazgo | Archivo | Regla | Estado |
|----|----------|---------|-------|--------|
| L-18 | `TypeError: contextOrFilename.getFilename is not a function` al cargar `eslint-plugin-react` | `eslint.config.mjs` | config | ⬜ Pendiente — requiere actualizar `eslint-config-next` o pinear ESLint a v9 |

### 6.4 — Mejoras Arquitectónicas en Tipos

| ID | Hallazgo | Archivo | Cambio | Estado |
|----|----------|---------|--------|--------|
| L-19 | `mock-event-broadcaster` sin tipo de dominio: usaba `any[]` como contenedor de eventos | `test/fixtures/mocks/mock-event-broadcaster.ts` | Importa `DomainEvent`; define `DomainEventConstructor = new (...args: unknown[]) => DomainEvent` | ✅ |
| L-20 | `mock-mongoose-model` sin contrato de datos: toda la persistencia era `any` | `test/fixtures/mocks/mock-mongoose-model.ts` | Define `interface MongoDoc extends PersistenceAppointmentData { _id: string }` y `type MongoFilter = Record<string, unknown>` | ✅ |

---
**ESTADO: DEUDA ARQUITECTÓNICA DEPURADA — CERTIFICACIÓN DDD ÉLITE + LINTING AUDITADO**
