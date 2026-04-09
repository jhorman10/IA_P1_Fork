# Test Plan: SPEC-003 — Sistema Inteligente de Gestión de Turnos Médicos

## 1. Objective

Validar que el Sistema Inteligente de Gestión de Turnos Médicos cumple los criterios de aceptación definidos en SPEC-003, garantizando que:

- La asignación de pacientes se realiza exclusivamente a médicos físicamente disponibles (`status=available`), eliminando asignaciones a consultorios vacíos.
- El motor de asignación respeta la prioridad clínica (Alta > Media > Baja) y FIFO dentro del mismo nivel de urgencia.
- Los pacientes visualizan en tiempo real su posición en cola y reciben notificación de asignación (médico + consultorio) en ≤2 segundos.
- La entidad `Doctor` con ciclo check-in/check-out opera correctamente y dispara asignación reactiva.
- Cada decisión de asignación genera un registro auditable completo en la colección `audit_logs`.
- El sistema es resiliente ante caídas del broker (reintentos + DLQ) sin pérdida de turnos.

## 2. Description

SPEC-003 evoluciona el sistema de gestión de turnos médicos de un modelo basado en consultorios abstractos (`1..5`) a un modelo centrado en médicos reales con disponibilidad verificable. Los cambios abarcan tres capas:

- **Backend Producer**: nuevo módulo `Doctor` (CRUD + check-in/check-out), endpoint de posición en cola (`GET /appointments/queue-position/:idCard`), publicación de evento `doctor_checked_in`, evolución de `AppointmentResponseDto` con `doctorId`/`doctorName`, y validación de `priority` obligatoria.
- **Backend Consumer**: refactor del motor de asignación (`AssignAvailableOfficesUseCaseImpl` → `AssignDoctorUseCaseImpl`), schema `Doctor` de solo lectura, schema `AuditLog`, handler reactivo para `doctor_checked_in`, y liberación de médico al completar turno.
- **Frontend**: nuevos componentes (`AssignmentNotification`, `QueuePositionBadge`, `DoctorInfo`), hook `useQueuePosition`, servicios `doctorService` y `getQueuePosition`, y modificaciones a `CalledAppointmentCard`, `WaitingAppointmentCard` y `AppointmentRegistrationForm`.

**Stack tecnológico**: NestJS (Producer + Consumer), MongoDB/Mongoose, RabbitMQ, Socket.IO (WebSocket), Next.js/React (Frontend), Jest + Testing Library.

## 3. Scope

### 3.1 In Scope

| Área          | Funcionalidad                                                            |
| ------------- | ------------------------------------------------------------------------ |
| HU-01         | Registro de turno con urgencia obligatoria (Alta, Media, Baja)           |
| HU-02         | Visualización de posición en cola en tiempo real vía WebSocket           |
| HU-03         | Notificación de asignación de médico en pantalla en ≤2s                  |
| HT-01         | Persistencia y validación de urgencia (`priority` obligatorio)           |
| HT-02         | Proyección de cola consultable ordenada por prioridad + FIFO             |
| HT-03         | Canal WebSocket con reconexión y conservación de último estado           |
| HT-04         | Motor de asignación por urgencia y disponibilidad de médico              |
| HT-05         | Publicación confiable de evento `AppointmentAssigned` (reintentos + DLQ) |
| HT-06         | Notificación visible y auditable al paciente                             |
| Doctor Module | CRUD de médicos, check-in, check-out, transiciones de estado             |
| Audit Module  | Registro auditable de cada decisión de asignación                        |
| Regresión     | Flujo legado de turnos, WebSocket existente, pantalla pública            |

### 3.2 Out of Scope

- Rediseño visual completo de la plataforma.
- Diagnóstico clínico automatizado o triage algorítmico.
- Gestión de recursos humanos (vacaciones, nóminas, bloqueos de agenda).
- Elección de médico por parte del paciente.
- Autenticación/autorización de endpoints de Doctor (MVP sin roles).
- Signup público, recuperación de password, MFA.
- Protección del canal WebSocket con `idToken`.
- Performance testing con k6 (cubierto por plan de performance separado).

## 4. User Stories & Acceptance Criteria

| User Story                                      | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HU-01**: Registro de turno con urgencia       | - CRITERIO-1.1: Registro exitoso con urgencia válida → HTTP 202, `status=waiting`, `priority=high`, timestamp registrado<br>- CRITERIO-1.2: Registro sin urgencia → error de validación "La prioridad es obligatoria", HTTP 400<br>- CRITERIO-1.3: Urgencia inválida (`priority=critical`) → HTTP 400 "La prioridad debe ser alta, media o baja"<br>- CRITERIO-1.4: Paciente duplicado con turno activo → HTTP 409 indicando turno activo existente                                                                                                                                             |
| **HU-02**: Visualización de posición en cola    | - CRITERIO-2.1: Posición visible tras registro → muestra "Posición: X de Y" ordenada por prioridad + FIFO<br>- CRITERIO-2.2: Actualización en tiempo real → posición se actualiza sin recargar (vía WebSocket)<br>- CRITERIO-2.3: Reconexión tras pérdida → indicador "Reconectando..." (🟡), conserva último dato, restaura al reconectar<br>- CRITERIO-2.4: Turno no encontrado → `position=0`, `status=not_found`, HTTP 200                                                                                                                                                                  |
| **HU-03**: Notificación de asignación de médico | - CRITERIO-3.1: Notificación inmediata ≤2s mostrando nombre de médico, consultorio y hora estimada<br>- CRITERIO-3.2: Asignación respeta prioridad (Alta primero) y FIFO (empate por timestamp)<br>- CRITERIO-3.3: Sin médico disponible → turnos permanecen en `waiting`, sin notificación<br>- CRITERIO-3.4: Sin asignación pendiente → no se muestra notificación<br>- CRITERIO-3.5: Auditoría completa: timestamp, appointmentId, doctorId, doctorName, office, priority, queuePosition<br>- CRITERIO-3.6: Resiliencia ante fallo del broker → reintentos (máx. 3), DLQ, turno no se pierde |

## 5. Test Scenarios

### 5.1 Positive Scenarios

#### Registro de Turno (HU-01, HT-01)

| ID     | Escenario                    | Entrada                                                           | Resultado esperado                                                                    |
| ------ | ---------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| POS-01 | Registro con prioridad Alta  | `fullName="Juan Pérez"`, `idCard=123456789`, `priority="high"`    | HTTP 202, turno creado con `status=waiting`, `priority=high`, `timestamp` del momento |
| POS-02 | Registro con prioridad Media | `fullName="María López"`, `idCard=987654321`, `priority="medium"` | HTTP 202, turno persistido correctamente                                              |
| POS-03 | Registro con prioridad Baja  | `fullName="Carlos Ruiz"`, `idCard=555666777`, `priority="low"`    | HTTP 202, turno persistido correctamente                                              |

#### Posición en Cola (HU-02, HT-02)

| ID     | Escenario                                      | Entrada                                                            | Resultado esperado                                                       |
| ------ | ---------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| POS-04 | Consulta de posición existente                 | `GET /appointments/queue-position/123456789`                       | HTTP 200: `position=3`, `total=7`, `status="waiting"`, `priority="high"` |
| POS-05 | Posición respeta prioridad                     | 3 pacientes: A (medium, 10:00), B (high, 10:05), C (medium, 09:55) | Orden: B(1), C(2), A(3)                                                  |
| POS-06 | Posición se actualiza al asignar otro paciente | Paciente en posición 3, se asigna el de posición 1                 | Posición actualiza a 2 sin recarga                                       |

#### WebSocket y Tiempo Real (HT-03)

| ID     | Escenario                            | Entrada                              | Resultado esperado                                                           |
| ------ | ------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------- |
| POS-07 | Recepción de evento de actualización | Turno cambia de `waiting` → `called` | Frontend recibe payload con `doctorId`, `doctorName`, `office` via WebSocket |
| POS-08 | Reconexión exitosa                   | Desconexión temporal del WS          | Cliente reconecta automáticamente, posición se restaura con dato actual      |

#### Motor de Asignación (HU-03, HT-04)

| ID     | Escenario                        | Entrada                                          | Resultado esperado                                                             |
| ------ | -------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| POS-09 | Asignación a médico disponible   | Paciente `waiting` + médico `available`          | Turno actualizado con `doctorId`, `doctorName`, `office`; médico pasa a `busy` |
| POS-10 | Prioridad Alta sobre Media       | 2 pacientes (high + medium), 1 médico disponible | Se asigna el paciente `high` primero                                           |
| POS-11 | FIFO dentro de misma prioridad   | 2 pacientes medium (09:55 y 10:00), 1 médico     | Se asigna el de 09:55 primero                                                  |
| POS-12 | Asignación reactiva por check-in | Médico hace check-in, hay pacientes en `waiting` | Evento `doctor_checked_in` → asignación inmediata sin esperar scheduler        |
| POS-13 | Completar turno libera médico    | Turno se completa                                | Médico vuelve a `status=available`, queda libre para nueva asignación          |

#### Módulo Doctor

| ID     | Escenario             | Entrada                                                | Resultado esperado                                                   |
| ------ | --------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| POS-14 | Crear médico          | `POST /doctors` con name, specialty, office="3"        | HTTP 201, status inicial `offline`                                   |
| POS-15 | Listar médicos        | `GET /doctors`                                         | HTTP 200, array con todos los médicos                                |
| POS-16 | Filtrar por estado    | `GET /doctors?status=available`                        | HTTP 200, solo médicos con `status=available`                        |
| POS-17 | Obtener médico por ID | `GET /doctors/:id`                                     | HTTP 200, datos completos del médico                                 |
| POS-18 | Check-in exitoso      | `PATCH /doctors/:id/check-in` (doctor en `offline`)    | HTTP 200, status → `available`, evento `doctor_checked_in` publicado |
| POS-19 | Check-out exitoso     | `PATCH /doctors/:id/check-out` (doctor en `available`) | HTTP 200, status → `offline`                                         |

#### Publicación de Evento (HT-05)

| ID     | Escenario                                | Entrada                          | Resultado esperado                                                              |
| ------ | ---------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| POS-20 | Evento AppointmentAssigned publicado     | Asignación exitosa               | Evento publicado en RabbitMQ con `doctorId`, `doctorName`, `office`, `priority` |
| POS-21 | Reintento exitoso tras fallo transitorio | Fallo de red temporal en publish | Reintento automático entrega el mensaje correctamente                           |

#### Notificación y Auditoría (HT-06)

| ID     | Escenario                    | Entrada                       | Resultado esperado                                                                                                                                          |
| ------ | ---------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POS-22 | Notificación en pantalla ≤2s | Asignación se completa        | Paciente ve notificación con médico + consultorio en ≤2 segundos                                                                                            |
| POS-23 | Registro de auditoría creado | Asignación exitosa            | Documento en `audit_logs` con: `action=APPOINTMENT_ASSIGNED`, `timestamp`, `appointmentId`, `doctorId`, `doctorName`, `office`, `priority`, `queuePosition` |
| POS-24 | Sonido de notificación       | Turno cambia waiting → called | `AudioService` reproduce sonido de notificación                                                                                                             |

#### Frontend

| ID     | Escenario                               | Entrada                                      | Resultado esperado                                         |
| ------ | --------------------------------------- | -------------------------------------------- | ---------------------------------------------------------- |
| POS-25 | CalledAppointmentCard muestra médico    | Turno asignado con `doctorName="Dr. García"` | Tarjeta muestra "Dr. García" y consultorio                 |
| POS-26 | WaitingAppointmentCard muestra posición | Turno en waiting, posición 3 de 7            | Badge muestra "Posición 3 de 7"                            |
| POS-27 | AssignmentNotification se muestra       | Status cambia de `waiting` → `called`        | Toast/banner aparece con datos del médico y consultorio    |
| POS-28 | QueuePositionBadge renderiza            | Props: position=2, total=5                   | Muestra "2 de 5"                                           |
| POS-29 | Hook useQueuePosition retorna datos     | idCard con turno activo                      | Retorna `{ position, total, loading: false, error: null }` |

### 5.2 Negative Scenarios

#### Registro de Turno — Validación

| ID     | Escenario                           | Entrada                                                 | Resultado esperado                                   |
| ------ | ----------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| NEG-01 | Sin prioridad                       | `fullName="Juan"`, `idCard=123456789`, priority omitido | HTTP 400, "La prioridad es obligatoria"              |
| NEG-02 | Prioridad inválida                  | `priority="critical"`                                   | HTTP 400, "La prioridad debe ser alta, media o baja" |
| NEG-03 | Paciente duplicado con turno activo | idCard ya tiene turno en `waiting`                      | HTTP 409, "turno activo existente"                   |
| NEG-04 | Cédula fuera de rango               | `idCard=12345` (5 dígitos)                              | HTTP 400, error de validación                        |
| NEG-05 | Nombre vacío                        | `fullName=""`                                           | HTTP 400, error de validación                        |

#### Posición en Cola

| ID     | Escenario                    | Entrada                                      | Resultado esperado                                            |
| ------ | ---------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| NEG-06 | Turno no encontrado          | `GET /appointments/queue-position/999999999` | HTTP 200, `position=0`, `status="not_found"`, `priority=null` |
| NEG-07 | Turno completado (no activo) | idCard con turno `completed`                 | HTTP 200, `position=0`, `status="not_found"`                  |

#### Módulo Doctor

| ID     | Escenario                        | Entrada                                           | Resultado esperado                                         |
| ------ | -------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| NEG-08 | Consultorio duplicado            | `POST /doctors` con `office="3"` ya asignado      | HTTP 409, "ya existe un médico asignado a ese consultorio" |
| NEG-09 | Consultorio fuera de rango       | `POST /doctors` con `office="6"`                  | HTTP 400, validación de enum                               |
| NEG-10 | Check-in de médico ya disponible | `PATCH /doctors/:id/check-in` (ya en `available`) | HTTP 409, "médico ya está en estado available"             |
| NEG-11 | Check-out de médico ocupado      | `PATCH /doctors/:id/check-out` (en `busy`)        | HTTP 409, "médico tiene paciente asignado"                 |
| NEG-12 | Doctor no encontrado             | `GET /doctors/nonexistent-id`                     | HTTP 404                                                   |
| NEG-13 | Check-in doctor inexistente      | `PATCH /doctors/nonexistent-id/check-in`          | HTTP 404                                                   |
| NEG-14 | Campos obligatorios faltantes    | `POST /doctors` sin `name`                        | HTTP 400                                                   |

#### Motor de Asignación

| ID     | Escenario               | Entrada                                     | Resultado esperado                                           |
| ------ | ----------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| NEG-15 | Sin médicos disponibles | Todos los médicos `busy` u `offline`        | Turnos permanecen en `waiting`, ninguna notificación emitida |
| NEG-16 | Sin pacientes en espera | Médico hace check-in, 0 turnos en `waiting` | No se ejecuta asignación, médico queda en `available`        |

#### Resiliencia (HT-05, HT-06)

| ID     | Escenario                            | Entrada                              | Resultado esperado                                       |
| ------ | ------------------------------------ | ------------------------------------ | -------------------------------------------------------- |
| NEG-17 | Broker caído (3 reintentos agotados) | RabbitMQ inaccesible tras asignación | Mensaje enviado a DLQ, turno permanece asignado en BD    |
| NEG-18 | WebSocket desconectado               | Pérdida de conexión del cliente      | Indicador "Reconectando..." (🟡), último dato conservado |

#### Frontend

| ID     | Escenario                           | Entrada                                | Resultado esperado                                                   |
| ------ | ----------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| NEG-19 | Formulario sin prioridad            | Usuario no selecciona prioridad        | Botón deshabilitado o error de validación visible                    |
| NEG-20 | Sin asignación pendiente            | Turno en `waiting` sin doctor asignado | No se muestra `AssignmentNotification`                               |
| NEG-21 | Appointment sin doctorName (legacy) | `doctorName=null`                      | Fallback: muestra "Médico no asignado" o solo `office`               |
| NEG-22 | Error en fetching de posición       | API retorna error 500                  | Hook retorna `{ error, loading: false }`, UI muestra estado de error |

## 6. Test Strategy

### 6.1 Execution

La estrategia se organiza en cuatro niveles de verificación alineados con la pirámide de testing:

| Nivel                 | Tipo      | Herramienta           | Alcance                                                                        | Automatizado |
| --------------------- | --------- | --------------------- | ------------------------------------------------------------------------------ | :----------: |
| **L1 — Estático**     | White-box | ESLint + TypeScript   | Lint, tipado y build en Producer, Consumer y Frontend                          |      ✅      |
| **L2 — Unitario**     | White-box | Jest                  | Entities, VOs, factories, policies, DTOs, guards, services, hooks, componentes |      ✅      |
| **L3 — Integración**  | White-box | Jest + Supertest      | Controllers con dependencias reales/mock, WebSocket gateway, event handlers    |      ✅      |
| **L4 — E2E**          | Black-box | Jest + Docker Compose | Flujo completo: registro → asignación → notificación con infraestructura real  |      ✅      |
| **L5 — Exploratorio** | Black-box | Manual                | Reconexión WebSocket, latencia ≤2s, UX de notificación, edge cases visuales    |      ❌      |

**Entornos:**

| Entorno | Propósito                                 | Infraestructura                                                               |
| ------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| Local   | Desarrollo y testing unitario/integración | Docker Compose (MongoDB, RabbitMQ)                                            |
| CI      | Pipeline automatizado                     | GitHub Actions (`ci.yml`)                                                     |
| Staging | Validación E2E y exploratoria             | Docker Compose completo (Producer + Consumer + Frontend + MongoDB + RabbitMQ) |

**Ejecución por fase:**

1. **Fase unitaria** (automática en CI): todos los tests L2 de Producer, Consumer y Frontend.
2. **Fase integración** (automática en CI): tests L3 de controllers, gateways y event handlers.
3. **Fase E2E** (manual/staging): flujo completo con infraestructura real.
4. **Fase exploratoria** (manual): escenarios de resiliencia, latencia y UX.

### 6.2 Data Strategy

**Datos de prueba — Backend:**

| Entidad     | Estrategia        | Datos base                                                                                       |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| Doctor      | Factory/Fixture   | 5 médicos: oficinas 1-5, especialidades variadas, status mixtos (`available`, `busy`, `offline`) |
| Appointment | Factory/Fixture   | 10+ turnos con prioridades mixtas (high/medium/low), timestamps escalonados, status variados     |
| AuditLog    | Generado por test | Se valida que se cree automáticamente tras asignación                                            |

**Datos de prueba — Frontend:**

| Entidad       | Estrategia   | Datos base                                                    |
| ------------- | ------------ | ------------------------------------------------------------- |
| Appointment   | Mock/Factory | Turnos en distintos estados con y sin `doctorId`/`doctorName` |
| QueuePosition | Mock         | Posiciones variadas (1/10, 5/5, 0/0 para not_found)           |
| Doctor        | Mock         | Médicos con diferentes status y consultorios                  |

**Datos para E2E:**

- Seed de 3 médicos registrados (consultorios 1, 2, 3).
- Registro secuencial de 5 pacientes con prioridades escalonadas.
- Check-in de médicos para disparar asignación reactiva.

**Limpieza:** cada test suite limpia sus datos al finalizar (`afterEach`/`afterAll`). En E2E, se usa `beforeAll` para seed y `afterAll` para cleanup.

## 7. Risk Matrix

| ID   | Risk Description                                                                                               | Probability (1-5) | Impact (1-5) | Risk Level       | Mitigation                                                                                                                                    |
| ---- | -------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| R-01 | Motor de asignación no respeta prioridad + FIFO correctamente, asignando pacientes en orden incorrecto         | 3                 | 5            | **15 — Alto**    | Tests unitarios exhaustivos con múltiples combinaciones de prioridad y timestamp. Tests de integración con datos ordenados y desordenados.    |
| R-02 | Latencia de notificación >2s end-to-end por overhead en cadena RabbitMQ → WebSocket                            | 3                 | 4            | **12 — Alto**    | Medir latencia en E2E con timestamps. Profiling del path crítico. Establecer alarma si supera 1.5s en staging.                                |
| R-03 | Race condition al asignar mismo médico a dos pacientes concurrentemente                                        | 4                 | 5            | **20 — Crítico** | Validar atomicidad de transición `available→busy` con test de concurrencia. Implementar lock optimista o findOneAndUpdate atómico en MongoDB. |
| R-04 | Evento `doctor_checked_in` se pierde o duplica, causando asignación fantasma o doble                           | 3                 | 4            | **12 — Alto**    | Tests de idempotencia en handler del Consumer. Verificar que asignación duplicada no crea segundo registro.                                   |
| R-05 | Reconexión WebSocket no restaura posición actualizada, mostrando dato obsoleto al paciente                     | 3                 | 3            | **9 — Medio**    | Test exploratorio de desconexión/reconexión. Validar que tras reconectar se envía estado completo actual.                                     |
| R-06 | `doctorName` desnormalizado queda desactualizado si cambia el nombre del médico                                | 2                 | 2            | **4 — Bajo**     | Aceptable por decisión de diseño. Documentar que cambio de nombre no actualiza turnos históricos.                                             |
| R-07 | Turnos legados sin `doctorId`/`doctorName` (null) causan error en frontend                                     | 3                 | 3            | **9 — Medio**    | Tests de renderizado con `doctorName=null`. Verificar fallback "Médico no asignado" en CalledAppointmentCard.                                 |
| R-08 | Fallo de RabbitMQ impide publicación de evento, y reintentos agotan sin llegar a DLQ                           | 2                 | 5            | **10 — Alto**    | Test de integración simulando fallo del broker. Verificar que mensaje llega a DLQ tras 3 reintentos. Monitoreo de DLQ.                        |
| R-09 | Regresión del flujo legado de turnos al refactorizar motor de asignación                                       | 3                 | 4            | **12 — Alto**    | Mantener suite de regresión E2E existente (`appointment.e2e.spec.ts`). Ejecutar antes y después del refactor.                                 |
| R-10 | Schema de Doctor sin validación adecuada permite datos inconsistentes (consultorio duplicado, status inválido) | 2                 | 3            | **6 — Medio**    | Tests de schema con unique index en `office`. Tests de DTO con valores fuera de enum.                                                         |
| R-11 | AuditLog no registra todos los campos requeridos, dificultando auditoría posterior                             | 2                 | 4            | **8 — Medio**    | Test unitario que valide presencia de cada campo obligatorio en el documento de auditoría.                                                    |
| R-12 | Scheduler y evento reactivo ejecutan asignación simultáneamente, generando conflicto                           | 3                 | 4            | **12 — Alto**    | Implementar mutex o semáforo lógico en el use case. Test con trigger concurrente desde scheduler y evento.                                    |

**Escala de nivel de riesgo:**

| Rango | Nivel   | Acción                                  |
| ----- | ------- | --------------------------------------- |
| 1–4   | Bajo    | Monitorear, sin acción inmediata        |
| 5–9   | Medio   | Plan de mitigación recomendado          |
| 10–15 | Alto    | Mitigación obligatoria antes de release |
| 16–25 | Crítico | Bloquea release hasta resolución        |

## 8. Prerequisites & Requirements

### Infraestructura

- Docker y Docker Compose operativos (MongoDB, RabbitMQ, Producer, Consumer, Frontend).
- Node.js v18+ y npm/yarn instalados.
- Colección `doctors` creada con índices `status_1` y `office_1` (auto-creados por Mongoose).
- Colección `audit_logs` creada con índices `action_1_timestamp_-1` y `appointmentId_1`.

### Datos de Seed

- Mínimo 3 médicos registrados en consultorios distintos (1, 2, 3).
- Al menos 1 médico en cada status: `available`, `busy`, `offline`.
- Turnos de prueba con las tres prioridades representadas.

### Dependencias de Código

- SPEC-003 completamente implementado (status `IMPLEMENTED`).
- Schema `Doctor` en Producer y Consumer desplegados.
- Schema `AuditLog` en Consumer desplegado.
- `AssignDoctorUseCaseImpl` reemplazando `AssignAvailableOfficesUseCaseImpl`.
- `AppointmentEventPayload` con campos `doctorId`/`doctorName`.
- Nuevos componentes frontend compilando sin errores.

### Herramientas

| Herramienta             | Versión mínima | Uso                       |
| ----------------------- | -------------- | ------------------------- |
| Jest                    | 29.x           | Unit + Integration tests  |
| Supertest               | 6.x            | HTTP integration tests    |
| Testing Library (React) | 14.x           | Frontend component tests  |
| Docker Compose          | 2.x            | E2E y staging             |
| RabbitMQ Management     | 3.x            | Inspección de colas y DLQ |

### Accesos

- Acceso a RabbitMQ Management UI para inspeccionar colas y DLQ.
- Acceso a MongoDB shell o Compass para validar documentos de auditoría.
- Acceso a logs de Producer y Consumer para debugging.

## 9. Schedule & Agreements

### Cronograma de Ejecución

| Fase     | Sprint | Actividad                                                                     | Entregable                                                    |
| -------- | ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Sprint 1 | S1     | Tests unitarios HT-01, HT-02, HT-03 (validación, cola, WebSocket)             | Suites verdes para DTOs, queue position, gateway              |
| Sprint 2 | S2     | Tests unitarios + integración HT-04, HT-05, HT-06 (motor, eventos, auditoría) | Suites verdes para AssignDoctorUseCase, event handlers, audit |
| Sprint 2 | S2     | Tests frontend HU-01, HU-02 (formulario, posición en cola)                    | Suites verdes para componentes y hooks                        |
| Sprint 3 | S3     | Tests E2E y exploratorio HU-03 (asignación, notificación, resiliencia)        | E2E verde, reporte de exploratoria                            |
| Sprint 3 | S3     | Regresión completa                                                            | Todas las suites existentes en verde                          |

### Criterios de entrada

- Código de la funcionalidad completo y mergeado en la rama de feature.
- Build limpio sin errores de compilación.
- Suites existentes en verde (regresión cero).

### Criterios de salida

- 100% de escenarios positivos (POS-01 a POS-29) ejecutados y en verde.
- 100% de escenarios negativos (NEG-01 a NEG-22) ejecutados y en verde.
- 0 defectos bloqueantes o críticos abiertos.
- Cobertura de código ≥80% en módulos nuevos (Doctor, AuditLog, AssignDoctorUseCase).
- E2E del flujo completo (registro → cola → check-in → asignación → notificación) pasando.
- Riesgos R-01, R-03, R-08, R-09, R-12 (nivel Alto/Crítico) con mitigación verificada.

### Acuerdos del equipo

- Defectos se reportan en GitHub Issues con etiqueta `bug/spec-003` y severidad (blocker/critical/major/minor).
- Defectos bloqueantes y críticos se comunican inmediatamente en el canal del equipo.
- Cada PR que toque código de SPEC-003 debe pasar CI verde antes de merge.
- Tests de regresión se ejecutan al final de cada sprint.
- Hallazgos de exploratoria se documentan con screenshots/videos y pasos de reproducción.

## 10. Team

| Name                   | Role                    | Responsabilidad                                                          |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------ |
| Backend Developer      | Desarrollador Backend   | Implementación de tests unitarios e integración en Producer y Consumer   |
| Frontend Developer     | Desarrollador Frontend  | Implementación de tests de componentes, hooks y servicios                |
| Test Engineer Backend  | Ingeniero de Pruebas BE | Diseño y ejecución de suite de tests del motor de asignación y auditoría |
| Test Engineer Frontend | Ingeniero de Pruebas FE | Diseño y ejecución de suite de tests de componentes nuevos y modificados |
| QA Agent               | QA Lead                 | Estrategia QA, pruebas exploratorias, validación E2E, reporte de riesgos |
| Orchestrator           | Coordinador ASDD        | Monitoreo de progreso del checklist de testing en cada sprint            |

## Appendix A: Mapping Scenarios → Test Files

| Escenario                     | Test File (existente o por crear)                                                         | Nivel       |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ----------- |
| POS-01 a POS-03 (registro)    | `backend/producer/test/src/dto/create-appointment.dto.spec.ts`                            | Unit        |
| POS-04 a POS-06 (posición)    | `backend/producer/test/src/appointments/appointment-query.controller.spec.ts`             | Integration |
| POS-07, POS-08 (WebSocket)    | `backend/producer/test/src/events/appointments.gateway.spec.ts`                           | Integration |
| POS-09 a POS-13 (motor)       | `backend/consumer/test/src/application/use-cases/assign-doctor.use-case.impl.spec.ts`     | Unit        |
| POS-14 a POS-19 (Doctor CRUD) | `backend/producer/test/src/doctors/doctor.controller.spec.ts`                             | Integration |
| POS-20, POS-21 (eventos)      | `backend/consumer/test/src/application/event-handlers/appointment-events.handler.spec.ts` | Unit        |
| POS-22 (notificación ≤2s)     | `backend/e2e/appointment.e2e.spec.ts`                                                     | E2E         |
| POS-23 (auditoría)            | `backend/consumer/test/src/application/event-handlers/appointment-events.handler.spec.ts` | Unit        |
| POS-25 a POS-28 (frontend)    | `frontend/test/components/` (nuevos archivos por componente)                              | Unit        |
| POS-29 (hook)                 | `frontend/src/__tests__/useQueuePosition.spec.tsx`                                        | Unit        |
| NEG-01 a NEG-05 (validación)  | `backend/producer/test/src/dto/create-appointment.dto.spec.ts`                            | Unit        |
| NEG-08 a NEG-14 (Doctor)      | `backend/producer/test/src/doctors/doctor.controller.spec.ts`                             | Integration |
| NEG-15, NEG-16 (asignación)   | `backend/consumer/test/src/application/use-cases/assign-doctor.use-case.impl.spec.ts`     | Unit        |
| NEG-19 a NEG-22 (frontend)    | `frontend/test/components/` + `frontend/src/__tests__/`                                   | Unit        |

## Appendix B: Traceability Matrix

| Requirement           | User Story          | Test Scenarios                     | Risk Coverage    |
| --------------------- | ------------------- | ---------------------------------- | ---------------- |
| Prioridad obligatoria | HU-01               | POS-01 to POS-03, NEG-01 to NEG-05 | R-09             |
| Posición en cola      | HU-02               | POS-04 to POS-06, NEG-06, NEG-07   | R-05, R-07       |
| WebSocket reconexión  | HU-02               | POS-07, POS-08, NEG-18             | R-05             |
| Motor de asignación   | HU-03               | POS-09 to POS-13, NEG-15, NEG-16   | R-01, R-03, R-12 |
| Módulo Doctor         | HU-03               | POS-14 to POS-19, NEG-08 to NEG-14 | R-10             |
| Evento confiable      | HU-03               | POS-20, POS-21, NEG-17             | R-04, R-08       |
| Notificación ≤2s      | HU-03               | POS-22, POS-24, NEG-20             | R-02             |
| Auditoría             | HU-03               | POS-23                             | R-11             |
| Frontend components   | HU-01, HU-02, HU-03 | POS-25 to POS-29, NEG-19 to NEG-22 | R-07             |
| Resiliencia broker    | HU-03               | NEG-17                             | R-08             |
