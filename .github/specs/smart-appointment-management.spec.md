---
id: SPEC-003
status: IMPLEMENTED
feature: smart-appointment-management
created: 2026-04-01
updated: 2026-04-01
author: spec-generator
version: "1.1"
related-specs: []
---

# Spec: Sistema Inteligente de Gestión de Turnos Médicos

> **Estado:** `IMPLEMENTED` — código, pruebas focalizadas y QA completados.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → **IMPLEMENTED** → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Evolucionar el sistema de gestión de turnos médicos de un modelo basado en consultorios abstractos dentro del rango fijo `1..5` a un modelo centrado en médicos reales con disponibilidad verificable. El sistema introduce la entidad `Doctor` con gestión de disponibilidad (check-in/check-out), evoluciona el motor de asignación para emparejar pacientes con médicos disponibles (no consultorios vacíos), agrega un endpoint de posición en cola, y muestra nombre del médico + consultorio al paciente en tiempo real.

### Requerimiento de Negocio

Reemplazar la asignación aleatoria a consultorios por un motor inteligente que garantice que los pacientes sean atendidos según su urgencia y solo por médicos físicamente disponibles en su consultorio. Ver `.github/requirements/smart-appointment-management.md`.

### Análisis de Estado Actual vs. Delta

| Capacidad                                      | Estado actual                                                                          | Delta requerido                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Registro con prioridad (`high`/`medium`/`low`) | ✅ Implementado (`CreateAppointmentDto`, `Priority` VO, formulario frontend)           | Mínimo: hacer `priority` obligatorio en DTO                      |
| Ordenamiento por prioridad + FIFO              | ✅ Implementado (`AssignAvailableOfficesUseCaseImpl`, `AppointmentQuerySpecification`) | Sin cambio en lógica de ordenamiento                             |
| WebSocket con reconexión                       | ✅ Implementado (`AppointmentsGateway`, `useAppointmentsWebSocket`, `WebSocketStatus`) | Extender payload con `doctorId`/`doctorName`                     |
| Motor de asignación                            | ⚠️ Parcial (asigna a office numérico, no a médico real)                                | **Refactor mayor**: asignar a `Doctor` disponible                |
| Entidad Doctor                                 | ❌ No existe                                                                           | **Nuevo**: schema, entity, repository, service, controller, DTOs |
| Posición en cola                               | ❌ No existe                                                                           | **Nuevo**: endpoint + cálculo de posición + UI                   |
| Info médico en UI                              | ❌ No existe                                                                           | **Nuevo**: mostrar doctorName en tarjetas + notificación         |
| Auditoría estructurada                         | ❌ Solo logs de consola                                                                | **Nuevo**: colección `audit_logs` + registro por asignación      |

### Nuevos Términos de Dominio

| Término                                | Campo           | Definición                                                                      |
| -------------------------------------- | --------------- | ------------------------------------------------------------------------------- |
| **Médico** (`doctor`)                  | —               | Profesional de salud registrado que atiende pacientes en un consultorio         |
| **Disponibilidad** (`status`)          | `doctor.status` | Estado operativo del médico: `available`, `busy`, `offline`                     |
| **Check-in**                           | —               | Acción del médico al llegar a su consultorio (→ `available`)                    |
| **Check-out**                          | —               | Acción del médico al retirarse de su consultorio (→ `offline`)                  |
| **Posición en cola** (`queuePosition`) | —               | Lugar ordinal del paciente en la fila de espera (1-based)                       |
| **Urgencia**                           | `priority`      | Mapeo: Alta→`high`, Media→`medium`, Baja→`low` (usa campo existente `priority`) |

### Historias de Usuario

#### HU-01: Registro de turno con urgencia

```
Como:        Recepcionista
Quiero:      Registrar un paciente con nivel de urgencia (Alta, Media, Baja)
Para:        Que el sistema priorice la atención según criticidad clínica

Prioridad:   Alta
Estimación:  S (3 pts)
Dependencias: HT-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Registro exitoso con urgencia válida
  Dado que:  la recepcionista tiene el formulario de registro abierto
  Cuando:    ingresa nombre completo, cédula válida (6-12 dígitos) y selecciona urgencia "Alta"
  Entonces:  el sistema acepta el registro (HTTP 202), el turno se persiste con status="waiting",
             priority="high" y timestamp del momento de registro
```

**Error Path**

```gherkin
CRITERIO-1.2: Registro sin urgencia seleccionada es rechazado
  Dado que:  la recepcionista completa nombre y cédula
  Cuando:    intenta enviar el formulario sin seleccionar urgencia
  Entonces:  el sistema muestra error de validación "La prioridad es obligatoria"
             y no persiste el turno (HTTP 400)
```

```gherkin
CRITERIO-1.3: Registro con urgencia inválida es rechazado
  Dado que:  se envía un request al API con priority="critical"
  Cuando:    el backend valida el payload
  Entonces:  responde HTTP 400 con mensaje "La prioridad debe ser alta, media o baja"
```

**Edge Case**

```gherkin
CRITERIO-1.4: Paciente duplicado con turno activo
  Dado que:  un paciente con idCard=123456789 ya tiene un turno en status="waiting"
  Cuando:    la recepcionista intenta registrar otro turno con la misma cédula
  Entonces:  el sistema rechaza el registro con HTTP 409 indicando turno activo existente
```

---

#### HU-02: Visualización de posición en cola

```
Como:        Paciente en sala de espera
Quiero:      Ver en tiempo real mi posición en la cola
Para:        Conocer mi progreso sin preguntar en recepción

Prioridad:   Alta
Estimación:  M (8 pts)
Dependencias: HT-02, HT-03
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**

```gherkin
CRITERIO-2.1: Posición visible tras registro
  Dado que:  el paciente registró su turno con urgencia Media
  Cuando:    consulta su posición en la pantalla de sala de espera
  Entonces:  la pantalla muestra "Posición: 3 de 7" y estado "Esperando"
             ordenado por prioridad (Alta > Media > Baja) y FIFO dentro de la misma prioridad
```

```gherkin
CRITERIO-2.2: Posición se actualiza en tiempo real
  Dado que:  el paciente está en posición 3 de la cola
  Cuando:    el paciente en posición 1 es asignado a un médico
  Entonces:  la posición se actualiza automáticamente a 2 sin recargar la pantalla (vía WebSocket)
```

**Error Path**

```gherkin
CRITERIO-2.3: Reconexión tras pérdida de conexión
  Dado que:  el paciente está viendo su posición en pantalla
  Cuando:    se pierde la conexión WebSocket
  Entonces:  la pantalla muestra indicador "Reconectando..." (🟡) y conserva el último dato conocido,
             al reconectarse se restaura la posición actualizada
```

```gherkin
CRITERIO-2.4: Turno no encontrado o inactivo
  Dado que:  un paciente consulta su posición con una cédula sin turno activo
  Cuando:    se ejecuta la consulta GET /appointments/queue-position/:idCard
  Entonces:  la respuesta indica position=0, status="not_found" con HTTP 200
```

---

#### HU-03: Notificación de asignación de médico

```
Como:        Paciente
Quiero:      Recibir una notificación inmediata en pantalla cuando mi turno sea asignado
Para:        Confirmar que seré atendido y saber a qué consultorio dirigirme

Prioridad:   Alta
Estimación:  XL (13 pts)
Dependencias: HT-04, HT-05, HT-06
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**

```gherkin
CRITERIO-3.1: Notificación inmediata al asignar médico
  Dado que:  el paciente está en sala de espera con turno en status="waiting"
  Cuando:    el motor de asignación empareja al paciente con un médico disponible
  Entonces:  el paciente recibe notificación en pantalla en máximo 2 segundos mostrando:
             nombre del médico, consultorio asignado y hora estimada de atención
```

```gherkin
CRITERIO-3.2: Asignación respeta prioridad y FIFO
  Dado que:  hay 3 pacientes esperando: paciente A (Media, 10:00), paciente B (Alta, 10:05), paciente C (Media, 09:55)
  Cuando:    un médico se hace disponible (check-in)
  Entonces:  el sistema asigna al paciente B (Alta tiene prioridad absoluta),
             si se libera otro médico, asigna al paciente C (misma prioridad que A pero llegó primero)
```

**Error Path**

```gherkin
CRITERIO-3.3: Sin médico disponible, turno permanece en espera
  Dado que:  hay pacientes en status="waiting"
  Cuando:    el motor de asignación ejecuta y todos los médicos están busy u offline
  Entonces:  los turnos permanecen en status="waiting" sin modificación,
             no se emite notificación de asignación
```

```gherkin
CRITERIO-3.4: Sin asignación no hay notificación
  Dado que:  un paciente tiene status="waiting"
  Cuando:    no hay asignación pendiente para ese paciente
  Entonces:  no se muestra notificación de llamado en su pantalla
```

**Edge Case**

```gherkin
CRITERIO-3.5: Auditoría de asignación
  Dado que:  se asigna el turno del paciente al Dr. García en consultorio 3
  Cuando:    la asignación se completa
  Entonces:  queda registro auditable con: timestamp, appointmentId, doctorId, doctorName,
             office, priority del paciente, posición que tenía en la cola
```

```gherkin
CRITERIO-3.6: Resiliencia ante fallo del broker
  Dado que:  el sistema de mensajería (RabbitMQ) falla temporalmente
  Cuando:    una asignación se completa pero el evento no puede publicarse
  Entonces:  se aplican reintentos automáticos (máximo 3),
             si se agotan, el mensaje se envía a DLQ para reprocesamiento manual,
             el turno del paciente no se pierde (permanece asignado en BD)
```

### Reglas de Negocio

1. **Prioridad obligatoria**: Todo turno debe tener `priority` con valor `high`, `medium` o `low`. No se permite registrar sin prioridad.
2. **Ordenamiento de cola**: Alta (`high`, peso 1) > Media (`medium`, peso 2) > Baja (`low`, peso 3). Empate se rompe por `timestamp` ascendente (FIFO).
3. **Solo médicos disponibles**: La asignación solo puede hacerse a médicos con `status=available`. Si no hay médicos disponibles, el turno permanece en `waiting`.
4. **Un paciente, un turno activo**: No se permite más de un turno activo (status ≠ `completed`) por `idCard`.
5. **Transición de estado del médico**: Al asignarle un paciente, el médico pasa a `busy`. Al completarse/expirar el turno, vuelve a `available`.
6. **Asignación vincula médico y consultorio**: Al asignar, el turno registra `doctorId`, `doctorName` y `office` (consultorio donde está el médico).
7. **Rango fijo de consultorios**: Los médicos solo pueden registrarse en consultorios `1`, `2`, `3`, `4` o `5`.
8. **Latencia de notificación**: La notificación debe llegar al paciente en ≤ 2 segundos desde la asignación (end-to-end).
9. **Auditoría completa**: Cada decisión de asignación genera un registro auditable con timestamp, IDs y contexto.
10. **Resiliencia**: Si el broker falla, los turnos no se pierden. Reintentos + DLQ protegen la entrega del evento.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad       | Almacén                  | Cambios        | Descripción                                           |
| ------------- | ------------------------ | -------------- | ----------------------------------------------------- |
| `Doctor`      | colección `doctors`      | **Nueva**      | Médico registrado con disponibilidad y consultorio    |
| `Appointment` | colección `appointments` | **Modificada** | Se agregan campos `doctorId`, `doctorName`            |
| `AuditLog`    | colección `audit_logs`   | **Nueva**      | Registro de auditoría por cada decisión de asignación |

#### Campos del modelo — Doctor (nuevo)

| Campo       | Tipo     | Obligatorio | Validación                           | Descripción                     |
| ----------- | -------- | ----------- | ------------------------------------ | ------------------------------- |
| `_id`       | ObjectId | sí          | auto-generado                        | ID de MongoDB                   |
| `name`      | string   | sí          | max 100 chars, no vacío              | Nombre completo del médico      |
| `specialty` | string   | sí          | max 100 chars, no vacío              | Especialidad médica             |
| `office`    | string   | sí          | enum: `1`, `2`, `3`, `4`, `5`        | Consultorio asignado al médico  |
| `status`    | string   | sí          | enum: `available`, `busy`, `offline` | Estado de disponibilidad actual |
| `createdAt` | Date     | sí          | auto (timestamps: true)              | Fecha de registro               |
| `updatedAt` | Date     | sí          | auto (timestamps: true)              | Última modificación             |

#### Índices — Doctor

| Índice     | Campos          | Justificación                                                      |
| ---------- | --------------- | ------------------------------------------------------------------ |
| `status_1` | `{ status: 1 }` | Query frecuente: "médicos disponibles" para el motor de asignación |
| `office_1` | `{ office: 1 }` | Búsqueda por consultorio                                           |

#### Campos nuevos en Appointment (modificación)

| Campo        | Tipo           | Obligatorio | Validación               | Descripción                                               |
| ------------ | -------------- | ----------- | ------------------------ | --------------------------------------------------------- |
| `doctorId`   | string \| null | no          | referencia a Doctor.\_id | ID del médico asignado                                    |
| `doctorName` | string \| null | no          | max 100 chars            | Nombre del médico (desnormalizado para consultas rápidas) |

> **Nota**: `office` ya existe en el schema actual. Ahora se llenará automáticamente desde `doctor.office` en lugar de un número secuencial.

#### Campos del modelo — AuditLog (nuevo)

| Campo           | Tipo     | Obligatorio | Validación                                                                                   | Descripción                                                                |
| --------------- | -------- | ----------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `_id`           | ObjectId | sí          | auto-generado                                                                                | ID de MongoDB                                                              |
| `action`        | string   | sí          | enum: `APPOINTMENT_ASSIGNED`, `APPOINTMENT_COMPLETED`, `DOCTOR_CHECK_IN`, `DOCTOR_CHECK_OUT` | Tipo de acción auditada                                                    |
| `appointmentId` | string   | no          | —                                                                                            | ID del turno involucrado                                                   |
| `doctorId`      | string   | no          | —                                                                                            | ID del médico involucrado                                                  |
| `details`       | object   | sí          | —                                                                                            | Contexto: patientIdCard, doctorName, office, priority, queuePosition, etc. |
| `timestamp`     | number   | sí          | epoch ms                                                                                     | Momento exacto de la acción                                                |
| `createdAt`     | Date     | sí          | auto                                                                                         | Fecha de creación del registro                                             |

#### Índice — AuditLog

| Índice                  | Campos                         | Justificación                                                   |
| ----------------------- | ------------------------------ | --------------------------------------------------------------- |
| `action_1_timestamp_-1` | `{ action: 1, timestamp: -1 }` | Consulta de auditoría por tipo de acción, más recientes primero |
| `appointmentId_1`       | `{ appointmentId: 1 }`         | Auditoría por turno específico                                  |

#### Evolución de AppointmentEventPayload (tipos compartidos)

```typescript
// types/appointment-event.ts — Producer y Consumer
export interface AppointmentEventPayload {
  id: string;
  fullName: string;
  idCard: number;
  office: string | null;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  timestamp: number;
  completedAt?: number;
  doctorId: string | null; // NUEVO
  doctorName: string | null; // NUEVO
}
```

#### Nuevo DTO — QueuePositionResponse

```typescript
export interface QueuePositionResponse {
  idCard: number;
  position: number; // 1-based. 0 si no está en cola
  total: number; // total de pacientes en waiting
  status: AppointmentStatus | "not_found";
  priority: AppointmentPriority | null;
}
```

### API Endpoints

#### Endpoints Existentes — Modificaciones

##### POST /appointments (Producer)

- **Cambio**: Hacer `priority` obligatorio en `CreateAppointmentDto` (actualmente es opcional, default `medium`).
- **Validación**: Si no se envía `priority`, retornar HTTP 400.

##### GET /appointments (Producer)

- **Cambio**: Incluir `doctorId` y `doctorName` en `AppointmentResponseDto`.

##### GET /appointments/:idCard (Producer)

- **Sin cambios funcionales**, solo incluir nuevos campos en respuesta.

#### Endpoints Nuevos — Doctor Management (Producer)

##### POST /doctors

- **Descripción**: Registra un nuevo médico en el sistema
- **Auth requerida**: no (MVP — sin sistema de roles aún)
- **Request Body**:
  ```json
  {
    "name": "Dr. Juan García",
    "specialty": "Medicina General",
    "office": "3"
  }
  ```
- **Response 201**:
  ```json
  {
    "id": "ObjectId",
    "name": "Dr. Juan García",
    "specialty": "Medicina General",
    "office": "3",
    "status": "offline",
    "createdAt": "iso8601",
    "updatedAt": "iso8601"
  }
  ```
- **Response 400**: campos obligatorios faltantes o inválidos
- **Response 409**: ya existe un médico asignado a ese consultorio

##### GET /doctors

- **Descripción**: Lista todos los médicos registrados con su estado actual
- **Auth requerida**: no
- **Query Params opcionales**: `?status=available` (filtro por estado)
- **Response 200**:
  ```json
  [
    {
      "id": "ObjectId",
      "name": "Dr. Juan García",
      "specialty": "Medicina General",
      "office": "3",
      "status": "available",
      "createdAt": "iso8601",
      "updatedAt": "iso8601"
    }
  ]
  ```

##### GET /doctors/:id

- **Descripción**: Obtiene un médico por ID
- **Response 200**: médico completo
- **Response 404**: no encontrado

##### PATCH /doctors/:id/check-in

- **Descripción**: El médico se reporta disponible (llega a su consultorio)
- **Auth requerida**: no
- **Request Body**: vacío
- **Response 200**:
  ```json
  {
    "id": "ObjectId",
    "name": "Dr. Juan García",
    "status": "available",
    "office": "3",
    "message": "Médico registrado como disponible"
  }
  ```
- **Response 404**: médico no encontrado
- **Response 409**: médico ya está en estado `available`
- **Efecto colateral**: Dispara evento `DoctorCheckedIn` en RabbitMQ que activa el motor de asignación en el Consumer (asignación reactiva, no solo por scheduler)

##### PATCH /doctors/:id/check-out

- **Descripción**: El médico se reporta no disponible (se retira)
- **Auth requerida**: no
- **Request Body**: vacío
- **Response 200**:
  ```json
  {
    "id": "ObjectId",
    "name": "Dr. Juan García",
    "status": "offline",
    "message": "Médico registrado como no disponible"
  }
  ```
- **Response 404**: médico no encontrado
- **Response 409**: médico tiene paciente asignado (status=`busy`), no puede hacer check-out

#### Endpoints Nuevos — Queue Position (Producer)

##### GET /appointments/queue-position/:idCard

- **Descripción**: Obtiene la posición en cola de un paciente por su cédula
- **Auth requerida**: no
- **Response 200** (en cola):
  ```json
  {
    "idCard": 123456789,
    "position": 3,
    "total": 7,
    "status": "waiting",
    "priority": "high"
  }
  ```
- **Response 200** (no en cola):
  ```json
  {
    "idCard": 123456789,
    "position": 0,
    "total": 7,
    "status": "not_found",
    "priority": null
  }
  ```

### Diseño Frontend

#### Modelo de dominio — Evolución

```typescript
// domain/Appointment.ts — agregar campos
export interface Appointment {
  // ... campos existentes
  doctorId: string | null; // NUEVO
  doctorName: string | null; // NUEVO
}

// domain/Doctor.ts — NUEVO
export type DoctorStatus = "available" | "busy" | "offline";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  office: string;
  status: DoctorStatus;
}

// domain/QueuePosition.ts — NUEVO
export interface QueuePosition {
  idCard: number;
  position: number;
  total: number;
  status: string;
  priority: string | null;
}
```

#### Componentes modificados

| Componente                    | Archivo                                                                  | Cambio     | Descripción                                                      |
| ----------------------------- | ------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------- |
| `CalledAppointmentCard`       | `components/AppointmentCard/CalledAppointmentCard.tsx`                   | Modificado | Mostrar `doctorName` además de `office`                          |
| `WaitingAppointmentCard`      | `components/AppointmentCard/WaitingAppointmentCard.tsx`                  | Modificado | Mostrar posición en cola                                         |
| `AppointmentRegistrationForm` | `components/AppointmentRegistrationForm/AppointmentRegistrationForm.tsx` | Modificado | Hacer `priority` obligatorio (sin valor por defecto de "medium") |

#### Componentes nuevos

| Componente               | Archivo                                                        | Props principales                                 | Descripción                                                                                       |
| ------------------------ | -------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `AssignmentNotification` | `components/AssignmentNotification/AssignmentNotification.tsx` | `appointment: Appointment, onDismiss: () => void` | Toast/banner que aparece cuando un turno pasa de waiting → called, mostrando médico + consultorio |
| `QueuePositionBadge`     | `components/QueuePositionBadge/QueuePositionBadge.tsx`         | `position: number, total: number`                 | Badge que muestra "Posición X de Y"                                                               |
| `DoctorInfo`             | `components/DoctorInfo/DoctorInfo.tsx`                         | `doctorName: string, office: string`              | Bloque informativo de médico asignado                                                             |

#### Páginas — Sin páginas nuevas

La funcionalidad se integra en la página existente de turnos. No se crean rutas nuevas.

#### Hooks nuevos

| Hook               | Archivo                     | Retorna                               | Descripción                                                              |
| ------------------ | --------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `useQueuePosition` | `hooks/useQueuePosition.ts` | `{ position, total, loading, error }` | Consulta posición en cola por idCard, se actualiza con eventos WebSocket |

#### Services (llamadas API) — nuevos

| Función                    | Archivo                          | Endpoint                                   |
| -------------------------- | -------------------------------- | ------------------------------------------ |
| `getQueuePosition(idCard)` | `services/appointmentService.ts` | `GET /appointments/queue-position/:idCard` |
| `getDoctors(status?)`      | `services/doctorService.ts`      | `GET /doctors?status=`                     |

#### Evolución del puerto RealTimePort

El `RealTimePort` existente ya soporta `onAppointmentUpdated` que recibe `Appointment`. Al extender el payload con `doctorId`/`doctorName`, las notificaciones de asignación llegarán automáticamente. El nuevo componente `AssignmentNotification` reacciona cuando `status` cambia de `waiting` a `called` en el callback `onAppointmentUpdated`.

### Arquitectura y Dependencias

#### Backend — Producer

- **Nuevo módulo**: `DoctorModule` (controller, service, repository, DTOs, schema)
- **Nuevo endpoint**: queue-position en `AppointmentQueryController`
- **Evolución**: `AppointmentResponseDto` incluye `doctorId`/`doctorName`
- **Nuevo evento RabbitMQ**: `doctor_checked_in` (Producer → Consumer) para trigger reactivo de asignación
- **Paquetes nuevos**: ninguno

#### Backend — Consumer

- **Nuevo schema**: `Doctor` (Mongoose) — solo lectura para consulta de disponibilidad
- **Nuevo repository**: `DoctorReadRepository` (buscar médicos disponibles)
- **Evolución de use case**: `AssignAvailableOfficesUseCaseImpl` → `AssignDoctorUseCaseImpl` (asignar a médico, no a office numérico)
- **Nuevo use case**: Manejar evento `doctor_checked_in` para trigger asignación inmediata
- **Evolución de entity**: `Appointment` agrega `doctorId`, `doctorName`
- **Nuevo schema**: `AuditLog` + repository para persistir registros de auditoría
- **Evolución de policy**: `ConsultationPolicy` → evolucionar lógica de "oficina disponible" a "médico disponible"
- **Paquetes nuevos**: ninguno

#### Frontend

- **Extensión de dominio**: `Appointment` type + nuevos tipos `Doctor`, `QueuePosition`
- **Nuevos componentes**: `AssignmentNotification`, `QueuePositionBadge`, `DoctorInfo`
- **Nuevo hook**: `useQueuePosition`
- **Nuevos services**: `appointmentService.ts` (queue position), `doctorService.ts`
- **CSS Modules**: Archivos `.module.css` para componentes nuevos
- **Paquetes nuevos**: ninguno

### Notas de Implementación

1. **Migración gradual del motor de asignación**: El `AssignAvailableOfficesUseCaseImpl` actual asigna por office numérico. La evolución a `AssignDoctorUseCaseImpl` reemplaza la lógica de "offices libres" por "médicos con status=available". El rango de negocio válido para consultorios queda acotado a `1..5`, y la variable de entorno `TOTAL_OFFICES` deja de ser el único criterio al complementarse con la colección `doctors`.

2. **Desnormalización de doctorName**: Se almacena `doctorName` en el documento Appointment para evitar un JOIN (lookup) en cada consulta de la cola. Aceptamos el trade-off de desnormalización porque el nombre del médico cambia raramente.

3. **Evento reactivo `doctor_checked_in`**: Cuando un médico hace check-in, el Producer publica un evento RabbitMQ `doctor_checked_in`. El Consumer lo consume y ejecuta inmediatamente `AssignDoctorUseCase.execute()`. Esto complementa el scheduler periódico existente para reacción instantánea.

4. **Compatibilidad hacia atrás**: Los turnos existentes sin `doctorId`/`doctorName` (migrados) tendrán estos campos como `null`. El frontend maneja este caso mostrando "Médico no asignado" o el `office` existente como fallback.

5. **Doctor como entidad compartida**: La colección `doctors` es compartida entre Producer (escritura vía API) y Consumer (lectura para asignación), igual que la colección `appointments`. El Producer gestiona el CRUD de médicos; el Consumer solo consulta disponibilidad.

6. **Latencia <2s**: El camino crítico es: Scheduler/Event → AssignDoctor → save(appointment) → AppointmentAssignedEvent → NotificationPort → RabbitMQ → Producer EventsController → WebSocket broadcast → Frontend render. El target de 2s es alcanzable dado que la infraestructura actual (RabbitMQ + WS) ya opera en sub-segundo.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend — Producer

#### Modelo Doctor

- [ ] Crear schema `Doctor` en `producer/src/schemas/doctor.schema.ts`
- [ ] Crear DTOs: `CreateDoctorDto`, `DoctorResponseDto`, `CheckInResponseDto`
- [ ] Crear `DoctorRepository` (CRUD + findByStatus)
- [ ] Crear `DoctorService` (lógica de check-in/check-out con validación de estados)
- [ ] Crear `DoctorController` — endpoints CRUD + check-in + check-out
- [ ] Crear `DoctorModule` y registrar en `AppModule`

#### Evento doctor_checked_in

- [ ] Publicar evento `doctor_checked_in` en RabbitMQ cuando un médico hace check-in
- [ ] Incluir `doctorId` en el payload del evento

#### Evolución de Appointment

- [ ] Agregar `doctorId`, `doctorName` al schema `Appointment` del Producer
- [ ] Actualizar `AppointmentResponseDto` para incluir `doctorId`, `doctorName`
- [ ] Actualizar `AppointmentMapper` para mapear nuevos campos
- [ ] Actualizar `AppointmentEventPayload` con `doctorId`, `doctorName`

#### Endpoint Queue Position

- [ ] Crear método `getQueuePosition(idCard)` en queryAppointmentsUseCase
- [ ] Agregar endpoint `GET /appointments/queue-position/:idCard` en `AppointmentQueryController`
- [ ] Crear DTO `QueuePositionResponseDto`

#### Validación de priority obligatorio

- [ ] Actualizar `CreateAppointmentDto` en Producer: hacer `priority` obligatorio (quitar `@IsOptional()`)

### Backend — Consumer

#### Modelo Doctor (solo lectura)

- [ ] Crear schema `Doctor` en `consumer/src/schemas/doctor.schema.ts`
- [ ] Crear interfaz `DoctorReadRepository` en `domain/ports/outbound/`
- [ ] Crear `MongooseDoctorReadRepository` en `infrastructure/persistence/`
- [ ] Registrar en módulos de inyección de dependencias

#### Evolución de Appointment Entity

- [ ] Agregar `doctorId: string | null` y `doctorName: string | null` a `Appointment` entity
- [ ] Agregar `doctorId`, `doctorName` al schema `Appointment` del Consumer
- [ ] Actualizar `AppointmentFactory` para manejar nuevos campos
- [ ] Actualizar mapper `infrastructure/persistence/appointment.mapper.ts`

#### Motor de Asignación (refactor)

- [ ] Crear `AssignDoctorUseCaseImpl` que reemplace lógica de `AssignAvailableOfficesUseCaseImpl`
- [ ] Consultar médicos con `status=available` desde `DoctorReadRepository`
- [ ] Asignar paciente → médico (doctorId, doctorName, office)
- [ ] Actualizar `doctor.status` a `busy` tras asignar
- [ ] Mantener lógica de prioridad + FIFO existente
- [ ] Evolucionar `ConsultationPolicy` para validar disponibilidad de médico

#### Evento doctor_checked_in (Consumer)

- [ ] Crear handler para evento `doctor_checked_in` en Consumer
- [ ] Al recibir evento, ejecutar `AssignDoctorUseCase.execute()` inmediatamente

#### Completar turno → liberar médico

- [ ] Evolucionar `CompleteExpiredAppointmentsUseCaseImpl` para cambiar `doctor.status` a `available` cuando el turno se completa/expira
- [ ] Crear `DoctorWriteRepository` o agregar método `updateStatus` en adapter existente

#### Validación de priority obligatorio

- [ ] Actualizar `CreateAppointmentDto` en Consumer: hacer `priority` obligatorio

#### Modelo AuditLog

- [ ] Crear schema `AuditLog` en `consumer/src/schemas/audit-log.schema.ts`
- [ ] Crear `AuditLogRepository` (write-only: insert)
- [ ] Crear `AuditPort` en `domain/ports/outbound/`
- [ ] Crear `MongooseAuditAdapter` en `infrastructure/persistence/`
- [ ] Registrar auditoría en `AppointmentAssignedHandler` (tras asignación exitosa)
- [ ] Incluir en audit: timestamp, appointmentId, doctorId, doctorName, office, priority, queuePosition

### Frontend

#### Modelo de Dominio

- [ ] Agregar `doctorId`, `doctorName` a interfaz `Appointment` en `domain/Appointment.ts`
- [ ] Crear `domain/Doctor.ts` con interfaz `Doctor` y tipo `DoctorStatus`
- [ ] Crear `domain/QueuePosition.ts` con interfaz `QueuePosition`

#### Servicios API

- [ ] Crear `services/doctorService.ts` con `getDoctors(status?)`
- [ ] Crear función `getQueuePosition(idCard)` en `services/appointmentService.ts`

#### Componentes nuevos

- [ ] Crear `components/AssignmentNotification/AssignmentNotification.tsx` + `.module.css`
- [ ] Crear `components/QueuePositionBadge/QueuePositionBadge.tsx` + `.module.css`
- [ ] Crear `components/DoctorInfo/DoctorInfo.tsx` + `.module.css`

#### Componentes modificados

- [ ] Modificar `CalledAppointmentCard` para mostrar `doctorName` y `office`
- [ ] Modificar `WaitingAppointmentCard` para mostrar posición en cola
- [ ] Modificar `AppointmentRegistrationForm` para hacer `priority` obligatorio (sin valor por defecto)

#### Hooks

- [ ] Crear `hooks/useQueuePosition.ts` que consulte posición y se actualice vía WebSocket

#### Integración de notificación de asignación

- [ ] En `useAppointmentsWebSocket`, detectar cambio waiting→called y mostrar `AssignmentNotification`
- [ ] Incluir sonido de notificación (reutilizar `AudioService` existente)

### Tests Backend

#### Tests — Doctor (Producer)

- [ ] `test_doctor_create_success` — happy path registro médico
- [ ] `test_doctor_create_duplicate_office_conflict` — HTTP 409 consultorio duplicado
- [ ] `test_doctor_check_in_success` — happy path check-in
- [ ] `test_doctor_check_in_already_available_conflict` — HTTP 409
- [ ] `test_doctor_check_out_success` — happy path check-out
- [ ] `test_doctor_check_out_busy_conflict` — HTTP 409 médico ocupado
- [ ] `test_doctor_list_filter_by_status` — filtro por estado

#### Tests — Queue Position (Producer)

- [ ] `test_queue_position_found` — posición correcta en cola
- [ ] `test_queue_position_not_found` — idCard sin turno activo
- [ ] `test_queue_position_ordering` — respeta prioridad + FIFO

#### Tests — Motor de Asignación (Consumer)

- [ ] `test_assign_doctor_to_highest_priority_patient` — Alta > Media > Baja
- [ ] `test_assign_fifo_within_same_priority` — FIFO por timestamp
- [ ] `test_assign_no_available_doctors` — sin médicos, turnos quedan en waiting
- [ ] `test_assign_sets_doctor_status_busy` — médico pasa a busy tras asignar
- [ ] `test_complete_releases_doctor` — completar turno libera médico (→ available)
- [ ] `test_doctor_checked_in_triggers_assignment` — evento reactivo funciona

#### Tests — Auditoría (Consumer)

- [ ] `test_audit_log_created_on_assignment` — registro de auditoría se persiste
- [ ] `test_audit_log_contains_required_fields` — todos los campos obligatorios presentes

#### Tests — Validación priority obligatorio

- [ ] `test_create_appointment_without_priority_returns_400` — rechazo sin prioridad

### Tests Frontend

- [ ] `test_CalledAppointmentCard_shows_doctor_name` — muestra nombre del médico
- [ ] `test_WaitingAppointmentCard_shows_queue_position` — muestra posición
- [ ] `test_AssignmentNotification_renders_on_status_change` — notificación al cambiar a called
- [ ] `test_AssignmentNotification_shows_doctor_and_office` — muestra datos correctos
- [ ] `test_QueuePositionBadge_renders_position` — badge muestra "X de Y"
- [ ] `test_useQueuePosition_returns_position` — hook retorna posición
- [ ] `test_registration_form_requires_priority` — formulario valida prioridad obligatoria

### QA

- [ ] Validar flujo E2E: registro → cola → check-in médico → asignación → notificación en <2s
- [ ] Validar ordenamiento prioridad + FIFO con múltiples pacientes
- [ ] Validar reconexión WebSocket conserva último dato
- [ ] Validar auditoría completa de asignación
- [ ] Validar que médico en `busy` no recibe nuevos pacientes
- [ ] Validar check-out bloqueado si el médico tiene paciente activo
- [ ] Validar resiliencia: apagar RabbitMQ → reiniciar → verificar DLQ y reprocesamiento
- [ ] Validar posición en cola se actualiza en tiempo real
- [ ] Validar que sin médicos disponibles los turnos permanecen en waiting
