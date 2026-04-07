---
id: SPEC-012
status: IMPLEMENTED
feature: appointment-lifecycle-management
created: 2026-04-05
updated: 2026-04-06
author: spec-generator
version: "1.0"
related-specs:
  - SPEC-003
  - SPEC-004
  - SPEC-008
  - SPEC-011
---

# Spec: Gestión Explícita del Ciclo de Vida de Turnos

> **Estado:** `IMPLEMENTED` → implementación, pruebas focales y QA completados bajo ASDD.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Habilitar la finalización explícita de turnos por parte del doctor y la cancelación de turnos en espera por parte de recepcionista o admin. Actualmente, el único mecanismo de completar un turno es la expiración automática vía `CompleteExpiredAppointmentsUseCase` (timer de 8-15 segundos configurado al momento de asignación). No existe ningún endpoint HTTP para que un doctor marque "atención terminada" ni para que un recepcionista cancele un turno en espera. El doctor también queda en estado `busy` hasta que el timer expire, sin posibilidad de liberarse antes.

### Requerimiento de Negocio

El requerimiento original establece que "el médico es el protagonista" y que "al registrarse, el sistema verifica exactamente qué médicos están activos". Sin embargo, el doctor actualmente no controla cuándo termina una consulta. La duración real de una consulta médica es impredecible — depende de la complejidad del caso. El timer ficticio de 8-15 segundos es una simulación para demo, pero el sistema necesita un mecanismo explícito para producción. Adicionalmente, los recepcionistas necesitan cancelar turnos cuando un paciente abandona la sala de espera, para evitar que el sistema le asigne un turno a un paciente que ya no está.

### Análisis de Estado Actual vs. Delta

| Capacidad                      | Estado actual                                              | Delta requerido                                                           |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| Completar turno (doctor)       | ❌ Solo auto-expiración por timer                          | **Nuevo**: `PATCH /appointments/:id/complete` → RabbitMQ → consumer       |
| Cancelar turno (recepcionista) | ❌ No existe                                               | **Nuevo**: `PATCH /appointments/:id/cancel` → RabbitMQ → consumer         |
| Status `cancelled`             | ❌ No existe en enum                                       | **Evolución**: agregar al enum `AppointmentStatus`                        |
| Liberar doctor tras completar  | ⚠️ Solo en auto-expiración                                 | **Extender**: reusar lógica de `CompleteExpired` para completar explícito |
| Notificación de cancelación    | ❌ No existe                                               | **Nuevo**: broadcast WebSocket de turno cancelado                         |
| UI de acción del doctor        | ❌ No existe (SPEC-008 define landing sin botón completar) | **Nuevo**: botón "Finalizar atención" en landing del doctor               |
| UI de cancelación              | ❌ No existe                                               | **Nuevo**: botón "Cancelar turno" en tarjeta de turno en espera           |

### Historias de Usuario

#### HU-01: Finalización explícita de turno por el doctor

```
Como:        Doctor autenticado con Perfil activo y paciente asignado
Quiero:      Marcar explícitamente que terminé la atención de mi paciente actual
Para:        Liberar mi disponibilidad inmediatamente y que el siguiente paciente en cola sea asignado sin esperar el timer

Prioridad:   Alta
Estimación:  M (Medium — 8 pts)
Dependencias: SPEC-003 (appointments + doctors), SPEC-004 (auth + roles), SPEC-008 (doctor landing)
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Doctor completa turno exitosamente
  Dado que:  el doctor "Dr. García" tiene estado "busy" con turno T-001 en status "called"
  Cuando:    el doctor envía PATCH /appointments/T-001/complete con su Bearer token
  Entonces:  el producer publica evento "complete_appointment" en RabbitMQ
  Y          el consumer transiciona T-001 a status "completed" con completedAt=now
  Y          el consumer transiciona "Dr. García" de "busy" a "available"
  Y          el consumer emite broadcast WebSocket con T-001 actualizado
  Y          el consumer ejecuta inmediatamente el ciclo de asignación
  Y          el producer responde HTTP 200 con {status: "accepted", message: "Turno marcado como completado"}
```

```gherkin
CRITERIO-1.2: Doctor se libera y recibe siguiente paciente
  Dado que:  el doctor completó turno T-001 y hay pacientes en espera (T-002 prioridad alta)
  Cuando:    el ciclo de asignación se ejecuta post-completado
  Entonces:  T-002 se asigna al doctor ahora disponible
  Y          la pantalla de sala de espera muestra actualización en tiempo real
```

**Error Path**

```gherkin
CRITERIO-1.3: Intento de completar turno que no es del doctor
  Dado que:  el doctor "Dr. López" (doctor_id=DOC-B) tiene turno T-003 asignado
  Cuando:    el doctor "Dr. García" (doctor_id=DOC-A) envía PATCH /appointments/T-003/complete
  Entonces:  el backend responde HTTP 403 "No autorizado para completar turno de otro médico"
  Y          NO se modifica el estado de T-003 ni del Dr. López
```

```gherkin
CRITERIO-1.4: Intento de completar turno en estado no-called
  Dado que:  el turno T-004 tiene status "waiting" (aún no asignado)
  Cuando:    un admin envía PATCH /appointments/T-004/complete
  Entonces:  el backend responde HTTP 409 "Solo turnos en atención (called) pueden completarse"
```

```gherkin
CRITERIO-1.5: Intento de completar turno inexistente
  Dado que:  no existe turno con id "FAKE-ID"
  Cuando:    el doctor envía PATCH /appointments/FAKE-ID/complete
  Entonces:  el backend responde HTTP 404 "Turno no encontrado"
```

**Edge Case**

```gherkin
CRITERIO-1.6: Turno auto-expira justo mientras el doctor intenta completar
  Dado que:  el turno T-005 expira automáticamente por el timer
  Cuando:    el doctor envía PATCH /appointments/T-005/complete casi simultáneamente
  Entonces:  si ya estaba completed, responde HTTP 409 "Turno ya fue completado"
  Y          si aún estaba called, se completa normalmente
```

---

#### HU-02: Cancelación de turno en espera

```
Como:        Recepcionista o Administrador autenticado
Quiero:      Cancelar un turno en estado "waiting" cuando el paciente abandona la sala de espera
Para:        Evitar que el sistema asigne un médico a un paciente que ya no está y mantener la cola limpia

Prioridad:   Alta
Estimación:  S (Small — 5 pts)
Dependencias: SPEC-003 (appointments), SPEC-004 (auth + roles)
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**

```gherkin
CRITERIO-2.1: Recepcionista cancela turno en espera
  Dado que:  el turno T-010 tiene status "waiting" para el paciente "Ana García" con cédula 123456
  Cuando:    el recepcionista envía PATCH /appointments/T-010/cancel con su Bearer token
  Entonces:  el producer publica evento "cancel_appointment" en RabbitMQ
  Y          el consumer transiciona T-010 a status "cancelled"
  Y          el consumer emite broadcast WebSocket con T-010 actualizado
  Y          las posiciones en cola se recalculan automáticamente (pacientes detrás de Ana suben 1 posición)
  Y          el producer responde HTTP 200 con {status: "accepted", message: "Turno cancelado"}
```

```gherkin
CRITERIO-2.2: Admin cancela turno en espera
  Dado que:  el admin envía PATCH /appointments/T-011/cancel
  Cuando:    T-011 tiene status "waiting"
  Entonces:  se cancela exitosamente (admin tiene permisos completos)
```

**Error Path**

```gherkin
CRITERIO-2.3: Intento de cancelar turno ya asignado (called)
  Dado que:  el turno T-012 tiene status "called" (paciente ya asignado a doctor)
  Cuando:    el recepcionista envía PATCH /appointments/T-012/cancel
  Entonces:  el backend responde HTTP 409 "Solo turnos en espera (waiting) pueden cancelarse"
```

```gherkin
CRITERIO-2.4: Intento de cancelar turno ya completado
  Dado que:  el turno T-013 tiene status "completed"
  Cuando:    el recepcionista envía PATCH /appointments/T-013/cancel
  Entonces:  el backend responde HTTP 409 "Solo turnos en espera (waiting) pueden cancelarse"
```

```gherkin
CRITERIO-2.5: Doctor intenta cancelar turno (rol no autorizado)
  Dado que:  un doctor envía PATCH /appointments/T-014/cancel
  Cuando:    el backend evalúa el RoleGuard
  Entonces:  responde HTTP 403 "Rol no autorizado para cancelar turnos"
```

```gherkin
CRITERIO-2.6: Turno inexistente
  Dado que:  no existe turno con id "FAKE-ID"
  Cuando:    el recepcionista envía PATCH /appointments/FAKE-ID/cancel
  Entonces:  responde HTTP 404 "Turno no encontrado"
```

### Reglas de Negocio

1. **Solo turnos `called` pueden completarse**: la transición es `called → completed`. Intentar completar un turno `waiting`, `completed` o `cancelled` responde 409.
2. **Solo turnos `waiting` pueden cancelarse**: la transición es `waiting → cancelled`. Intentar cancelar un turno `called`, `completed` o `cancelled` responde 409.
3. **Ownership del doctor**: un doctor solo puede completar turnos que estén asignados a su `doctor_id`. El admin puede completar cualquier turno (override operativo).
4. **Liberación del doctor**: al completar un turno, el doctor pasa de `busy` → `available` y se ejecuta inmediatamente el ciclo de asignación para servir al siguiente paciente.
5. **Cancelación NO libera doctor**: solo se cancelan turnos `waiting` que aún no tienen doctor asignado.
6. **Recálculo de cola**: al cancelar un turno waiting, las posiciones en cola se recalculan automáticamente (los pacientes detrás suben).
7. **Broadcast en tiempo real**: tanto completar como cancelar emiten evento WebSocket para actualizar todas las pantallas.
8. **Patrón asíncrono**: el producer valida, responde HTTP y publica en RabbitMQ. El consumer procesa la transición de estado. Consistente con el flujo existente de `create_appointment`.
9. **Auditoría**: si SPEC-011 está implementado, completar y cancelar generan registros de auditoría automáticos (sin trabajo adicional, vía `@Auditable` interceptor).

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad                           | Almacén                      | Cambios    | Descripción                                   |
| --------------------------------- | ---------------------------- | ---------- | --------------------------------------------- |
| `Appointment` (consumer entity)   | colección `appointments`     | modificada | Agregar status `cancelled`, método `cancel()` |
| `Appointment` (producer schema)   | colección `appointments`     | modificada | Agregar `cancelled` al enum de status         |
| `AppointmentView` (producer)      | domain model                 | modificada | Agregar `cancelled` al tipo `status`          |
| `AppointmentStatus` (shared type) | `types/appointment-event.ts` | modificada | Agregar `"cancelled"` al union type           |

#### Cambios al enum `AppointmentStatus`

```typescript
// Antes:
export type AppointmentStatus = "waiting" | "called" | "completed";

// Después:
export type AppointmentStatus =
  | "waiting"
  | "called"
  | "completed"
  | "cancelled";
```

**Archivos afectados (producer):**

- `backend/producer/src/types/appointment-event.ts`
- `backend/producer/src/schemas/appointment.schema.ts` (enum constraint)
- `backend/producer/src/dto/appointment-response.dto.ts`
- `backend/producer/src/domain/models/appointment-view.ts`

**Archivos afectados (consumer):**

- `backend/consumer/src/types/appointment-event.ts`
- `backend/consumer/src/domain/entities/appointment.entity.ts` (tipo + método `cancel()`)
- `backend/consumer/src/schemas/appointment.schema.ts` (si existe enum constraint)

**Archivos afectados (frontend):**

- `frontend/src/domain/Appointment.ts`

#### Índices / Constraints

No se requieren nuevos índices. Los existentes (`status`, `idCard`, `doctorId`) ya soportan las consultas necesarias.

### API Endpoints

#### PATCH /appointments/:id/complete

- **Descripción**: Marca un turno en atención como completado explícitamente
- **Auth requerida**: sí — Firebase idToken + rol `admin` o `doctor`
- **Guards**: `FirebaseAuthGuard` → `RoleGuard(@Roles('admin', 'doctor'))`
- **Validación adicional**: si el actor es `doctor`, verifica que el turno pertenece a su `doctor_id`
- **Params**: `id` — MongoDB ObjectId del turno
- **Request Body**: ninguno
- **Response 200**:
  ```json
  {
    "status": "accepted",
    "message": "Turno marcado como completado"
  }
  ```
- **Response 401**: Token ausente o expirado
- **Response 403**: Doctor intentando completar turno de otro médico
- **Response 404**: Turno no encontrado
- **Response 409**: Turno no está en status `called` (ya completado, cancelado o en espera)

#### PATCH /appointments/:id/cancel

- **Descripción**: Cancela un turno en espera
- **Auth requerida**: sí — Firebase idToken + rol `admin` o `recepcionista`
- **Guards**: `FirebaseAuthGuard` → `RoleGuard(@Roles('admin', 'recepcionista'))`
- **Params**: `id` — MongoDB ObjectId del turno
- **Request Body**: ninguno
- **Response 200**:
  ```json
  {
    "status": "accepted",
    "message": "Turno cancelado"
  }
  ```
- **Response 401**: Token ausente o expirado
- **Response 403**: Rol no autorizado
- **Response 404**: Turno no encontrado
- **Response 409**: Turno no está en status `waiting`

### Diseño Backend — Arquitectura Hexagonal

#### Nuevos puertos y eventos (Producer)

| Puerto / Tipo                       | Archivo                                                         | Descripción                                                                      |
| ----------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `AppointmentLifecyclePublisherPort` | `domain/ports/outbound/appointment-lifecycle-publisher.port.ts` | Interfaz para publicar `complete_appointment` y `cancel_appointment` en RabbitMQ |
| `CompleteAppointmentCommand`        | `domain/commands/complete-appointment.command.ts`               | Command con `appointmentId` y `actorUid`                                         |
| `CancelAppointmentCommand`          | `domain/commands/cancel-appointment.command.ts`                 | Command con `appointmentId` y `actorUid`                                         |

```typescript
// domain/ports/outbound/appointment-lifecycle-publisher.port.ts
export interface CompleteAppointmentEvent {
  appointmentId: string;
  actorUid: string;
  timestamp: number;
}

export interface CancelAppointmentEvent {
  appointmentId: string;
  actorUid: string;
  timestamp: number;
}

export interface AppointmentLifecyclePublisherPort {
  publishCompleteAppointment(event: CompleteAppointmentEvent): Promise<void>;
  publishCancelAppointment(event: CancelAppointmentEvent): Promise<void>;
}
```

#### Nuevo adaptador (Producer)

| Adaptador                           | Archivo                                                                    | Implementa                          | Descripción                                                    |
| ----------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `RabbitMQLifecyclePublisherAdapter` | `infrastructure/adapters/outbound/rabbitmq-lifecycle-publisher.adapter.ts` | `AppointmentLifecyclePublisherPort` | Emite `complete_appointment` y `cancel_appointment` a RabbitMQ |

#### Nuevo controlador de lifecycle (Producer)

| Controlador                      | Archivo                                            | Endpoints                                  |
| -------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| `AppointmentLifecycleController` | `appointments/appointment-lifecycle.controller.ts` | `PATCH /:id/complete`, `PATCH /:id/cancel` |

**Lógica del controlador:**

1. Valida auth + rol vía guards
2. Para `complete`: lee appointment de MongoDB (read-only) → valida status `called` → si actor es doctor, valida ownership contra `doctorId` en el document → publica a RabbitMQ → responde 200
3. Para `cancel`: lee appointment → valida status `waiting` → publica a RabbitMQ → responde 200
4. El producer NO modifica el estado directamente — delega al consumer vía RabbitMQ (patrón CQRS existente)

#### Nuevos event handlers (Consumer)

| Handler                     | Archivo                  | Event Pattern                           |
| --------------------------- | ------------------------ | --------------------------------------- |
| `handleCompleteAppointment` | `consumer.controller.ts` | `@EventPattern("complete_appointment")` |
| `handleCancelAppointment`   | `consumer.controller.ts` | `@EventPattern("cancel_appointment")`   |

**Nuevo caso de uso (Consumer):**

| Use Case                         | Archivo                                                       | Descripción                                                                               |
| -------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `CompleteAppointmentUseCase`     | `domain/ports/inbound/complete-appointment.use-case.ts`       | Interfaz para completar explícitamente un turno                                           |
| `CompleteAppointmentUseCaseImpl` | `application/use-cases/complete-appointment.use-case.impl.ts` | Transiciona `called→completed`, libera doctor a `available`, notifica, ejecuta asignación |
| `CancelAppointmentUseCase`       | `domain/ports/inbound/cancel-appointment.use-case.ts`         | Interfaz para cancelar un turno en espera                                                 |
| `CancelAppointmentUseCaseImpl`   | `application/use-cases/cancel-appointment.use-case.impl.ts`   | Transiciona `waiting→cancelled`, notifica                                                 |

**Lógica de `CompleteAppointmentUseCaseImpl`:**

1. `appointmentRepository.findById(id)` → si no existe, log error y return
2. Valida `appointment.status === "called"` → si no, log warning y return
3. `appointment.complete()` → `appointmentRepository.save(appointment)`
4. Si `appointment.doctorId`: busca doctor → `doctor.markAvailable()` → `doctorRepository.updateStatus()`
5. `notificationPort.notifyAppointmentUpdated(appointment)` — broadcast WebSocket
6. `auditPort.log({ action: "APPOINTMENT_COMPLETED", ... })`
7. Ejecuta `assignUseCase.execute()` — trigger inmediato para asignar siguiente paciente

**Lógica de `CancelAppointmentUseCaseImpl`:**

1. `appointmentRepository.findById(id)` → si no existe, log error y return
2. Valida `appointment.status === "waiting"` → si no, log warning y return
3. `appointment.cancel()` → `appointmentRepository.save(appointment)`
4. `notificationPort.notifyAppointmentUpdated(appointment)` — broadcast WebSocket
5. `auditPort.log({ action: "APPOINTMENT_CANCELLED", ... })`

#### Cambios a entidad `Appointment` (Consumer)

Agregar método `cancel()`:

```typescript
public cancel(): void {
  if (this.status !== "waiting") {
    throw new ValidationError(
      `Cannot cancel appointment in ${this.status} status`,
    );
  }
  this.status = "cancelled";
}
```

#### Cambios a `AuditAction` (Consumer)

Agregar `"APPOINTMENT_CANCELLED"` al tipo:

```typescript
export type AuditAction =
  | "APPOINTMENT_ASSIGNED"
  | "APPOINTMENT_COMPLETED"
  | "APPOINTMENT_CANCELLED" // nuevo
  | "DOCTOR_CHECK_IN"
  | "DOCTOR_CHECK_OUT";
```

#### Registro en módulos

- **Producer**: registrar `AppointmentLifecyclePublisherPort` + adapter en `AppointmentModule`, registrar `AppointmentLifecycleController`
- **Consumer**: registrar `CompleteAppointmentUseCase` + `CancelAppointmentUseCase` en `UseCasesModule`, agregar handlers en `ConsumerController`

### Diseño Frontend

#### Componentes modificados

| Componente               | Archivo                                                 | Cambio                   | Descripción                                                              |
| ------------------------ | ------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| `WaitingAppointmentCard` | `components/AppointmentCard/WaitingAppointmentCard.tsx` | agregar botón "Cancelar" | Visible solo para roles `admin` y `recepcionista` (via prop `canCancel`) |
| `CalledAppointmentCard`  | `components/AppointmentCard/CalledAppointmentCard.tsx`  | sin cambio por ahora     | El botón "Finalizar" vive en la landing del doctor (SPEC-008)            |

#### Componentes nuevos

| Componente                 | Archivo                                                   | Props principales | Descripción                                                  |
| -------------------------- | --------------------------------------------------------- | ----------------- | ------------------------------------------------------------ |
| `CancelledAppointmentCard` | `components/AppointmentCard/CancelledAppointmentCard.tsx` | `appointment`     | Tarjeta para mostrar turnos cancelados (estilo diferenciado) |

#### Modificaciones al estado (SPEC-008 — Doctor Landing)

Cuando SPEC-008 se implemente, la landing del doctor (`/doctor/dashboard`) debe incluir:

- Sección "Paciente actual" con botón **"Finalizar atención"** que llama `PATCH /appointments/:id/complete`
- Al completar, la sección se actualiza mostrando "Sin paciente asignado" hasta que el scheduler asigne uno nuevo

#### Services (llamadas API — usa `fetch` nativo)

| Función                          | Archivo                          | Endpoint                           |
| -------------------------------- | -------------------------------- | ---------------------------------- |
| `completeAppointment(id, token)` | `services/appointmentService.ts` | `PATCH /appointments/:id/complete` |
| `cancelAppointment(id, token)`   | `services/appointmentService.ts` | `PATCH /appointments/:id/cancel`   |

**Patrón de referencia:**

```typescript
// services/appointmentService.ts — agregar a archivo existente
export async function completeAppointment(
  id: string,
  idToken: string,
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${env.API_BASE_URL}/appointments/${id}/complete`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`HTTP_ERROR: ${res.status}`);
  return res.json();
}

export async function cancelAppointment(
  id: string,
  idToken: string,
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${env.API_BASE_URL}/appointments/${id}/cancel`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`HTTP_ERROR: ${res.status}`);
  return res.json();
}
```

#### Domain type update

Agregar `"cancelled"` a `AppointmentStatus` en `frontend/src/domain/Appointment.ts`:

```typescript
export type AppointmentStatus =
  | "waiting"
  | "called"
  | "completed"
  | "cancelled";
```

#### Filtrado en pantallas

- **`/` (pantalla pública)**: filtrar `cancelled` fuera de la vista principal, o mostrarlos temporalmente con estilo tachado (decisión UX pendiente)
- **`/dashboard` (historial)**: incluir cancelados en la sección de historial con badge diferenciado
- **`/registration` (formulario)**: sin cambios

### Arquitectura y Dependencias

- **Paquetes nuevos requeridos**: ninguno — usa NestJS, Mongoose, RabbitMQ existentes
- **Servicios externos**: ninguno nuevo
- **Impacto en producer `AppModule`**: registrar lifecycle controller y publisher adapter
- **Impacto en consumer `AppModule`**: registrar nuevos use cases y event handlers
- **Impacto en frontend**: actualizar domain type, agregar 2 funciones al service existente, crear 1 componente nuevo

### Notas de Implementación

1. **Patrón CQRS existente**: mantener la consistencia con el flujo `create_appointment`. El producer valida y publica; el consumer ejecuta la transición de estado. El producer lee appointments en read-only para validar precondiciones (status, ownership).
2. **Ownership del doctor**: el producer tiene acceso read-only a la colección `appointments` y puede verificar `doctorId` del document contra `doctorId` del perfil autenticado (disponible en `request.user.doctor_id` vía SPEC-004).
3. **Idempotencia**: si el turno ya está `completed` cuando llega `complete_appointment`, el consumer simplemente logea warning y hace ACK sin error. Idem para `cancel` sobre turno ya cancelado.
4. **Trigger inmediato de asignación**: al completar un turno, el consumer ejecuta `assignUseCase.execute()` inmediatamente (mismo patrón que `doctor_checked_in`). Al cancelar, NO se ejecuta asignación — solo se elimina de la cola.
5. **Compatibilidad con auto-expiración**: la auto-expiración por timer sigue funcionando. El `complete` explícito es una alternativa que el doctor puede usar antes de que expire. El sistema es tolerante a race conditions (primer write gana).
6. **SPEC-008 pendiente**: el botón "Finalizar atención" en la landing del doctor se implementa cuando SPEC-008 se apruebe. Esta spec define el contrato backend; el frontend del doctor depende de SPEC-008.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend — Producer

#### Implementación

- [ ] Extender `AppointmentStatus` type en `types/appointment-event.ts` con `"cancelled"`
- [ ] Actualizar enum constraint en `schemas/appointment.schema.ts` con `"cancelled"`
- [ ] Actualizar `AppointmentView` en `domain/models/appointment-view.ts` con `"cancelled"`
- [ ] Actualizar `AppointmentResponseDto` en `dto/appointment-response.dto.ts` con `"cancelled"`
- [ ] Crear outbound port `AppointmentLifecyclePublisherPort` en `domain/ports/outbound/appointment-lifecycle-publisher.port.ts`
- [ ] Crear adapter `RabbitMQLifecyclePublisherAdapter` en `infrastructure/adapters/outbound/rabbitmq-lifecycle-publisher.adapter.ts`
- [ ] Crear `AppointmentLifecycleController` en `appointments/appointment-lifecycle.controller.ts` con PATCH `/:id/complete` y PATCH `/:id/cancel`
- [ ] Registrar port, adapter y controller en el módulo de appointments del producer
- [ ] Si SPEC-011 activo: agregar `@Auditable("APPOINTMENT_COMPLETED")` y `@Auditable("APPOINTMENT_CANCELLED")` a los endpoints

### Backend — Consumer

#### Implementación

- [ ] Extender `AppointmentStatus` type en `types/appointment-event.ts` con `"cancelled"`
- [ ] Agregar método `cancel()` a `Appointment` entity en `domain/entities/appointment.entity.ts`
- [ ] Agregar `"APPOINTMENT_CANCELLED"` al type `AuditAction` en `schemas/audit-log.schema.ts`
- [ ] Crear inbound port `CompleteAppointmentUseCase` en `domain/ports/inbound/complete-appointment.use-case.ts`
- [ ] Crear inbound port `CancelAppointmentUseCase` en `domain/ports/inbound/cancel-appointment.use-case.ts`
- [ ] Implementar `CompleteAppointmentUseCaseImpl` — transición `called→completed`, liberar doctor, notificar, trigger asignación
- [ ] Implementar `CancelAppointmentUseCaseImpl` — transición `waiting→cancelled`, notificar
- [ ] Agregar `@EventPattern("complete_appointment")` handler en `ConsumerController`
- [ ] Agregar `@EventPattern("cancel_appointment")` handler en `ConsumerController`
- [ ] Registrar use cases en `UseCasesModule`

#### Tests Backend — Producer

- [ ] `test_lifecycle_controller_complete_returns_200` — happy path completar turno called
- [ ] `test_lifecycle_controller_complete_returns_409_not_called` — turno no está called
- [ ] `test_lifecycle_controller_complete_returns_404_not_found` — turno no existe
- [ ] `test_lifecycle_controller_complete_returns_403_wrong_doctor` — ownership violation
- [ ] `test_lifecycle_controller_cancel_returns_200` — happy path cancelar turno waiting
- [ ] `test_lifecycle_controller_cancel_returns_409_not_waiting` — turno no está waiting
- [ ] `test_lifecycle_controller_cancel_returns_403_wrong_role` — doctor intenta cancelar
- [ ] `test_lifecycle_publisher_emits_complete` — adapter publica a RabbitMQ
- [ ] `test_lifecycle_publisher_emits_cancel` — adapter publica a RabbitMQ

#### Tests Backend — Consumer

- [ ] `test_complete_use_case_transitions_to_completed` — turno called → completed
- [ ] `test_complete_use_case_releases_doctor` — doctor busy → available
- [ ] `test_complete_use_case_triggers_assignment` — ejecuta assignUseCase post-completar
- [ ] `test_complete_use_case_audits_completion` — genera audit entry
- [ ] `test_complete_use_case_ignores_non_called` — turno no-called = warning, no error
- [ ] `test_cancel_use_case_transitions_to_cancelled` — turno waiting → cancelled
- [ ] `test_cancel_use_case_notifies_websocket` — broadcast cambio
- [ ] `test_cancel_use_case_audits_cancellation` — genera audit entry
- [ ] `test_cancel_use_case_ignores_non_waiting` — turno no-waiting = warning, no error
- [ ] `test_appointment_entity_cancel_validates_status` — entity throws si no-waiting

### Frontend

#### Implementación

- [ ] Actualizar `AppointmentStatus` en `domain/Appointment.ts` con `"cancelled"`
- [ ] Agregar `completeAppointment(id, token)` a `services/appointmentService.ts`
- [ ] Agregar `cancelAppointment(id, token)` a `services/appointmentService.ts`
- [ ] Crear componente `CancelledAppointmentCard` en `components/AppointmentCard/CancelledAppointmentCard.tsx` + exportar en `index.ts`
- [ ] Agregar prop `canCancel` y botón "Cancelar turno" a `WaitingAppointmentCard`
- [ ] Actualizar `page.tsx` (`/`) para filtrar o mostrar turnos cancelados con estilo diferenciado
- [ ] Actualizar `dashboard/page.tsx` para mostrar turnos cancelados en historial

#### Tests Frontend

- [ ] `test_appointment_service_complete` — servicio llama PATCH con token correcto
- [ ] `test_appointment_service_cancel` — servicio llama PATCH con token correcto
- [ ] `test_cancelled_appointment_card_renders` — componente renderiza con datos correctos
- [ ] `test_waiting_card_cancel_button_visible` — botón visible cuando `canCancel=true`
- [ ] `test_waiting_card_cancel_button_hidden` — botón oculto cuando `canCancel=false`
- [ ] `test_dashboard_shows_cancelled` — historial incluye turnos cancelados

### QA

- [ ] Verificar flujo completo: doctor completa → doctor se libera → siguiente paciente se asigna
- [ ] Verificar cancelación: recepcionista cancela → turno desaparece de cola → posiciones se actualizan
- [ ] Verificar race condition: completar vs auto-expiración simultánea no causa inconsistencia
- [ ] Verificar ownership: doctor A no puede completar turno de doctor B
- [ ] Verificar broadcast WebSocket: pantalla pública y dashboard se actualizan en tiempo real
- [ ] Verificar que `cancelled` no rompe queries existentes (`findWaiting`, `findExpiredCalled`)
