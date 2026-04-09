# Reporte Completo de Arquitectura, Patrones de Diseño y Principios SOLID

> **Proyecto:** Sistema Inteligente de Gestión de Turnos Médicos  
> **Fecha:** 8 de abril de 2026  
> **Stack:** NestJS · Next.js · MongoDB · RabbitMQ · Firebase Auth · WebSocket · Docker

---

## Índice

1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Arquitectura de Servicios](#2-arquitectura-de-servicios)
3. [Arquitecturas Aplicadas](#3-arquitecturas-aplicadas)
4. [Patrones de Diseño (18)](#4-patrones-de-diseño-18)
5. [DDD Tactical Patterns (6)](#5-ddd-tactical-patterns-6)
6. [Principios SOLID — 5/5 aplicados](#6-principios-solid--55-aplicados)
7. [Patrones de Frontend](#7-patrones-de-frontend)
8. [Infraestructura y DevOps](#8-infraestructura-y-devops)
9. [Seguridad y Autenticación](#9-seguridad-y-autenticación)
10. [URLs y Endpoints Disponibles](#10-urls-y-endpoints-disponibles)
11. [SOLID — Mapeo Detallado por Archivo](#11-solid--mapeo-detallado-por-archivo)
12. [Resumen Cuantitativo](#12-resumen-cuantitativo)

---

## 1. Visión General del Sistema

El sistema gestiona citas médicas en tiempo real para una clínica. El personal operativo (admin, recepcionista) registra los turnos de los pacientes desde módulos autenticados, mientras que los pacientes solo consultan el estado de su turno en la pantalla pública de espera.

### Flujo Principal

```
[Recepcionista / Admin]
        │
        ▼
  POST /appointments (Frontend → Producer API)
        │
        ▼
  Producer valida y publica en RabbitMQ (202 Accepted)
        │
        ▼
  Consumer consume mensaje y persiste en MongoDB (Estado: Esperando)
        │
        ▼
  Consumer emite Domain Event → AutoAssign asigna doctor atómicamente
        │
        ▼
  Scheduler asigna consultorio c/ duración aleatoria (8–15s)
        │
        ▼
  Consumer notifica vía RabbitMQ → Producer reenvía vía WebSocket al Frontend
```

### Roles del Sistema

| Rol                      | Permisos                                                        | Autenticación                |
| ------------------------ | --------------------------------------------------------------- | ---------------------------- |
| **Administrador**        | CRUD Perfiles, registrar turnos, crear médicos, supervisar todo | Firebase Auth + Bearer token |
| **Recepcionista**        | Registrar turnos operativos                                     | Firebase Auth + Bearer token |
| **Doctor**               | Check-in/check-out solo sobre su propio `doctor_id`             | Firebase Auth + Bearer token |
| **Paciente / Visitante** | Consultar pantalla pública de espera y dashboard (solo lectura) | Sin autenticación            |

---

## 2. Arquitectura de Servicios

### 2.1 Servicios Docker (5 contenedores)

```
┌─────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  frontend     │  │  producer     │  │  consumer         │  │
│  │  (Next.js)    │  │  (NestJS)     │  │  (NestJS Worker)  │  │
│  │  :3001        │  │  :3000        │  │  (no port)        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                  │                    │            │
│         │    ┌─────────────┴────────────────────┘           │
│         │    │                                              │
│  ┌──────┴────┴──┐  ┌──────────────┐                        │
│  │  rabbitmq     │  │  mongodb      │                       │
│  │  :5672/:15672 │  │  :27017       │                       │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

| Servicio     | Tecnología                   | Responsabilidad                                                                                                |
| ------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Producer** | NestJS                       | API REST, validación, publicación a RabbitMQ, WebSocket broadcast, auth Firebase, Swagger docs                 |
| **Consumer** | NestJS Worker                | Consume mensajes RabbitMQ, ejecuta lógica de dominio, persiste en MongoDB, asignación de doctores/consultorios |
| **Frontend** | Next.js + React              | UI pública + operativa, WebSocket real-time, auth Firebase client-side                                         |
| **RabbitMQ** | rabbitmq:3-management-alpine | Message broker con DLQ y management UI                                                                         |
| **MongoDB**  | mongo:7                      | Persistencia de citas, doctores, consultorios, perfiles, auditoría                                             |

### 2.2 Estructura de Archivos — Consumer (Hexagonal completa)

```
backend/consumer/src/
├── domain/                              # Capa de Dominio (0 dependencias de framework)
│   ├── entities/
│   │   ├── appointment.entity.ts        # Entity principal — estado, eventos, transiciones
│   │   └── doctor.entity.ts             # Entity doctor — checkIn, checkOut, markBusy
│   ├── value-objects/
│   │   ├── id-card.value-object.ts      # VO inmutable con branded type
│   │   ├── full-name.value-object.ts    # VO con validación de longitud
│   │   └── priority.value-object.ts     # VO con peso numérico para ordenamiento
│   ├── events/
│   │   ├── domain-event.base.ts         # Clase abstracta base de Domain Events
│   │   ├── appointment-registered.event.ts
│   │   └── appointment-assigned.event.ts
│   ├── commands/
│   │   └── register-appointment.command.ts  # Objeto Command inmutable
│   ├── factories/
│   │   └── appointment.factory.ts       # Factory con estado inicial válido
│   ├── policies/
│   │   └── consultation.policy.ts       # Reglas de negocio encapsuladas
│   ├── specifications/
│   │   └── appointment-query.specification.ts  # Constantes de negocio
│   ├── errors/
│   │   ├── domain.error.ts              # Error base abstracto
│   │   ├── validation.error.ts          # Error fatal de validación
│   │   ├── duplicate-active-appointment.error.ts
│   │   └── infrastructure.error.ts
│   ├── types/
│   │   └── branded.types.ts             # Tipos nominales (IdCard, OfficeNumber, etc.)
│   └── ports/
│       ├── inbound/                     # Casos de uso como contratos
│       │   ├── register-appointment.use-case.ts
│       │   ├── cancel-appointment.use-case.ts
│       │   ├── complete-appointment.use-case.ts
│       │   ├── complete-expired-appointments.use-case.ts
│       │   ├── assign-available-offices.use-case.ts
│       │   └── maintenance-orchestrator.use-case.ts
│       └── outbound/                    # Puertos de infraestructura
│           ├── appointment.repository.ts    # Read + Write segregados
│           ├── doctor.repository.ts         # Read + Write + markBusyAtomic
│           ├── office.repository.ts         # Read-only
│           ├── lock.repository.ts           # Locks distribuidos
│           ├── domain-event-bus.port.ts     # Bus de eventos interno
│           ├── domain-event-handler.port.ts # Contrato de handler
│           ├── notification.port.ts         # Notificaciones vía RabbitMQ
│           ├── audit.port.ts               # Auditoría write-only
│           ├── logger.port.ts              # Logging abstracto
│           ├── clock.port.ts               # Reloj inyectable (testable)
│           └── retry-policy.port.ts        # Política de reintentos
│
├── application/                         # Capa de Aplicación (orquesta dominio)
│   ├── use-cases/
│   │   ├── register-appointment.use-case.impl.ts
│   │   ├── assign-doctor.use-case.impl.ts
│   │   ├── assign-available-offices.use-case.impl.ts
│   │   ├── cancel-appointment.use-case.impl.ts
│   │   ├── complete-appointment.use-case.impl.ts
│   │   ├── complete-expired-appointments.use-case.impl.ts
│   │   └── maintenance-orchestrator.use-case.impl.ts
│   └── event-handlers/
│       ├── appointment-events.handler.ts    # Registered + Assigned handlers
│       └── auto-assign.handler.ts           # AutoAssign con markBusyAtomic
│
├── infrastructure/                      # Capa de Infraestructura (adaptadores)
│   ├── persistence/
│   │   ├── mongoose-appointment.repository.ts
│   │   ├── mongoose-doctor.repository.ts
│   │   ├── mongoose-office.repository.ts
│   │   ├── mongoose-lock.repository.ts
│   │   ├── mongoose-audit.adapter.ts
│   │   ├── mongoose-query.builder.ts        # Builder para queries Mongoose
│   │   ├── appointment.mapper.ts            # Data Mapper domain ↔ persistence
│   │   ├── doctor.mapper.ts
│   │   ├── event-dispatching-appointment-repository.decorator.ts  # Decorator
│   │   └── persistence-appointment.interface.ts
│   ├── messaging/
│   │   ├── local-domain-event-bus.adapter.ts    # Bus local de Domain Events
│   │   ├── rabbitmq-notification.adapter.ts     # Notificaciones → RabbitMQ
│   │   ├── retry-policy.adapter.ts              # Retry/DLQ para mensajes
│   │   └── rmq-headers.interface.ts
│   ├── logging/
│   │   └── nest-logger.adapter.ts               # LoggerPort → NestJS Logger
│   ├── adapters/
│   │   └── system-clock.adapter.ts              # ClockPort → Date.now()
│   └── utils/
│
├── scheduler/
│   ├── scheduler.module.ts
│   └── scheduler.service.ts             # CRON — trigger puro, delega a use cases
│
├── appointments/                        # Módulo NestJS (wiring)
│   ├── appointment.module.ts            # Composition Root del Consumer
│   ├── repositories/
│   │   └── repositories.module.ts       # Wiring de repos + event bus + handlers
│   └── use-cases/
│       └── use-cases.module.ts          # Wiring de use cases con puertos
│
├── consumer.controller.ts               # Consume mensajes RabbitMQ
├── health.controller.ts                 # Healthcheck
├── app.module.ts                        # Root module NestJS
└── main.ts                              # Bootstrap
```

### 2.3 Estructura de Archivos — Producer

```
backend/producer/src/
├── domain/
│   ├── commands/
│   │   ├── cancel-appointment.command.ts
│   │   └── complete-appointment.command.ts
│   ├── models/
│   │   ├── appointment-view.ts          # Read model (CQRS read-side)
│   │   ├── doctor-view.ts
│   │   └── profile-view.ts
│   ├── ports/
│   │   ├── inbound/                     # CreateAppointmentUseCase, QueryAppointmentsUseCase, etc.
│   │   └── outbound/                    # AppointmentPublisherPort, EventBroadcasterPort, FirebaseAuthPort, etc.
│   └── value-objects/
│       ├── id-card.vo.ts
│       └── patient-name.vo.ts
├── auth/
│   ├── auth.controller.ts
│   ├── decorators/
│   │   ├── roles.decorator.ts           # Metadata decorator para roles
│   │   └── current-user.decorator.ts    # Param decorator para usuario actual
│   ├── guards/
│   │   ├── firebase-auth.guard.ts       # Valida Bearer token + Profile activo
│   │   ├── firebase-token-only.guard.ts # Solo token, sin Profile
│   │   ├── role.guard.ts               # Valida roles permitidos
│   │   ├── doctor-context.guard.ts     # Doctor solo opera su contexto
│   │   └── ws-firebase-auth.guard.ts   # Guard WebSocket autenticado
│   └── types/
├── events/
│   ├── events.module.ts
│   ├── events.controller.ts             # Consume notificaciones de RabbitMQ → WS
│   ├── appointments.gateway.ts          # WebSocket público (/ws/appointments)
│   ├── operational-appointments.gateway.ts  # WebSocket autenticado (/ws/operational-appointments)
│   └── compound-broadcaster.ts          # Composite — delega a ambos gateways
├── infrastructure/
│   ├── adapters/outbound/               # MongooseAppointmentReadRepository, FirebaseAuthAdapter, etc.
│   └── filters/
│       └── domain-exception.filter.ts   # Mapea DomainError → HTTP 400
├── common/
│   ├── decorators/
│   │   └── auditable.decorator.ts
│   ├── guards/
│   │   └── ws-auth.guard.ts             # Guard WS con token estático
│   └── interceptors/
│       └── audit.interceptor.ts         # AOP — registra auditoría cross-cutting
├── appointments/                        # Controladores REST de citas
├── doctors/                             # CRUD de doctores
├── offices/                             # CRUD de consultorios
├── profiles/                            # CRUD de perfiles operativos
├── specialties/                         # Catálogo de especialidades
├── metrics/                             # Métricas operacionales
├── audit/                               # Logs de auditoría
├── mappers/
│   └── appointment.mapper.ts            # Event → ResponseDto
├── schemas/                             # Mongoose schemas
└── producer.controller.ts               # Controller principal
```

### 2.4 Estructura de Archivos — Frontend

```
frontend/src/
├── domain/
│   ├── Appointment.ts                   # Modelo de dominio
│   ├── Doctor.ts, Profile.ts, Office.ts, AuditLog.ts, etc.
│   └── ports/
│       ├── AppointmentRepository.ts     # Puerto con token: string
│       ├── RealTimePort.ts              # WS público
│       └── OperationalRealTimePort.ts   # WS autenticado
├── infrastructure/
│   └── adapters/
│       ├── HttpAppointmentAdapter.ts    # Implementa AppointmentRepository con fetch + Bearer
│       ├── SocketIoAdapter.ts           # Implementa RealTimePort
│       └── AuthenticatedSocketIoAdapter.ts  # Implementa OperationalRealTimePort
├── context/
│   ├── AuthProvider.tsx                 # Estado auth Firebase centralizado
│   ├── ThemeProvider.tsx                # Dark/Light mode con localStorage
│   └── DependencyContext.tsx            # Composition Root — IoC via React Context
├── hooks/                               # 14 custom hooks
│   ├── useAuth.ts                       # Facade sobre AuthContext
│   ├── useAppointmentRegistration.ts    # Registro con token
│   ├── useAppointmentsWebSocket.ts      # WS público con reconexión
│   ├── useOperationalAppointmentsWebSocket.ts  # WS autenticado
│   ├── useRoleGuard.ts                  # Guard de roles con redirect
│   ├── useDoctorDashboard.ts, useProfiles.ts, useAuditLogs.ts, etc.
├── components/                          # 23 componentes
│   ├── Navbar/                          # Oculto en ruta pública
│   ├── AppointmentForm/                 # Formulario de registro público
│   ├── AppointmentRegistrationForm/     # Formulario operativo protegido
│   ├── AppointmentCard/                 # Tarjeta de cita
│   ├── LoginForm/                       # Login Firebase
│   ├── RoleGate/                        # Guard visual por rol
│   ├── ProfileFormModal/                # CRUD perfiles
│   ├── DoctorStatusCard/, DoctorInfo/   # UI de doctores
│   ├── MetricCard/, MetricsGrid/        # Dashboard métricas
│   └── WebSocketStatus.tsx              # Indicador de conexión WS
├── repositories/
│   └── HttpAppointmentRepository.ts     # Usa httpClient con Circuit Breaker
├── services/                            # Servicios HTTP para módulos CRUD
├── lib/
│   └── httpClient.ts                    # Circuit Breaker + Retry + Exponential Backoff
├── security/
│   └── sanitize.ts                      # Input sanitization anti-XSS
├── config/
│   └── firebase.ts                      # Config Firebase client-side
└── app/
    ├── page.tsx                          # Pantalla pública (force light mode)
    ├── layout.tsx                        # Root layout con anti-FOUC
    ├── login/page.tsx
    ├── dashboard/page.tsx
    ├── registration/page.tsx
    ├── doctor/page.tsx
    ├── profiles/page.tsx
    ├── offices/page.tsx
    ├── specialties/page.tsx
    └── audit/page.tsx
```

---

## 3. Arquitecturas Aplicadas

### 3.1 Arquitectura Hexagonal (Ports & Adapters)

> **ADR:** `docs/architecture/ADR-001.md` — Status: ACCEPTED

La arquitectura principal del proyecto. Separa el código en tres capas concéntricas donde el dominio es el núcleo independiente de frameworks.

```
                    ┌──────────────────────────────────┐
                    │         INFRASTRUCTURE            │
                    │  Mongoose, RabbitMQ, NestJS,      │
                    │  Firebase, Socket.io              │
                    │    ┌──────────────────────────┐   │
                    │    │       APPLICATION         │   │
                    │    │  Use Cases, Event Handlers│   │
                    │    │    ┌──────────────────┐   │   │
                    │    │    │     DOMAIN        │   │   │
                    │    │    │  Entities, VOs,   │   │   │
                    │    │    │  Events, Policies │   │   │
                    │    │    │  Errors, Ports    │   │   │
                    │    │    └──────────────────┘   │   │
                    │    └──────────────────────────┘   │
                    └──────────────────────────────────┘
```

**Regla de dependencia:** Las capas internas NUNCA importan de capas externas. El dominio tiene 0 imports de `@nestjs/*`.

| Capa               | Responsabilidad                                                                 | Archivos clave                                                                                            |
| ------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Domain**         | Lógica de negocio pura, entidades, value objects, eventos, puertos (interfaces) | `backend/consumer/src/domain/` — entities, value-objects, events, policies, specifications, errors, ports |
| **Application**    | Orquestación de casos de uso, event handlers                                    | `backend/consumer/src/application/` — use-cases, event-handlers                                           |
| **Infrastructure** | Adaptadores concretos (MongoDB, RabbitMQ, Logger, Clock)                        | `backend/consumer/src/infrastructure/` — persistence, messaging, logging, adapters                        |

**Puertos Inbound (Consumer — 6 interfaces):**

| Puerto                               | Archivo                                                          |
| ------------------------------------ | ---------------------------------------------------------------- |
| `RegisterAppointmentUseCase`         | `domain/ports/inbound/register-appointment.use-case.ts`          |
| `CancelAppointmentUseCase`           | `domain/ports/inbound/cancel-appointment.use-case.ts`            |
| `CompleteAppointmentUseCase`         | `domain/ports/inbound/complete-appointment.use-case.ts`          |
| `CompleteExpiredAppointmentsUseCase` | `domain/ports/inbound/complete-expired-appointments.use-case.ts` |
| `AssignAvailableOfficesUseCase`      | `domain/ports/inbound/assign-available-offices.use-case.ts`      |
| `MaintenanceOrchestratorUseCase`     | `domain/ports/inbound/maintenance-orchestrator.use-case.ts`      |

**Puertos Outbound (Consumer — 11 interfaces):**

| Puerto                       | Tipo                     | Archivo                                           |
| ---------------------------- | ------------------------ | ------------------------------------------------- |
| `AppointmentReadRepository`  | Read                     | `domain/ports/outbound/appointment.repository.ts` |
| `AppointmentWriteRepository` | Write                    | `domain/ports/outbound/appointment.repository.ts` |
| `DoctorReadRepository`       | Read                     | `domain/ports/outbound/doctor.repository.ts`      |
| `DoctorWriteRepository`      | Write + `markBusyAtomic` | `domain/ports/outbound/doctor.repository.ts`      |
| `OfficeReadRepository`       | Read                     | `domain/ports/outbound/office.repository.ts`      |
| `LockRepository`             | Distributed Lock         | `domain/ports/outbound/lock.repository.ts`        |
| `DomainEventBus`             | Event Dispatch           | `domain/ports/outbound/domain-event-bus.port.ts`  |
| `NotificationPort`           | Messaging                | `domain/ports/outbound/notification.port.ts`      |
| `AuditPort`                  | Write-only               | `domain/ports/outbound/audit.port.ts`             |
| `LoggerPort`                 | Logging                  | `domain/ports/outbound/logger.port.ts`            |
| `ClockPort`                  | Time (testable)          | `domain/ports/outbound/clock.port.ts`             |
| `RetryPolicyPort`            | Retry/DLQ                | `domain/ports/outbound/retry-policy.port.ts`      |

**Aplicación en los 3 servicios:**

- **Consumer**: Hexagonal completa con todas las capas.
- **Producer**: Hexagonal con ports inbound/outbound y adapters en `infrastructure/adapters/outbound/`.
- **Frontend**: Hexagonal simplificada con ports en `domain/ports/`, adapters en `infrastructure/adapters/`, y Composition Root en `context/DependencyContext.tsx`.

---

### 3.2 Event-Driven Architecture

> **ADRs:** `docs/architecture/ADR-002.md` y `docs/architecture/ADR-005.md` — Status: ACCEPTED

Comunicación asíncrona fire-and-forget entre servicios vía RabbitMQ.

```
Producer ──publish──► RabbitMQ Queue ──consume──► Consumer
                          │                          │
                          │                    Domain Events
                          │                   (bus interno)
                          │                          │
Consumer ──notify──► RabbitMQ Notifications ──consume──► Producer ──WS──► Frontend
```

**Colas RabbitMQ:**

| Cola                    | Flujo               | Mensajes                                                           |
| ----------------------- | ------------------- | ------------------------------------------------------------------ |
| `appointments_queue`    | Producer → Consumer | `create_appointment`, `complete_appointment`, `cancel_appointment` |
| `notifications_queue`   | Consumer → Producer | `appointment_updated` (para broadcast WS)                          |
| DLQ (Dead Letter Queue) | Mensajes fallidos   | Errores de dominio van directo, errores transitorios se reintentan |

**Componentes clave:**

| Archivo                                                                  | Rol                                                             |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `producer/src/events/events.controller.ts`                               | Consume de `notifications_queue` y reenvía por WebSocket        |
| `consumer/src/consumer.controller.ts`                                    | Consume de `appointments_queue`, delega a use cases             |
| `consumer/src/infrastructure/messaging/rabbitmq-notification.adapter.ts` | Implementa `NotificationPort` — publica a `notifications_queue` |
| `consumer/src/infrastructure/messaging/retry-policy.adapter.ts`          | Decide retry vs DLQ según tipo de error                         |

---

### 3.3 CQRS (Command Query Responsibility Segregation)

Separación explícita de lectura y escritura entre servicios:

```
┌─────────────────────┐         ┌─────────────────────┐
│      PRODUCER        │         │      CONSUMER        │
│  (Read-side +        │ ──Q──►  │  (Write-side)        │
│   Command Gateway)   │         │                      │
│                      │         │  RegisterAppointment  │
│  QueryAppointments   │ ◄──N── │  CancelAppointment    │
│  (lectura directa    │         │  CompleteAppointment  │
│   de MongoDB)        │         │  AssignDoctor         │
│                      │         │  AssignOffice         │
└─────────────────────┘         └─────────────────────┘
```

**Evidencia en código:**

- `appointment-lifecycle.controller.ts` (Producer): comentario explícito "Follows the CQRS pattern: producer validates preconditions (read-only) and publishes; consumer performs the actual state transition."
- Repositorios segregados: `AppointmentReadRepository` + `AppointmentWriteRepository` en `domain/ports/outbound/appointment.repository.ts`
- `DoctorReadRepository` + `DoctorWriteRepository` en `domain/ports/outbound/doctor.repository.ts`
- View Models en Producer: `appointment-view.ts`, `doctor-view.ts`, `profile-view.ts` — read models puros

---

## 4. Patrones de Diseño (18)

### 4.1 Repository Pattern

Abstrae el acceso a datos detrás de interfaces de dominio. Los use cases nunca conocen MongoDB.

| Interfaz                                                   | Implementación                  | Ubicación                                                                |
| ---------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `AppointmentReadRepository` + `AppointmentWriteRepository` | `MongooseAppointmentRepository` | `consumer/infrastructure/persistence/mongoose-appointment.repository.ts` |
| `DoctorReadRepository` + `DoctorWriteRepository`           | `MongooseDoctorRepository`      | `consumer/infrastructure/persistence/mongoose-doctor.repository.ts`      |
| `OfficeReadRepository`                                     | `MongooseOfficeRepository`      | `consumer/infrastructure/persistence/mongoose-office.repository.ts`      |
| `LockRepository`                                           | `MongooseLockRepository`        | `consumer/infrastructure/persistence/mongoose-lock.repository.ts`        |
| `AppointmentRepository` (Frontend)                         | `HttpAppointmentAdapter`        | `frontend/infrastructure/adapters/HttpAppointmentAdapter.ts`             |
| `AppointmentRepository` (Frontend)                         | `HttpAppointmentRepository`     | `frontend/repositories/HttpAppointmentRepository.ts`                     |

---

### 4.2 Adapter Pattern

Cada puerto outbound tiene un adapter concreto que traduce entre dominio e infraestructura.

| Adapter                         | Puerto                       | Tecnología            |
| ------------------------------- | ---------------------------- | --------------------- |
| `MongooseAppointmentRepository` | `AppointmentRepository`      | Mongoose/MongoDB      |
| `MongooseDoctorRepository`      | `DoctorRepository`           | Mongoose/MongoDB      |
| `MongooseLockRepository`        | `LockRepository`             | MongoDB atomic upsert |
| `MongooseAuditAdapter`          | `AuditPort`                  | Mongoose/MongoDB      |
| `NestLoggerAdapter`             | `LoggerPort`                 | NestJS Logger         |
| `RabbitMQNotificationAdapter`   | `NotificationPort`           | RabbitMQ (amqplib)    |
| `LocalDomainEventBusAdapter`    | `DomainEventBus`             | In-memory dispatch    |
| `RetryPolicyAdapter`            | `RetryPolicyPort`            | RabbitMQ headers      |
| `SystemClockAdapter`            | `ClockPort`                  | `Date.now()`          |
| `FirebaseAuthAdapter`           | `FirebaseAuthPort`           | Firebase Admin SDK    |
| `HttpAppointmentAdapter`        | `AppointmentRepository` (FE) | Fetch API + Bearer    |
| `SocketIoAdapter`               | `RealTimePort`               | Socket.io client      |
| `AuthenticatedSocketIoAdapter`  | `OperationalRealTimePort`    | Socket.io + auth      |

---

### 4.3 Decorator Pattern

Envuelve un repositorio existente para añadir comportamiento (Domain Event dispatch) sin modificar el original.

**Archivo:** `consumer/infrastructure/persistence/event-dispatching-appointment-repository.decorator.ts`

```
Use Case → EventDispatchingAppointmentRepositoryDecorator → MongooseAppointmentRepository
                      │
                      └── Después de save(): llama domainEventBus.publishAll(entity.pullEvents())
```

El Use Case no sabe que los eventos se publican — el Decorator lo hace transparentemente. Comentado como `"H-25 Fix: Efectos secundarios movidos al Decorador"`.

**Otros decorators (NestJS metadata):**

| Decorator         | Archivo                                              | Uso                                      |
| ----------------- | ---------------------------------------------------- | ---------------------------------------- |
| `@Roles(...)`     | `producer/auth/decorators/roles.decorator.ts`        | Anota endpoints con roles permitidos     |
| `@CurrentUser()`  | `producer/auth/decorators/current-user.decorator.ts` | Extrae usuario autenticado del request   |
| `@Auditable(...)` | `producer/common/decorators/auditable.decorator.ts`  | Marca acciones para auditoría automática |

---

### 4.4 Factory Pattern

Encapsula la creación de entidades con estado inicial válido y reglas de negocio.

**Archivo:** `consumer/domain/factories/appointment.factory.ts`

```typescript
AppointmentFactory.createNew(command); // Estado: 'waiting', prioridad default: 'medium'
AppointmentFactory.createWithPriority(command, priority);
```

**Uso en NestJS:** `useFactory` en modules para construir event handlers y el bus de eventos sin `@Injectable()`, manteniendo el dominio libre de framework.

---

### 4.5 Observer Pattern / Domain Events

Sistema de eventos internos donde las entidades acumulan eventos y el bus los despacha a handlers registrados.

**Flujo completo:**

```
1. Entity.recordEvent(new AppointmentRegisteredEvent(...))
2. Repository.save(entity)
3. EventDispatchingDecorator intercepta el save()
4. Decorator llama: domainEventBus.publishAll(entity.pullEvents())
5. LocalDomainEventBusAdapter despacha a handlers registrados por tipo
6. AppointmentRegisteredHandler → log
7. AutoAssignOnRegisterHandler → asigna doctor atómicamente
```

| Componente                     | Archivo                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| Clase base de eventos          | `domain/events/domain-event.base.ts`                                       |
| `AppointmentRegisteredEvent`   | `domain/events/appointment-registered.event.ts`                            |
| `AppointmentAssignedEvent`     | `domain/events/appointment-assigned.event.ts`                              |
| Bus de eventos (puerto)        | `domain/ports/outbound/domain-event-bus.port.ts`                           |
| Contrato de handler            | `domain/ports/outbound/domain-event-handler.port.ts`                       |
| `AppointmentRegisteredHandler` | `application/event-handlers/appointment-events.handler.ts`                 |
| `AppointmentAssignedHandler`   | `application/event-handlers/appointment-events.handler.ts`                 |
| `AutoAssignOnRegisterHandler`  | `application/event-handlers/auto-assign.handler.ts`                        |
| Bus local (adapter)            | `infrastructure/messaging/local-domain-event-bus.adapter.ts`               |
| Entidad (acumula eventos)      | `domain/entities/appointment.entity.ts` — `recordEvent()` / `pullEvents()` |

---

### 4.6 Policy Pattern

> **ADR:** `docs/architecture/ADR-003.md` — Status: ACCEPTED

Encapsula reglas de negocio complejas en objetos independientes. Extensible sin modificar use cases (OCP).

**Archivo:** `consumer/domain/policies/consultation.policy.ts`

Encapsula:

- Cálculo de oficinas disponibles
- Elegibilidad de asignación de doctor
- Duración aleatoria de consulta (con RNG inyectable para tests deterministas)

---

### 4.7 Specification Pattern

Define constantes y criterios de negocio que la capa de infraestructura usa para construir queries.

**Archivo:** `consumer/domain/specifications/appointment-query.specification.ts`

- `ACTIVE_STATUSES` — qué estados se consideran "activos"
- `QUEUE_SORT_ORDER` — orden de la cola de espera

El repositorio Mongoose usa estas especificaciones a través del `MongooseQueryBuilder` para traducir reglas de dominio a sintaxis MongoDB.

---

### 4.8 Command Pattern

Objetos inmutables que encapsulan la intención del usuario, desacoplando DTOs de API de los Use Cases.

| Command                      | Archivo                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `RegisterAppointmentCommand` | `consumer/domain/commands/register-appointment.command.ts`     |
| `CancelAppointmentCommand`   | `producer/domain/commands/cancel-appointment.command.ts`       |
| `CompleteAppointmentCommand` | `producer/domain/commands/complete-appointment.command.ts`     |
| `CreateAppointmentCommand`   | `producer/domain/ports/inbound/create-appointment.use-case.ts` |

---

### 4.9 Data Mapper Pattern

Traduce entre el modelo de dominio (entities) y el modelo de persistencia (documentos Mongoose).

| Mapper                         | Conversiones                     | Archivo                                                     |
| ------------------------------ | -------------------------------- | ----------------------------------------------------------- |
| `AppointmentMapper`            | `toDomain()` / `toPersistence()` | `consumer/infrastructure/persistence/appointment.mapper.ts` |
| `DoctorMapper`                 | `toDomain()` / `toPersistence()` | `consumer/infrastructure/persistence/doctor.mapper.ts`      |
| `AppointmentMapper` (Producer) | `toResponseDto()`                | `producer/mappers/appointment.mapper.ts`                    |

---

### 4.10 Builder Pattern

Traduce especificaciones de dominio a sintaxis Mongoose, separando el QUÉ (dominio) del CÓMO (infraestructura).

**Archivo:** `consumer/infrastructure/persistence/mongoose-query.builder.ts`

```typescript
MongooseQueryBuilder.fromSpecification(spec) // WHAT to query (domain)
  .toMongooseFilter(); // HOW to query (infrastructure: $in, $lte, etc.)
```

---

### 4.11 Composite Pattern

Una sola interfaz que delega a múltiples implementaciones. Usado para broadcast WebSocket dual.

**Archivo:** `producer/events/compound-broadcaster.ts`

```
EventBroadcasterPort
        │
  CompoundBroadcaster
        ├── AppointmentsGateway          (/ws/appointments — público)
        └── OperationalAppointmentsGateway  (/ws/operational-appointments — autenticado)
```

Un solo `EventBroadcasterPort` emite a ambos canales WebSocket simultáneamente.

---

### 4.12 Guard Pattern

Validación de precondiciones de seguridad antes de ejecutar la lógica del controlador.

**Backend Guards:**

| Guard                    | Responsabilidad                               | Archivo                                             |
| ------------------------ | --------------------------------------------- | --------------------------------------------------- |
| `FirebaseAuthGuard`      | Valida Bearer token + resuelve Profile activo | `producer/auth/guards/firebase-auth.guard.ts`       |
| `FirebaseTokenOnlyGuard` | Solo valida token, sin Profile                | `producer/auth/guards/firebase-token-only.guard.ts` |
| `RoleGuard`              | Valida que el usuario tenga un rol permitido  | `producer/auth/guards/role.guard.ts`                |
| `DoctorContextGuard`     | Doctor solo opera su propio consultorio       | `producer/auth/guards/doctor-context.guard.ts`      |
| `WsFirebaseAuthGuard`    | Guard WebSocket con Firebase                  | `producer/auth/guards/ws-firebase-auth.guard.ts`    |
| `WsAuthGuard`            | Guard WebSocket con token estático            | `producer/common/guards/ws-auth.guard.ts`           |

**Frontend Guards:**

| Guard          | Responsabilidad                    | Archivo                                     |
| -------------- | ---------------------------------- | ------------------------------------------- |
| `useRoleGuard` | Hook que redirige si no tiene rol  | `frontend/hooks/useRoleGuard.ts`            |
| `RoleGate`     | Componente que oculta UI según rol | `frontend/components/RoleGate/RoleGate.tsx` |

---

### 4.13 Circuit Breaker Pattern

Protege al frontend de cascadas de fallos con un autómata de estados.

**Archivo:** `frontend/lib/httpClient.ts`

```
CLOSED ──(failures >= threshold)──► OPEN ──(cooldown expira)──► HALF_OPEN
  ▲                                                                │
  └──────────(request exitoso)──────────────────────────────────────┘

HALF_OPEN ──(falla)──► OPEN
```

Características:

- **Failure threshold** configurable
- **Cooldown period** antes de reintentar
- **AbortController** con timeout por request
- **Exponential backoff**: `300ms * 2^attempt`
- Estado compartido entre todas las llamadas HTTP del frontend

---

### 4.14 Retry Pattern + Exponential Backoff

**Frontend:** Integrado en `httpClient.ts` — retry automático con `300 * 2^attempt` ms de delay.

**Backend Consumer:** `RetryPolicyAdapter` en `infrastructure/messaging/retry-policy.adapter.ts`:

- Errores de dominio (validación, duplicado) → DLQ directa, no retriable
- Errores transitorios (red, timeout) → reencolar con conteo vía header `x-death`
- Max retries alcanzado → DLQ

---

### 4.15 Exception Filter Pattern

Mapea errores de dominio a respuestas HTTP apropiadas sin acoplar el dominio a HTTP.

**Archivo:** `producer/infrastructure/filters/domain-exception.filter.ts`

```
DomainError (Value Object inválido) → HTTP 400 Bad Request
HttpException (NestJS nativo)        → Pasathrough normal
Error genérico                       → HTTP 500 Internal Server Error
```

---

### 4.16 Interceptor Pattern (AOP — Aspect-Oriented Programming)

Cross-cutting concern de auditoría que se ejecuta después de cada handler exitoso.

**Archivo:** `producer/common/interceptors/audit.interceptor.ts`

- Intercepta requests marcados con `@Auditable()`
- Pre-fetch del estado previo para calcular diffs
- Registro fire-and-forget (no bloquea response)
- Deduplicación de entries

---

### 4.17 Distributed Lock Pattern

Previene race conditions en escala horizontal usando locks atómicos con MongoDB.

**Puerto:** `consumer/domain/ports/outbound/lock.repository.ts` — `acquire()` / `release()`

**Implementación:** `consumer/infrastructure/persistence/mongoose-lock.repository.ts` — usa `findOneAndUpdate` + upsert atómico con TTL.

**Uso:** `MaintenanceOrchestratorUseCaseImpl` adquiere lock antes de ejecutar mantenimiento, evitando que múltiples instancias de consumer lo ejecuten simultáneamente.

---

### 4.18 Optimistic Locking / Atomic CAS (Compare-And-Swap)

Previene doble asignación de doctor mediante una transición atómica en MongoDB.

**Puerto:** `DoctorWriteRepository.markBusyAtomic(id: string): Promise<boolean>`

**Implementación:** `consumer/infrastructure/persistence/mongoose-doctor.repository.ts`

```typescript
// Transición atómica: available → busy en UNA sola operación DB
findOneAndUpdate(
  { _id: id, status: "available" }, // Solo si TODAVÍA está available
  { $set: { status: "busy" } },
);
// Retorna true si se logró, false si otro proceso llegó primero
```

Usado por `AutoAssignOnRegisterHandler` y `AssignDoctorUseCaseImpl` para evitar que dos citas reserven el mismo doctor.

---

## 5. DDD Tactical Patterns (6)

### 5.1 Entities (Rich Domain Models)

Objetos con identidad, comportamiento rico y transiciones de estado validadas.

| Entity        | Comportamiento                                                                                | Archivo                                          |
| ------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `Appointment` | `assignOffice()`, `assignDoctor()`, `complete()`, `cancel()`, `recordEvent()`, `pullEvents()` | `consumer/domain/entities/appointment.entity.ts` |
| `Doctor`      | `checkIn()`, `checkOut()`, `markBusy()`, `markAvailable()` + validaciones de invariantes      | `consumer/domain/entities/doctor.entity.ts`      |

La entidad `Appointment` genera identidad con `randomUUID()` y acumula Domain Events internamente.

---

### 5.2 Value Objects

Objetos inmutables, sin identidad, validados en constructor. Si los datos son inválidos, lanzan excepción — un VO siempre representa un valor válido.

| Value Object             | Validación                                | Métodos                 | Archivo                                                   |
| ------------------------ | ----------------------------------------- | ----------------------- | --------------------------------------------------------- |
| `IdCard`                 | Formato de cédula válido                  | `equals()`, `toValue()` | `consumer/domain/value-objects/id-card.value-object.ts`   |
| `FullName`               | Longitud mínima/máxima                    | `equals()`, `toValue()` | `consumer/domain/value-objects/full-name.value-object.ts` |
| `Priority`               | Conjunto cerrado: `low`, `medium`, `high` | `getNumericWeight()`    | `consumer/domain/value-objects/priority.value-object.ts`  |
| `IdCard` (Producer)      | Validación independiente                  | `equals()`, `toValue()` | `producer/domain/value-objects/id-card.vo.ts`             |
| `PatientName` (Producer) | Validación de caracteres                  | `equals()`, `toValue()` | `producer/domain/value-objects/patient-name.vo.ts`        |

---

### 5.3 Branded Types (Nominal Typing)

**Archivo:** `consumer/domain/types/branded.types.ts`

Tipos que usan TypeScript branded types para evitar mezcla accidental de primitivos:

```typescript
type IdCard = string & { __brand: "IdCard" };
type OfficeNumber = number & { __brand: "OfficeNumber" };
type AppointmentId = string & { __brand: "AppointmentId" };
```

Esto previene pasar un `string` donde se espera un `IdCard` — el compilador lo rechaza.

---

### 5.4 Domain Events

Objetos que representan hechos de negocio significativos que ya ocurrieron.

| Evento                       | Cuándo se emite               | Handlers                                                                            |
| ---------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `AppointmentRegisteredEvent` | Al registrar una cita         | `AppointmentRegisteredHandler` (log), `AutoAssignOnRegisterHandler` (asigna doctor) |
| `AppointmentAssignedEvent`   | Al asignar doctor/consultorio | `AppointmentAssignedHandler` (log)                                                  |

**Clase base:** `DomainEventBase` — abstracta, con `occurredOn: Date` y `eventName: string`.

---

### 5.5 Domain Error Hierarchy

Errores tipados que distinguen entre errores de negocio (fatales) y errores de infraestructura (retriable).

```
DomainError (abstracta)
├── ValidationError           → HTTP 400, DLQ directa
├── DuplicateActiveAppointmentError → HTTP 409, DLQ directa
└── InfrastructureError       → HTTP 500, retriable
```

| Error                             | Retriable      | Destino     | Archivo                                               |
| --------------------------------- | -------------- | ----------- | ----------------------------------------------------- |
| `DomainError`                     | Base abstracta | —           | `domain/errors/domain.error.ts`                       |
| `ValidationError`                 | No             | DLQ         | `domain/errors/validation.error.ts`                   |
| `DuplicateActiveAppointmentError` | No             | DLQ         | `domain/errors/duplicate-active-appointment.error.ts` |
| `InfrastructureError`             | Sí             | Retry → DLQ | `domain/errors/infrastructure.error.ts`               |

---

### 5.6 View Models / Read Models

Modelos de sólo lectura en el lado Producer (CQRS read-side).

| Model                    | Archivo                                      |
| ------------------------ | -------------------------------------------- |
| `AppointmentView`        | `producer/domain/models/appointment-view.ts` |
| `DoctorView`             | `producer/domain/models/doctor-view.ts`      |
| `ProfileView`            | `producer/domain/models/profile-view.ts`     |
| `Appointment` (Frontend) | `frontend/domain/Appointment.ts`             |
| `Profile` (Frontend)     | `frontend/domain/Profile.ts`                 |

---

## 6. Principios SOLID — 5/5 aplicados

### 6.1 SRP — Single Responsibility Principle

> "Una clase debe tener una sola razón para cambiar."

| Evidencia                                    | Archivos                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Cada Use Case = 1 archivo, 1 responsabilidad | `application/use-cases/` — 7 archivos separados                                                   |
| Event handlers: 1 handler por tipo de evento | `application/event-handlers/appointment-events.handler.ts`                                        |
| Mapper separado del Repository               | `infrastructure/persistence/appointment.mapper.ts`                                                |
| QueryBuilder separado del Repository         | `infrastructure/persistence/mongoose-query.builder.ts`                                            |
| Policy separada del Use Case                 | `domain/policies/consultation.policy.ts` — `"corrección A-08: lógica de dominio extraída"`        |
| Decorator publica eventos (SRP del Use Case) | `infrastructure/persistence/event-dispatching-appointment-repository.decorator.ts` — `"H-25 Fix"` |
| Scheduler solo decide CUÁNDO ejecutar        | `scheduler/scheduler.service.ts` — `"PURE TRIGGER: Scheduler only decides WHEN to run"`           |

---

### 6.2 OCP — Open/Closed Principle

> "Abierto para extensión, cerrado para modificación."

| Evidencia                                                               | Archivos                                                                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Event bus con registro de handlers — nuevos eventos no modifican el bus | `infrastructure/messaging/local-domain-event-bus.adapter.ts` — `"OCP: Usa un registro de handlers"` |
| Un handler por tipo — nuevos handlers sin cambiar existentes            | `application/event-handlers/`                                                                       |
| Módulo de citas compuesto por sub-módulos extensibles                   | `appointments/appointment.module.ts` — `"OCP: open for extension, closed for modification"`         |
| `@Roles()` — añadir roles sin modificar el guard                        | `auth/guards/role.guard.ts`                                                                         |

---

### 6.3 LSP — Liskov Substitution Principle

> "Los subtipos deben ser sustituibles por sus tipos base."

| Evidencia                                         | Archivos                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Value Objects siempre válidos o lanzan excepción  | `domain/value-objects/id-card.value-object.ts` — `"LSP: IdCard es SIEMPRE válido"`                 |
| Todos los adapters cumplen el contrato del puerto | Cada adapter implementa fielmente la interfaz                                                      |
| Decorator sustituye Repository transparentemente  | `event-dispatching-appointment-repository.decorator.ts` — misma interfaz, comportamiento extendido |

---

### 6.4 ISP — Interface Segregation Principle

> "Los clientes no deben depender de interfaces que no usan."

| Evidencia                                                           | Archivos                                          |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| Repositories divididos en Read + Write                              | `domain/ports/outbound/appointment.repository.ts` |
| `DoctorReadRepository` + `DoctorWriteRepository`                    | `domain/ports/outbound/doctor.repository.ts`      |
| `AuditPort` es write-only                                           | `domain/ports/outbound/audit.port.ts`             |
| `OfficeReadRepository` es read-only                                 | `domain/ports/outbound/office.repository.ts`      |
| `RealTimePort` (público) vs `OperationalRealTimePort` (autenticado) | `frontend/domain/ports/` — 2 interfaces separadas |

---

### 6.5 DIP — Dependency Inversion Principle

> "Depender de abstracciones, no de concreciones."

| Evidencia                                                    | Archivos                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Use Cases reciben puertos (interfaces) en constructor        | Todos los use cases en `application/use-cases/`                                         |
| Controller depende de `EventBroadcasterPort`, no del gateway | `producer/events/events.controller.ts` — `@Inject("EventBroadcasterPort")`              |
| Guards dependen de `FirebaseAuthPort`, no de Firebase SDK    | `producer/auth/guards/firebase-auth.guard.ts` — `@Inject(FIREBASE_AUTH_PORT)`           |
| Dominio 100% libre de NestJS                                 | `consumer/domain/` — cero imports de `@nestjs/*`                                        |
| Frontend inyecta via React Context                           | `frontend/context/DependencyContext.tsx` — Composition Root                             |
| Hooks consumen de DependencyContext                          | `frontend/hooks/useAppointmentsWebSocket.ts` — `const { realTime } = useDependencies()` |

---

## 7. Patrones de Frontend

### 7.1 Composition Root (IoC Container)

**Archivo:** `frontend/context/DependencyContext.tsx`

Punto único de ensamblaje donde se instancian singletons de repositorios y adapters, inyectados al árbol de componentes via React Context.

```typescript
const deps = {
  appointmentRepository: new HttpAppointmentAdapter(...),
  realTime: new SocketIoAdapter(...),
  operationalRealTime: new AuthenticatedSocketIoAdapter(...)
}
```

---

### 7.2 Provider Pattern (React Context)

| Provider             | Estado                                                               | Archivo                         |
| -------------------- | -------------------------------------------------------------------- | ------------------------------- |
| `AuthProvider`       | Auth Firebase centralizado, `onAuthStateChanged`, session resolution | `context/AuthProvider.tsx`      |
| `ThemeProvider`      | Dark/Light mode, localStorage persistence, system preference         | `context/ThemeProvider.tsx`     |
| `DependencyProvider` | Inyección de dependencias                                            | `context/DependencyContext.tsx` |

---

### 7.3 Custom Hook Pattern

14 hooks con responsabilidad única cada uno:

| Hook                                  | Responsabilidad                       |
| ------------------------------------- | ------------------------------------- |
| `useAuth`                             | Facade sobre AuthContext + navegación |
| `useAppointmentRegistration`          | Registro de citas con token           |
| `useAppointmentsWebSocket`            | Conexión WS pública con reconexión    |
| `useOperationalAppointmentsWebSocket` | Conexión WS autenticada               |
| `useRoleGuard`                        | Guard de roles con redirect           |
| `useDoctorDashboard`                  | Estado del dashboard de doctor        |
| `useProfiles`                         | CRUD de perfiles                      |
| `useAuditLogs`                        | Listado de logs de auditoría          |
| `useAvailableOffices`                 | Consultorios disponibles              |
| `useDoctorOptions`                    | Selector de doctores                  |
| `useOfficeCatalog`                    | Catálogo de consultorios              |
| `useOperationalMetrics`               | Métricas en tiempo real               |
| `useQueuePosition`                    | Posición en cola de espera            |
| `useSpecialties`                      | Catálogo de especialidades            |

---

### 7.4 Input Sanitization

**Archivo:** `frontend/security/sanitize.ts`

Limpieza básica anti-XSS: remueve caracteres `<>` y etiquetas `script` del input del usuario.

---

## 8. Infraestructura y DevOps

### 8.1 Docker Multi-Stage

Cada servicio usa Dockerfiles multi-stage con target `development` para hot-reload y target de producción optimizado.

### 8.2 Docker Compose — 5 servicios

| Servicio   | Imagen/Build                   | Puerto      | Healthcheck                              |
| ---------- | ------------------------------ | ----------- | ---------------------------------------- |
| `producer` | `./backend/producer`           | 3000        | HTTP GET `/health`                       |
| `consumer` | `./backend/consumer`           | — (interno) | HTTP GET `/health`                       |
| `frontend` | `./frontend`                   | 3001        | —                                        |
| `rabbitmq` | `rabbitmq:3-management-alpine` | 5672, 15672 | `rabbitmq-diagnostics check_running`     |
| `mongodb`  | `mongo:7`                      | 27017       | `mongosh --eval db.adminCommand('ping')` |

### 8.3 CI Local

**Script:** `scripts/ci-local.sh`

Ejecuta linting y tests de los 3 proyectos (Producer, Consumer, Frontend) en secuencia. La última ejecución pasó con:

- Producer: 381 tests
- Consumer: 427 tests
- Frontend: 559 tests

### 8.4 Variables de Entorno

| Variable                       | Servicio          | Descripción                         |
| ------------------------------ | ----------------- | ----------------------------------- |
| `PRODUCER_PORT`                | Producer          | Puerto de la API (default: 3000)    |
| `FRONTEND_PORT`                | Frontend          | Puerto del frontend (default: 3001) |
| `RABBITMQ_URL`                 | Producer/Consumer | URL de conexión a RabbitMQ          |
| `RABBITMQ_QUEUE`               | Producer/Consumer | Cola principal de appointments      |
| `RABBITMQ_NOTIFICATIONS_QUEUE` | Producer/Consumer | Cola de notificaciones              |
| `SCHEDULER_INTERVAL_MS`        | Consumer          | Intervalo del scheduler             |
| `CONSULTORIOS_TOTAL`           | Consumer          | Total de consultorios disponibles   |
| `MONGODB_URI`                  | Producer/Consumer | URI de conexión a MongoDB           |
| `FIREBASE_PROJECT_ID`          | Producer          | ID del proyecto Firebase            |
| `FIREBASE_CLIENT_EMAIL`        | Producer          | Email de la cuenta de servicio      |
| `FIREBASE_PRIVATE_KEY`         | Producer          | Llave privada Firebase              |
| `NEXT_PUBLIC_API_BASE_URL`     | Frontend          | URL base de la API                  |
| `NEXT_PUBLIC_WS_URL`           | Frontend          | URL del WebSocket                   |
| `NEXT_PUBLIC_FIREBASE_*`       | Frontend          | Config Firebase client-side         |

---

## 9. Seguridad y Autenticación

### 9.1 Cadena de Autenticación

```
Frontend (Firebase Auth)
    │
    ▼
Bearer token en header Authorization
    │
    ▼
FirebaseAuthGuard (Producer)
    ├── Verifica token con Firebase Admin SDK
    ├── Resuelve Profile activo del usuario
    └── Inyecta user en request
    │
    ▼
RoleGuard (Producer)
    └── Verifica que el rol del Profile esté en @Roles()
    │
    ▼
DoctorContextGuard (si aplica)
    └── Doctor solo opera su propio doctor_id
```

### 9.2 WebSocket Security

| Namespace                      | Autenticación         | Guard                 |
| ------------------------------ | --------------------- | --------------------- |
| `/ws/appointments` (público)   | Token estático        | `WsAuthGuard`         |
| `/ws/operational-appointments` | Firebase Bearer token | `WsFirebaseAuthGuard` |

### 9.3 Protecciones Adicionales

- **Helmet**: Headers de seguridad HTTP
- **Rate Limiting**: Protección contra abuso
- **CORS**: Configurado para `FRONTEND_URL`
- **Input Sanitization**: Anti-XSS en frontend
- **Exception Filter**: DomainErrors → HTTP 400 sin stack traces

---

## 10. URLs y Endpoints Disponibles

### 10.1 Backend Producer — API REST (puerto 3000)

Sin prefijo global. Todas las rutas son relativas a la raíz.

#### Health & Documentación

| Método | Ruta        | Descripción                                      | Auth    | Roles   |
| ------ | ----------- | ------------------------------------------------ | ------- | ------- |
| `GET`  | `/health`   | Health check — retorna `{ status: "ok" }`        | Ninguna | Público |
| `GET`  | `/api/docs` | Swagger UI — documentación interactiva de la API | Ninguna | Público |

#### Auth (`/auth`)

| Método | Ruta            | Descripción                                                            | Auth                | Roles                 |
| ------ | --------------- | ---------------------------------------------------------------------- | ------------------- | --------------------- |
| `POST` | `/auth/session` | Valida `idToken` Firebase, resuelve Profile activo + `allowed_modules` | `FirebaseAuthGuard` | Cualquier autenticado |

#### Appointments (`/appointments`)

| Método  | Ruta                                   | Descripción                                      | Auth                              | Roles                    |
| ------- | -------------------------------------- | ------------------------------------------------ | --------------------------------- | ------------------------ |
| `POST`  | `/appointments`                        | Registrar cita (encola en RabbitMQ, retorna 202) | `FirebaseAuthGuard` + `RoleGuard` | `admin`, `recepcionista` |
| `GET`   | `/appointments`                        | Listar todas las citas                           | Ninguna                           | Público                  |
| `GET`   | `/appointments/queue-position/:idCard` | Posición en cola del paciente (1-based)          | Ninguna                           | Público                  |
| `GET`   | `/appointments/:idCard`                | Citas por cédula del paciente                    | Ninguna                           | Público                  |
| `PATCH` | `/appointments/:id/complete`           | Completar una cita en estado `called`            | `FirebaseAuthGuard` + `RoleGuard` | `admin`, `doctor`        |
| `PATCH` | `/appointments/:id/cancel`             | Cancelar una cita en estado `waiting`            | `FirebaseAuthGuard` + `RoleGuard` | `admin`, `recepcionista` |

#### Profiles (`/profiles`)

| Método  | Ruta                        | Descripción                                                         | Auth                              | Roles                          |
| ------- | --------------------------- | ------------------------------------------------------------------- | --------------------------------- | ------------------------------ |
| `GET`   | `/profiles/me`              | Perfil del usuario actual                                           | `FirebaseAuthGuard`               | Cualquier autenticado          |
| `POST`  | `/profiles`                 | Crear perfil operativo (+ usuario Firebase + Doctor si role=doctor) | `FirebaseAuthGuard` + `RoleGuard` | `admin`                        |
| `GET`   | `/profiles`                 | Listar perfiles (paginado, filtrable) — throttle: 20/min            | `FirebaseAuthGuard` + `RoleGuard` | `admin`                        |
| `PATCH` | `/profiles/:uid`            | Actualizar perfil (rol, estado, doctor link) — throttle: 20/min     | `FirebaseAuthGuard` + `RoleGuard` | `admin`                        |
| `POST`  | `/profiles/self/initialize` | Auto-registro de perfil (SPEC-006)                                  | `FirebaseTokenOnlyGuard`          | Cualquier autenticado Firebase |

#### Doctors (`/doctors`)

| Método  | Ruta                         | Descripción                                               | Auth                                                     | Roles             |
| ------- | ---------------------------- | --------------------------------------------------------- | -------------------------------------------------------- | ----------------- |
| `POST`  | `/doctors`                   | Registrar nuevo doctor                                    | Ninguna                                                  | Público           |
| `GET`   | `/doctors`                   | Listar doctores (filtro opcional `?status=`)              | Ninguna                                                  | Público           |
| `GET`   | `/doctors/available-offices` | Consultorios habilitados y desocupados                    | `FirebaseAuthGuard` + `RoleGuard`                        | `admin`, `doctor` |
| `GET`   | `/doctors/:id`               | Obtener doctor por ID                                     | `FirebaseAuthGuard` + `RoleGuard` + `DoctorContextGuard` | `admin`, `doctor` |
| `PATCH` | `/doctors/:id/check-in`      | Check-in del doctor (elige consultorio, pasa a available) | `FirebaseAuthGuard` + `RoleGuard` + `DoctorContextGuard` | `admin`, `doctor` |
| `PATCH` | `/doctors/:id/check-out`     | Check-out del doctor (pasa a offline, libera consultorio) | `FirebaseAuthGuard` + `RoleGuard` + `DoctorContextGuard` | `admin`, `doctor` |

#### Offices (`/offices`)

| Método  | Ruta                | Descripción                                         | Auth                              | Roles   |
| ------- | ------------------- | --------------------------------------------------- | --------------------------------- | ------- |
| `GET`   | `/offices`          | Listar consultorios (catálogo)                      | `FirebaseAuthGuard` + `RoleGuard` | `admin` |
| `PATCH` | `/offices/capacity` | Ajustar capacidad (crear consultorios secuenciales) | `FirebaseAuthGuard` + `RoleGuard` | `admin` |
| `PATCH` | `/offices/:number`  | Habilitar/deshabilitar un consultorio               | `FirebaseAuthGuard` + `RoleGuard` | `admin` |

#### Specialties (`/specialties`)

| Método   | Ruta               | Descripción                       | Auth                              | Roles                 |
| -------- | ------------------ | --------------------------------- | --------------------------------- | --------------------- |
| `GET`    | `/specialties`     | Listar especialidades             | `FirebaseAuthGuard`               | Cualquier autenticado |
| `POST`   | `/specialties`     | Crear especialidad                | `FirebaseAuthGuard` + `RoleGuard` | `admin`               |
| `PATCH`  | `/specialties/:id` | Actualizar nombre de especialidad | `FirebaseAuthGuard` + `RoleGuard` | `admin`               |
| `DELETE` | `/specialties/:id` | Eliminar especialidad             | `FirebaseAuthGuard` + `RoleGuard` | `admin`               |

#### Metrics (`/metrics`)

| Método | Ruta       | Descripción                                           | Auth                              | Roles   |
| ------ | ---------- | ----------------------------------------------------- | --------------------------------- | ------- |
| `GET`  | `/metrics` | KPIs operacionales (citas hoy, promedio espera, etc.) | `FirebaseAuthGuard` + `RoleGuard` | `admin` |

#### Audit (`/audit-logs`)

| Método | Ruta          | Descripción                                                      | Auth                              | Roles   |
| ------ | ------------- | ---------------------------------------------------------------- | --------------------------------- | ------- |
| `GET`  | `/audit-logs` | Logs de auditoría paginados (filtrable por acción, actor, fecha) | `FirebaseAuthGuard` + `RoleGuard` | `admin` |

**Total: 26 endpoints HTTP en Producer**

---

### 10.2 Backend Consumer — Health

| Método | Ruta      | Descripción                                         | Auth    |
| ------ | --------- | --------------------------------------------------- | ------- |
| `GET`  | `/health` | Health check con estado de DB (mongoose readyState) | Ninguna |

---

### 10.3 WebSocket Namespaces (Producer)

#### `/ws/appointments` — Gateway Público

| Aspecto   | Valor                                     |
| --------- | ----------------------------------------- |
| **URL**   | `ws://localhost:3000/ws/appointments`     |
| **Guard** | `WsAuthGuard` (token estático compartido) |
| **CORS**  | `process.env.FRONTEND_URL`                |
| **Uso**   | Pantalla pública de sala de espera        |

**Eventos emitidos (server → client):**

| Evento                  | Cuándo                   | Payload                                                |
| ----------------------- | ------------------------ | ------------------------------------------------------ |
| `APPOINTMENTS_SNAPSHOT` | Al conectar cada cliente | Array completo de citas activas (`waiting` + `called`) |
| `APPOINTMENT_UPDATED`   | Cambio en cualquier cita | Cita actualizada individual                            |

> Sin `@SubscribeMessage` — es server-push only.

#### `/ws/operational-appointments` — Gateway Autenticado

| Aspecto   | Valor                                                                 |
| --------- | --------------------------------------------------------------------- |
| **URL**   | `ws://localhost:3000/ws/operational-appointments`                     |
| **Guard** | `WsFirebaseAuthGuard` (Firebase `idToken` + Profile activo requerido) |
| **CORS**  | `process.env.FRONTEND_URL`                                            |
| **Uso**   | Vistas operativas (dashboard admin, recepción, doctor)                |

**Eventos emitidos (server → client):**

| Evento                  | Cuándo                               | Payload                     |
| ----------------------- | ------------------------------------ | --------------------------- |
| `APPOINTMENTS_SNAPSHOT` | Al conectar cada cliente autenticado | Array completo de citas     |
| `APPOINTMENT_UPDATED`   | Cambio en cualquier cita             | Cita actualizada individual |

> Sin `@SubscribeMessage` — es server-push only.

---

### 10.4 Colas RabbitMQ

| Cola (env var)                 | Valor default                                       | Flujo               | Mensajes                                                                                |
| ------------------------------ | --------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `RABBITMQ_QUEUE`               | `turnos_queue`                                      | Producer → Consumer | `create_appointment`, `complete_appointment`, `cancel_appointment`, `doctor_checked_in` |
| `RABBITMQ_NOTIFICATIONS_QUEUE` | `turnos_notifications`                              | Consumer → Producer | `appointment_created`, `appointment_updated`                                            |
| DLQ (Dead Letter Queue)        | Exchange: `appointment_dlx`, Key: `appointment_dlq` | Mensajes fallidos   | Errores de dominio van directo; errores transitorios se reintentan                      |

**Patrones `@EventPattern` en Consumer (escucha `turnos_queue`):**

| Patrón                 | Descripción                                             |
| ---------------------- | ------------------------------------------------------- |
| `create_appointment`   | Registra nueva cita (con retry/DLQ policy)              |
| `complete_appointment` | Completa una cita en estado `called`                    |
| `cancel_appointment`   | Cancela una cita en estado `waiting`                    |
| `doctor_checked_in`    | Trigger de asignación reactiva para pacientes en espera |

**Patrones `@EventPattern` en Producer (escucha `turnos_notifications`):**

| Patrón                | Descripción                               |
| --------------------- | ----------------------------------------- |
| `appointment_created` | Recibe notificación → broadcast WebSocket |
| `appointment_updated` | Recibe notificación → broadcast WebSocket |

**Flujo completo de mensajería:**

```
Frontend → POST /appointments → Producer (valida, publica a turnos_queue)
              ↓
         turnos_queue → Consumer (procesa, persiste, domain events)
              ↓
         turnos_notifications → Producer (recibe) → WebSocket → Frontend
```

---

### 10.5 Frontend — Rutas Next.js (App Router, puerto 3001)

#### Rutas Públicas (sin autenticación)

| Ruta            | Descripción                                                       | Navegación                  |
| --------------- | ----------------------------------------------------------------- | --------------------------- |
| `/`             | Pantalla pública de sala de espera — muestra citas en tiempo real | URL directa                 |
| `/login`        | Formulario de inicio de sesión con Firebase Auth                  | Click en "Iniciar Sesión"   |
| `/waiting-room` | Sala de espera alternativa                                        | Link desde pantalla pública |

#### Rutas Protegidas — Admin

| Ruta               | Descripción                                                       | Roles permitidos         |
| ------------------ | ----------------------------------------------------------------- | ------------------------ |
| `/registration`    | Registro operativo de citas (formulario con búsqueda de paciente) | `admin`, `recepcionista` |
| `/dashboard`       | Dashboard principal con métricas operacionales                    | `admin`                  |
| `/admin/dashboard` | Dashboard administrativo avanzado                                 | `admin`                  |
| `/admin/profiles`  | Gestión CRUD de perfiles operativos                               | `admin`                  |
| `/admin/audit`     | Visor de logs de auditoría                                        | `admin`                  |

#### Rutas Protegidas — Doctor

| Ruta                | Descripción                                                | Roles permitidos |
| ------------------- | ---------------------------------------------------------- | ---------------- |
| `/doctor/dashboard` | Dashboard del doctor (check-in/check-out, paciente actual) | `doctor`         |

**Total: 9 rutas frontend**

---

### 10.6 Resumen de URLs

| Categoría                 | Cantidad                                                 |
| ------------------------- | -------------------------------------------------------- |
| Endpoints HTTP (Producer) | 26                                                       |
| Endpoints HTTP (Consumer) | 1 (health)                                               |
| WebSocket namespaces      | 2                                                        |
| Eventos WebSocket         | 2 tipos (`APPOINTMENTS_SNAPSHOT`, `APPOINTMENT_UPDATED`) |
| Colas RabbitMQ            | 2 (+1 DLQ)                                               |
| Patrones Consumer         | 4                                                        |
| Patrones Producer         | 2                                                        |
| Rutas Frontend            | 9                                                        |
| Swagger UI                | 1 (`/api/docs`)                                          |

---

## 11. SOLID — Mapeo Detallado por Archivo

### 11.1 SRP — Single Responsibility Principle

> "Una clase debe tener una sola razón para cambiar."

#### Backend Consumer — Use Cases (1 archivo = 1 caso de uso)

| Archivo                                                                | Responsabilidad única                                                                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `application/use-cases/register-appointment.use-case.impl.ts`          | Solo registra cita (VO, duplicate check, factory, save). Event dispatch delegado al Decorator.        |
| `application/use-cases/cancel-appointment.use-case.impl.ts`            | Solo cancela cita en estado `waiting` y notifica.                                                     |
| `application/use-cases/complete-appointment.use-case.impl.ts`          | Solo completa cita en estado `called` y libera doctor.                                                |
| `application/use-cases/complete-expired-appointments.use-case.impl.ts` | Solo busca citas expiradas, las completa y libera doctores.                                           |
| `application/use-cases/assign-doctor.use-case.impl.ts`                 | Solo asigna doctores disponibles a pacientes (ordenados por prioridad).                               |
| `application/use-cases/assign-available-offices.use-case.impl.ts`      | Solo asigna consultorios libres a pacientes en espera.                                                |
| `application/use-cases/maintenance-orchestrator.use-case.impl.ts`      | Solo orquesta el ciclo de mantenimiento (lock → expirar → asignar → release). Delega a sub-use-cases. |

#### Backend Consumer — Event Handlers (1 handler = 1 tipo de evento)

| Archivo                                                    | Responsabilidad única                                                                                                                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `application/event-handlers/appointment-events.handler.ts` | `AppointmentRegisteredHandler` maneja solo `AppointmentRegisteredEvent`. `AppointmentAssignedHandler` maneja solo `AppointmentAssignedEvent`. Dos clases con responsabilidad única cada una. |
| `application/event-handlers/auto-assign.handler.ts`        | `AutoAssignOnRegisterHandler` reacciona solo a `AppointmentRegisteredEvent` para asignar doctor inmediatamente.                                                                              |

#### Backend Consumer — Dominio

| Archivo                                                    | Responsabilidad única                                                                                                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `domain/policies/consultation.policy.ts`                   | Solo encapsula reglas de negocio de consulta (oficinas disponibles, elegibilidad, duración). Extraído del repo — corrección "A-08". |
| `domain/factories/appointment.factory.ts`                  | Solo crea instancias válidas de `Appointment` con estado inicial correcto.                                                          |
| `domain/specifications/appointment-query.specification.ts` | Solo define criterios de negocio para queries (estados activos, orden de cola).                                                     |

#### Backend Consumer — Infraestructura (Mapper, Builder, Decorator separados del Repository)

| Archivo                                                                            | Responsabilidad única                                                                     |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `infrastructure/persistence/appointment.mapper.ts`                                 | Solo mapea entre documentos Mongoose y entidades de dominio (`toDomain`/`toPersistence`). |
| `infrastructure/persistence/doctor.mapper.ts`                                      | Solo mapea `DoctorDocument` → entidad `Doctor` de dominio.                                |
| `infrastructure/persistence/mongoose-query.builder.ts`                             | Solo traduce especificaciones de dominio a sintaxis Mongoose (`$in`, `$lte`).             |
| `infrastructure/persistence/event-dispatching-appointment-repository.decorator.ts` | Solo añade dispatch de eventos después de `save()`. El repo no sabe de eventos.           |
| `infrastructure/persistence/mongoose-appointment.repository.ts`                    | Solo hace CRUD Mongoose para citas. Delega mapeo a `AppointmentMapper`.                   |
| `infrastructure/persistence/mongoose-doctor.repository.ts`                         | Solo hace CRUD Mongoose para doctores.                                                    |
| `infrastructure/persistence/mongoose-office.repository.ts`                         | Solo lee números de consultorios habilitados.                                             |
| `infrastructure/persistence/mongoose-lock.repository.ts`                           | Solo gestiona acquire/release de locks distribuidos.                                      |
| `infrastructure/persistence/mongoose-audit.adapter.ts`                             | Solo inserta entries de auditoría (write-only).                                           |

#### Backend Consumer — Scheduler

| Archivo                          | Responsabilidad única                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `scheduler/scheduler.service.ts` | Solo decide **cuándo** disparar el ciclo de mantenimiento (timer). Comentario: `"PURE TRIGGER: Scheduler only decides WHEN to run."` |

#### Backend Producer — Controllers, Guards, Interceptors, Decorators

| Archivo                                     | Responsabilidad única                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `producer.controller.ts`                    | Solo maneja HTTP request/response para creación de citas. Mapea DTO→Command, delega a use case. |
| `consumer.controller.ts`                    | Solo consume mensajes RabbitMQ. Mapea DTO→Command, delega a use cases, maneja ack/nack.         |
| `mappers/appointment.mapper.ts`             | Solo mapea `AppointmentEventPayload` → `AppointmentResponseDto`.                                |
| `mappers/doctor.mapper.ts`                  | Solo mapea `DoctorView` → `DoctorResponseDto`.                                                  |
| `auth/guards/firebase-auth.guard.ts`        | Solo valida token Firebase y resuelve Profile activo.                                           |
| `auth/guards/role.guard.ts`                 | Solo verifica si el usuario tiene un rol permitido.                                             |
| `auth/guards/firebase-token-only.guard.ts`  | Solo valida token Firebase sin requerir Profile.                                                |
| `auth/guards/ws-firebase-auth.guard.ts`     | Solo autentica clientes WebSocket vía Firebase + Profile.                                       |
| `auth/guards/doctor-context.guard.ts`       | Solo valida que un doctor opera su propio recurso.                                              |
| `common/guards/ws-auth.guard.ts`            | Solo valida WebSocket contra token estático compartido.                                         |
| `common/interceptors/audit.interceptor.ts`  | Solo registra auditoría después de handlers exitosos. Fire-and-forget.                          |
| `auth/decorators/roles.decorator.ts`        | Solo establece metadata `ROLES_KEY` en endpoints.                                               |
| `auth/decorators/current-user.decorator.ts` | Solo extrae `AuthenticatedUser` del request.                                                    |
| `common/decorators/auditable.decorator.ts`  | Solo establece metadata `AUDIT_ACTION_KEY` en endpoints.                                        |

#### Frontend — Hooks (14 hooks, 1 responsabilidad cada uno)

| Archivo                                        | Responsabilidad única                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `hooks/useAuth.ts`                             | Solo expone estado auth y acciones login/logout.                                        |
| `hooks/useAppointmentRegistration.ts`          | Solo gestiona estado de creación de citas (loading, success, error, anti-doble-submit). |
| `hooks/useAppointmentsWebSocket.ts`            | Solo gestiona conexión WebSocket pública y lista en tiempo real.                        |
| `hooks/useOperationalAppointmentsWebSocket.ts` | Solo gestiona conexión WebSocket operativa autenticada.                                 |
| `hooks/useRoleGuard.ts`                        | Solo verifica rol y redirige si no lo tiene.                                            |
| `hooks/useQueuePosition.ts`                    | Solo consulta posición en cola del paciente.                                            |
| `hooks/useOperationalMetrics.ts`               | Solo consulta métricas con auto-refresh de 30s.                                         |
| `hooks/useDoctorDashboard.ts`                  | Solo gestiona estado del dashboard de doctor (check-in/out).                            |
| `hooks/useAuditLogs.ts`                        | Solo gestiona fetching paginado de logs de auditoría.                                   |
| `hooks/useAvailableOffices.ts`                 | Solo consulta consultorios disponibles para check-in.                                   |
| `hooks/useDoctorOptions.ts`                    | Solo carga catálogo de doctores para selectores.                                        |
| `hooks/useOfficeCatalog.ts`                    | Solo gestiona estado CRUD del catálogo de consultorios.                                 |
| `hooks/useProfiles.ts`                         | Solo gestiona estado de lista/crear/actualizar perfiles admin.                          |
| `hooks/useSpecialties.ts`                      | Solo gestiona estado CRUD del catálogo de especialidades.                               |

#### Frontend — Context Providers

| Archivo                         | Responsabilidad única                                                     |
| ------------------------------- | ------------------------------------------------------------------------- |
| `context/AuthProvider.tsx`      | Solo gestiona estado Firebase auth y resolución de sesión.                |
| `context/ThemeProvider.tsx`     | Solo gestiona toggle light/dark y persistencia en localStorage.           |
| `context/DependencyContext.tsx` | Solo actúa como Composition Root — crea singletons e inyecta via Context. |

#### Frontend — Services (1 servicio = 1 dominio API)

| Archivo                          | Responsabilidad única                                                           |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `services/appointmentService.ts` | Solo hace HTTP calls para acciones de citas (complete, cancel, queue-position). |
| `services/auditService.ts`       | Solo consulta `GET /audit-logs`.                                                |
| `services/authService.ts`        | Solo maneja sign-in/sign-out Firebase y resolución de sesión.                   |
| `services/doctorService.ts`      | Solo hace HTTP calls para operaciones de doctor (list, get, check-in/out).      |
| `services/metricsService.ts`     | Solo consulta métricas operacionales.                                           |
| `services/profileService.ts`     | Solo hace HTTP calls para CRUD de perfiles.                                     |
| `services/officeService.ts`      | Solo hace HTTP calls para catálogo de consultorios.                             |
| `services/specialtyService.ts`   | Solo hace HTTP calls para CRUD de especialidades.                               |
| `services/AudioService.ts`       | Solo encapsula reproducción de audio en navegador.                              |

---

### 11.2 OCP — Open/Closed Principle

> "Abierto para extensión, cerrado para modificación."

#### Sistema de Domain Events (extensible sin modificar el bus)

| Archivo                                                               | Cómo aplica OCP                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `consumer/infrastructure/messaging/local-domain-event-bus.adapter.ts` | Usa **registro de handlers** (`Map<string, DomainEventHandler[]>`). Nuevos eventos se soportan registrando handlers — la clase del bus **nunca se modifica**. Comentario: `"Agregar nuevos eventos requiere registrar nuevos handlers, sin modificar esta clase."` |
| `consumer/domain/ports/outbound/domain-event-handler.port.ts`         | Interface genérica `DomainEventHandler<T>` con discriminador `eventType`. Nuevos handlers implementan la interfaz sin cambiar el contrato. Comentario: `"OCP: Los nuevos tipos de evento requieren nuevos handlers, no modificar el bus."`                         |
| `consumer/domain/events/domain-event.base.ts`                         | Clase abstracta `DomainEvent`. Nuevos eventos la extienden sin modificar la base.                                                                                                                                                                                  |
| `consumer/domain/events/appointment-registered.event.ts`              | Extiende `DomainEvent` — no requirió cambios en el bus ni en la clase base.                                                                                                                                                                                        |
| `consumer/domain/events/appointment-assigned.event.ts`                | Mismo patrón — nuevo tipo de evento, cero modificaciones al código existente.                                                                                                                                                                                      |

#### Composición de Módulos NestJS (extensible por imports)

| Archivo                      | Cómo aplica OCP                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `consumer/src/app.module.ts` | Nuevos features se añaden importando módulos (`AppointmentModule`, `SchedulerModule`, `NotificationsModule`). Se extiende por composición, no modificación.                                                        |
| `producer/src/app.module.ts` | Mismo patrón — features como imports (`DoctorModule`, `EventsModule`, `MetricsModule`, `OfficeModule`, `ProfilesModule`, `AuditModule`). Nuevos ports se vinculan via `provide/useClass` sin modificar existentes. |

#### Decorators de Metadata (extensible sin cambiar guards)

| Archivo                                             | Cómo aplica OCP                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `producer/auth/decorators/roles.decorator.ts`       | Acepta cualquier `ProfileRole[]`. Nuevos roles se agregan al tipo — el decorator no cambia.                   |
| `producer/auth/guards/role.guard.ts`                | Lee roles de Reflector metadata. Soporta cualquier número de roles sin cambios en código.                     |
| `producer/common/decorators/auditable.decorator.ts` | Acepta cualquier `OperationalAuditAction`. Nuevas acciones se agregan al tipo sin modificar el decorator.     |
| `producer/common/interceptors/audit.interceptor.ts` | Lee action del metadata — sin cadenas `if/switch`. Nuevos endpoints auditables solo necesitan `@Auditable()`. |

#### Frontend — Adapters intercambiables sin modificar ports

| Archivo                                  | Cómo aplica OCP                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `frontend/context/DependencyContext.tsx` | Nuevos adapters (e.g., `MockSocketIoAdapter` para tests) se intercambian sin modificar hooks. Solo el Composition Root cambia. |

---

### 11.3 LSP — Liskov Substitution Principle

> "Los subtipos deben ser sustituibles por sus tipos base."

#### Value Objects — Siempre válidos o lanzan excepción

| Archivo                                                   | Cómo aplica LSP                                                                                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `consumer/domain/value-objects/id-card.value-object.ts`   | Constructor valida (6–12 dígitos via branded types). Lanza `ValidationError` si inválido. Comentario: `"LSP: IdCard es SIEMPRE válido."` |
| `consumer/domain/value-objects/full-name.value-object.ts` | Constructor valida (2–100 caracteres). Lanza `ValidationError` si inválido. Una instancia es **siempre** un nombre válido.               |
| `consumer/domain/value-objects/priority.value-object.ts`  | Constructor valida (solo `high`/`medium`/`low`). Lanza `ValidationError` si inválido.                                                    |
| `producer/domain/value-objects/id-card.vo.ts`             | Validación independiente del VO del Consumer. Misma garantía de validez.                                                                 |
| `producer/domain/value-objects/patient-name.vo.ts`        | Validación de caracteres. Instancia siempre válida.                                                                                      |

#### Adapters que cumplen fielmente el contrato del puerto

| Archivo                                                                  | Puerto                    | Cómo aplica LSP                                                                                                             |
| ------------------------------------------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `consumer/infrastructure/persistence/mongoose-appointment.repository.ts` | `AppointmentRepository`   | Implementa todos los métodos read/write. Retorna entidades de dominio, no documentos Mongoose.                              |
| `consumer/infrastructure/persistence/mongoose-doctor.repository.ts`      | `DoctorRepository`        | Implementa todos los métodos incluyendo `markBusyAtomic`.                                                                   |
| `consumer/infrastructure/persistence/mongoose-audit.adapter.ts`          | `AuditPort`               | Implementa `log()` — write-only, tal como especifica el puerto.                                                             |
| `consumer/infrastructure/persistence/mongoose-office.repository.ts`      | `OfficeReadRepository`    | Implementa `findEnabledNumbers()` — read-only, coincide con el puerto.                                                      |
| `consumer/infrastructure/persistence/mongoose-lock.repository.ts`        | `LockRepository`          | Implementa `acquire`/`release` con la semántica exacta (retorna boolean, void).                                             |
| `consumer/infrastructure/messaging/retry-policy.adapter.ts`              | `RetryPolicyPort`         | Implementa `shouldMoveToDLQ`/`getMaxRetries` según contrato.                                                                |
| `consumer/infrastructure/messaging/rabbitmq-notification.adapter.ts`     | `NotificationPort`        | Implementa `notifyAppointmentUpdated` — los callers no saben de RabbitMQ.                                                   |
| `consumer/infrastructure/messaging/local-domain-event-bus.adapter.ts`    | `DomainEventBus`          | Implementa `publish()` — maneja eventos individuales y arrays.                                                              |
| `frontend/infrastructure/adapters/SocketIoAdapter.ts`                    | `RealTimePort`            | Implementa todos los métodos (`connect`, `disconnect`, `onSnapshot`, etc.). Intercambiable por SSE o mock.                  |
| `frontend/infrastructure/adapters/AuthenticatedSocketIoAdapter.ts`       | `OperationalRealTimePort` | Implementa todos los métodos incluyendo `onAuthRejected`. Misma sustituibilidad.                                            |
| `frontend/infrastructure/adapters/HttpAppointmentAdapter.ts`             | `AppointmentRepository`   | Implementa `getAppointments`/`createAppointment` usando `fetch`.                                                            |
| `frontend/repositories/HttpAppointmentRepository.ts`                     | `AppointmentRepository`   | Implementación alternativa usando `httpClient` con resiliencia. Ambas satisfacen el mismo puerto — totalmente sustituibles. |

#### Decorator que preserva la interfaz del Repository

| Archivo                                                                                     | Cómo aplica LSP                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consumer/infrastructure/persistence/event-dispatching-appointment-repository.decorator.ts` | Implementa `AppointmentRepository` y delega todas las llamadas al `decoratee` interno. Añade dispatch de eventos tras `save()` pero retorna los mismos tipos. Cualquier código que acepte `AppointmentRepository` funciona idénticamente con el repo base o el decorator. |

---

### 11.4 ISP — Interface Segregation Principle

> "Los clientes no deben depender de interfaces que no usan."

#### Repositories segregados en Read + Write

| Archivo                                                         | Segregación                                                                                                                                                                                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consumer/domain/ports/outbound/appointment.repository.ts`      | Define **tres** interfaces: `AppointmentReadRepository` (5 métodos read), `AppointmentWriteRepository` (2 métodos write), y `AppointmentRepository` (extiende ambas). Use cases que solo leen dependen de la interfaz read-only. |
| `consumer/domain/ports/outbound/doctor.repository.ts`           | Define `DoctorReadRepository` (3 métodos: `findAvailable`, `findById`, `findAll`), `DoctorWriteRepository` (2 métodos: `updateStatus`, `markBusyAtomic`), y `DoctorRepository` (extiende ambas).                                 |
| `producer/domain/ports/outbound/appointment-read.repository.ts` | `AppointmentReadRepository` (Producer) — solo métodos de lectura (`findAll`, `findByIdCard`, `findWaiting`, etc.). Sin operaciones de escritura.                                                                                 |

#### Puertos Write-Only

| Archivo                                                    | Segregación                                                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `consumer/domain/ports/outbound/audit.port.ts`             | `AuditPort` solo tiene `log(entry)` — write-only. Sin métodos de lectura.                                             |
| `producer/domain/ports/outbound/operational-audit.port.ts` | `OperationalAuditPort` solo `log()` + `hasRecentEntry()` — write minimal + dedup guard. Separado de puertos de query. |
| `consumer/domain/ports/outbound/notification.port.ts`      | `NotificationPort` solo tiene `notifyAppointmentUpdated()` — un solo método.                                          |

#### Puertos Read-Only

| Archivo                                               | Segregación                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `consumer/domain/ports/outbound/office.repository.ts` | `OfficeReadRepository` solo tiene `findEnabledNumbers()` — sin métodos de escritura. |

#### Separación de Puertos Frontend

| Archivo                                            | Segregación                                                                                                                                                    |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/domain/ports/RealTimePort.ts`            | Puerto público: `connect()` sin argumentos, sin métodos de auth. 7 métodos para WebSocket no autenticado.                                                      |
| `frontend/domain/ports/OperationalRealTimePort.ts` | Puerto autenticado: `connect(token)` requiere token, agrega `onAuthRejected()`. 8 métodos. Hooks de pantalla pública no necesitan implementar rechazo de auth. |
| `frontend/domain/ports/AppointmentRepository.ts`   | Solo 2 métodos: `getAppointments` y `createAppointment`. Separado de concerns real-time.                                                                       |

#### Guards Separados por Concern

| Archivo                                             | Segregación                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `producer/auth/guards/firebase-auth.guard.ts`       | Solo maneja verificación de token + resolución de Profile.                     |
| `producer/auth/guards/role.guard.ts`                | Solo verifica roles después del auth. Concern separado de validación de token. |
| `producer/auth/guards/firebase-token-only.guard.ts` | Solo valida token, sin Profile. Contrato más estrecho que `FirebaseAuthGuard`. |
| `producer/auth/guards/doctor-context.guard.ts`      | Solo valida auto-acceso de doctor. Separado de auth y roles.                   |
| `producer/auth/guards/ws-firebase-auth.guard.ts`    | Solo maneja auth WebSocket (transporte distinto a guards HTTP).                |
| `producer/common/guards/ws-auth.guard.ts`           | Solo valida token compartido de WebSocket (consumer-side WS).                  |

#### Otros Puertos Segregados (Minimal Interfaces)

| Archivo                                                                  | Métodos                                                          | Segregación                         |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- | ----------------------------------- |
| `consumer/domain/ports/outbound/clock.port.ts`                           | 2 (`now()`, `isoNow()`)                                          | Mínimo para abstracción de tiempo.  |
| `consumer/domain/ports/outbound/logger.port.ts`                          | Solo logging                                                     | Separado de cualquier otro concern. |
| `consumer/domain/ports/outbound/lock.repository.ts`                      | 2 (`acquire`, `release`)                                         | Sin métodos de query ni status.     |
| `consumer/domain/ports/outbound/retry-policy.port.ts`                    | 2 (`shouldMoveToDLQ`, `getMaxRetries`)                           | Solo decisiones de retry.           |
| `consumer/domain/ports/outbound/domain-event-bus.port.ts`                | 1 (`publish`)                                                    | Solo dispatch de eventos.           |
| `producer/domain/ports/outbound/event-broadcaster.port.ts`               | 1 (`broadcastAppointmentUpdated`)                                | Solo broadcast WebSocket.           |
| `producer/domain/ports/outbound/appointment-publisher.port.ts`           | 1 (`publishAppointmentCreated`)                                  | Solo publicación a cola.            |
| `producer/domain/ports/outbound/appointment-lifecycle-publisher.port.ts` | 3 (`publishComplete`, `publishCancel`, `publishDoctorCheckedIn`) | Solo lifecycle de citas.            |
| `producer/domain/ports/outbound/firebase-auth.port.ts`                   | 3 (`verifyIdToken`, `createUser`, `getUserByEmail`)              | Solo operaciones Firebase.          |

---

### 11.5 DIP — Dependency Inversion Principle

> "Depender de abstracciones, no de concreciones."

#### `@Inject` con Tokens de String (Producer)

| Archivo                               | Tokens inyectados                                                                                                                                                                           | Cómo aplica DIP                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `producer/src/producer.controller.ts` | `"CreateAppointmentUseCase"`, `"QueryAppointmentsUseCase"`                                                                                                                                  | Controller depende de **puertos inbound abstractos**, inyectados vía string tokens. No conoce la clase de implementación. |
| `producer/src/app.module.ts`          | `"CreateAppointmentUseCase"` → `CreateAppointmentUseCaseImpl`, `"AppointmentPublisherPort"` → `RabbitMQPublisherAdapter`, `LIFECYCLE_PUBLISHER_TOKEN` → `RabbitMQLifecyclePublisherAdapter` | Binding de abstracciones a implementaciones via `provide/useClass`.                                                       |

#### Constructor Injection en Consumer Use Cases (reciben puertos)

Todos los use cases reciben **solo puertos de dominio** — nunca clases concretas de infraestructura.

| Archivo                                                                         | Puertos inyectados                                                                                                                                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `consumer/application/use-cases/register-appointment.use-case.impl.ts`          | `AppointmentRepository`, `LoggerPort`, `ClockPort`                                                                                                                 |
| `consumer/application/use-cases/cancel-appointment.use-case.impl.ts`            | `AppointmentRepository`, `LoggerPort`, `NotificationPort`                                                                                                          |
| `consumer/application/use-cases/complete-appointment.use-case.impl.ts`          | `AppointmentRepository`, `DoctorRepository`, `LoggerPort`, `NotificationPort`                                                                                      |
| `consumer/application/use-cases/complete-expired-appointments.use-case.impl.ts` | `AppointmentRepository`, `NotificationPort`, `LoggerPort`, `ClockPort`, `DoctorRepository`, `AuditPort`                                                            |
| `consumer/application/use-cases/assign-doctor.use-case.impl.ts`                 | `AppointmentRepository`, `DoctorRepository`, `AuditPort`, `LoggerPort`, `ClockPort`, `ConsultationPolicy`                                                          |
| `consumer/application/use-cases/maintenance-orchestrator.use-case.impl.ts`      | `CompleteExpiredAppointmentsUseCase`, `AssignAvailableOfficesUseCase`, `LockRepository`, `LoggerPort` — depende de **interfaces inbound**, no de clases concretas. |

#### Consumer Controller — `@Inject` con String Tokens

| Archivo                               | Tokens inyectados                                                                                                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consumer/src/consumer.controller.ts` | `"RegisterAppointmentUseCase"`, `"RetryPolicyPort"`, `"CompleteAppointmentUseCase"`, `"CancelAppointmentUseCase"`, `"MaintenanceOrchestratorUseCase"` — todas las dependencias son puertos abstractos inyectados por token. |

#### Scheduler — Inyecta Puerto, No Implementación

| Archivo                                   | Cómo aplica DIP                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `consumer/scheduler/scheduler.service.ts` | `@Inject("MaintenanceOrchestratorUseCase")` y `@Inject("LoggerPort")` — depende de puertos abstractos, no de clases concretas. |

#### `useFactory` en Módulos NestJS (Config en runtime)

| Archivo                      | Cómo aplica DIP                                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `consumer/src/app.module.ts` | `MongooseModule.forRootAsync({ useFactory })` — MongoDB URI inyectada via `ConfigService`, no hardcodeada. `RetryPolicyPort` vinculado via `provide/useClass`.                                         |
| `producer/src/app.module.ts` | `MongooseModule.forRootAsync({ useFactory })`, `ClientsModule.registerAsync({ useFactory })`, `ThrottlerModule.forRootAsync({ useFactory })` — toda la config resuelta en runtime via `ConfigService`. |

#### Guards que reciben `FirebaseAuthPort` en vez de Firebase SDK directamente

| Archivo                                             | Cómo aplica DIP                                                                                                                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `producer/auth/guards/firebase-auth.guard.ts`       | `@Inject(FIREBASE_AUTH_PORT) private readonly firebaseAuth: FirebaseAuthPort` — depende de la **abstracción del puerto**, no del Firebase Admin SDK directamente. Los tests inyectan un mock. |
| `producer/auth/guards/firebase-token-only.guard.ts` | Mismo patrón: `@Inject(FIREBASE_AUTH_PORT) private readonly firebaseAuth: FirebaseAuthPort`.                                                                                                  |
| `producer/auth/guards/ws-firebase-auth.guard.ts`    | Mismo patrón: `@Inject(FIREBASE_AUTH_PORT)` + `@Inject(PROFILE_REPOSITORY_TOKEN)`. Ambos son puertos abstractos.                                                                              |

#### Frontend — Composition Root + Hooks consumen interfaces

| Archivo                                                 | Cómo aplica DIP                                                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/context/DependencyContext.tsx`                | Crea adapters concretos (`HttpAppointmentAdapter`, `SocketIoAdapter`, `AuthenticatedSocketIoAdapter`) en **un solo lugar**. Todos los hooks consumen **solo interfaces** via `useDependencies()`. |
| `frontend/hooks/useAppointmentRegistration.ts`          | `const { repository } = useDependencies()` — depende de `AppointmentRepository` interfaz, no de `HttpAppointmentAdapter`.                                                                         |
| `frontend/hooks/useAppointmentsWebSocket.ts`            | `const { realTime } = useDependencies()` — depende de `RealTimePort` interfaz. Comentario: `"DI: Inject RealTime implementation (SocketIO, SSE, Mock)."`                                          |
| `frontend/hooks/useOperationalAppointmentsWebSocket.ts` | `const { operationalRealTime } = useDependencies()` — depende de `OperationalRealTimePort` interfaz.                                                                                              |

---

### 11.6 Archivos que Demuestran Múltiples Principios SOLID

| Archivo                                                                                     | SRP | OCP | LSP | ISP | DIP |
| ------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: |
| `consumer/infrastructure/persistence/event-dispatching-appointment-repository.decorator.ts` | ✅  |     | ✅  |     |     |
| `consumer/infrastructure/messaging/local-domain-event-bus.adapter.ts`                       | ✅  | ✅  | ✅  |     | ✅  |
| `consumer/domain/ports/outbound/appointment.repository.ts`                                  |     |     |     | ✅  | ✅  |
| `consumer/domain/ports/outbound/doctor.repository.ts`                                       |     |     |     | ✅  | ✅  |
| `frontend/context/DependencyContext.tsx`                                                    | ✅  | ✅  |     |     | ✅  |
| `producer/auth/guards/firebase-auth.guard.ts`                                               | ✅  |     |     | ✅  | ✅  |
| `consumer/infrastructure/persistence/mongoose-appointment.repository.ts`                    | ✅  |     | ✅  |     | ✅  |
| `consumer/domain/policies/consultation.policy.ts`                                           | ✅  |     |     |     |     |
| `producer/src/app.module.ts`                                                                |     | ✅  |     |     | ✅  |
| `consumer/src/app.module.ts`                                                                |     | ✅  |     |     | ✅  |

---

## 12. Resumen Cuantitativo

| Categoría                       | Cantidad | Detalle                                                                                                                                                                                                                          |
| ------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Arquitecturas**               | 3        | Hexagonal, Event-Driven, CQRS                                                                                                                                                                                                    |
| **Patrones de Diseño**          | 18       | Repository, Adapter, Decorator, Factory, Observer/Domain Events, Policy, Specification, Command, Data Mapper, Builder, Composite, Guard, Circuit Breaker, Retry, Exception Filter, Interceptor/AOP, Distributed Lock, Atomic CAS |
| **DDD Tactical Patterns**       | 6        | Entity, Value Object, Domain Event, Domain Error Hierarchy, Branded Types, View Model                                                                                                                                            |
| **SOLID Principles**            | 5/5      | SRP, OCP, LSP, ISP, DIP — todos con evidencia explícita en código y mapeo por archivo                                                                                                                                           |
| **Endpoints HTTP (Producer)**   | 26       | Auth 1, Appointments 6, Profiles 5, Doctors 6, Offices 3, Specialties 4, Metrics 1, Audit 1 (+ health + swagger)                                                                                                                |
| **Endpoints HTTP (Consumer)**   | 1        | Health check                                                                                                                                                                                                                     |
| **Rutas Frontend**              | 9        | 3 públicas (`/`, `/login`, `/waiting-room`) + 5 admin + 1 doctor                                                                                                                                                                |
| **Puertos Outbound (Consumer)** | 11       | interfaces abstractas                                                                                                                                                                                                            |
| **Puertos Inbound (Consumer)**  | 6        | Use Cases como contratos                                                                                                                                                                                                         |
| **Puertos Outbound (Producer)** | 14+      | interfaces abstractas                                                                                                                                                                                                            |
| **Puertos Frontend**            | 3        | AppointmentRepository, RealTimePort, OperationalRealTimePort                                                                                                                                                                     |
| **Custom Hooks**                | 14       | cada uno con responsabilidad única                                                                                                                                                                                               |
| **Componentes React**           | 23       | UI components                                                                                                                                                                                                                    |
| **Guards Backend**              | 6        | Firebase, Roles, DoctorContext, WS                                                                                                                                                                                               |
| **Guards Frontend**             | 2        | useRoleGuard, RoleGate                                                                                                                                                                                                           |
| **ADRs documentados**           | 5        | Hexagonal, Event-Driven, Policy, MongoDB, Domain Events                                                                                                                                                                          |
| **Tests**                       | 1,367    | Producer 381, Consumer 427, Frontend 559                                                                                                                                                                                         |
| **Servicios Docker**            | 5        | Producer, Consumer, Frontend, RabbitMQ, MongoDB                                                                                                                                                                                  |
| **Colas RabbitMQ**              | 3        | appointments, notifications, DLQ                                                                                                                                                                                                 |
| **Patrones RabbitMQ**           | 6        | Consumer: 4 (`create`, `complete`, `cancel`, `doctor_checked_in`) + Producer: 2 (`created`, `updated`)                                                                                                                           |
| **Namespaces WebSocket**        | 2        | `/ws/appointments` (público) + `/ws/operational-appointments` (autenticado)                                                                                                                                                      |
| **Archivos con múltiples SOLID**| 10       | Ver sección 11.6 — tabla cruzada de principios por archivo                                                                                                                                                                       |
