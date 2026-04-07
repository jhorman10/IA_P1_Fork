---
id: SPEC-010
status: IMPLEMENTED
feature: authenticated-websocket-channel
created: 2026-04-05
updated: 2026-04-06
author: spec-generator
version: "1.0"
related-specs:
  - SPEC-003
  - SPEC-004
  - SPEC-008
  - SPEC-009
---

# Spec: Canal WebSocket Autenticado para Operacion Interna

> **Estado:** `IMPLEMENTED` -> implementacion, pruebas focales y QA completados bajo ASDD.
> **Ciclo de vida:** DRAFT -> APPROVED -> IN_PROGRESS -> IMPLEMENTED -> DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripcion

El sistema ya emite cambios de turnos en tiempo real por WebSocket, pero hoy existe una inconsistencia de seguridad y producto: el backend protege el namespace con un secreto compartido `WS_AUTH_TOKEN`, mientras el frontend actual no envia ningun token y la pantalla publica necesita seguir operando sin autenticacion. Esta spec define un canal operativo autenticado con `idToken` de Firebase para usuarios internos y conserva el flujo publico en tiempo real sin romper la sala de espera.

### Requerimiento de Negocio

Durante el cierre de SPEC-004 quedo documentado que la autenticacion del canal WebSocket seguia fuera de alcance, a pesar de que el resto del sistema ya usa `Authorization: Bearer <idToken>` y valida `Perfil` activo por rol. El negocio necesita que las vistas operativas internas usen el mismo modelo de identidad y autorizacion que los endpoints HTTP, sin degradar la experiencia en tiempo real de la pantalla publica.

### Historias de Usuario

#### HU-01: Conexion operativa autenticada al canal en tiempo real

```plaintext
Como:        Usuario interno con Perfil activo
Quiero:      Conectarme al canal de turnos operativos usando mi idToken de Firebase
Para:        Recibir actualizaciones en tiempo real solo si estoy autenticado y autorizado

Prioridad:   Alta
Estimacion:  M (Medium - 5-8 pts)
Dependencias: SPEC-004
Capa:        Ambas
```

#### Criterios de Aceptacion - HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Conexion exitosa de usuario interno con Perfil activo
  Dado que:  el Usuario ya inicio sesion y posee un idToken valido de Firebase
  Y:         existe un Perfil activo asociado a su uid
  Cuando:    el frontend se conecta al canal operativo WebSocket enviando el token
  Entonces:  el backend acepta la conexion
  Y:         adjunta el contexto del Usuario autenticado al socket
  Y:         emite el evento APPOINTMENTS_SNAPSHOT inicial
```

**Error Path**

```gherkin
CRITERIO-1.2: Token valido sin Perfil operativo activo
  Dado que:  el Usuario envia un idToken valido
  Y:         no existe un Perfil activo para ese uid
  Cuando:    intenta conectarse al canal operativo
  Entonces:  el backend rechaza la conexion
  Y:         emite un error de autenticacion compatible con frontend
  Y:         cierra el socket
```

**Edge Case**

```gherkin
CRITERIO-1.3: Reconexion con sesion expirada
  Dado que:  el Usuario ya estaba conectado al canal operativo
  Cuando:    el socket intenta reconectarse con un token expirado o ausente
  Entonces:  la conexion es rechazada
  Y:         el frontend expone estado de error autenticado
  Y:         no sigue mostrando el canal como conectado
```

#### HU-02: Continuidad del canal publico de sala de espera

```plaintext
Como:        Paciente o visitante en sala de espera
Quiero:      Seguir viendo la cola publica en tiempo real sin autenticarme
Para:        Conocer el estado de los turnos sin bloquear la operacion publica actual

Prioridad:   Alta
Estimacion:  S (Small - 3-5 pts)
Dependencias: SPEC-003
Capa:        Ambas
```

#### Criterios de Aceptacion - HU-02

**Happy Path**

```gherkin
CRITERIO-2.1: Pantalla publica continua recibiendo actualizaciones sin login
  Dado que:  un visitante navega a la pantalla publica de turnos
  Cuando:    el sistema abre la conexion de tiempo real publica
  Entonces:  recibe APPOINTMENTS_SNAPSHOT y APPOINTMENT_UPDATED sin requerir token
  Y:         la experiencia de la sala de espera no se rompe
```

**Error Path**

```gherkin
CRITERIO-2.2: El canal operativo no reemplaza ni rompe el canal publico
  Dado que:  existe un canal operativo autenticado y un canal publico
  Cuando:    se despliega la nueva funcionalidad
  Entonces:  la pantalla publica no depende de un idToken ni de un secreto compartido
  Y:         los clientes publicos no son desconectados por reglas pensadas para usuarios internos
```

**Edge Case**

```gherkin
CRITERIO-2.3: Un cliente publico intenta usar el namespace operativo
  Dado que:  un cliente sin autenticacion intenta conectarse al canal operativo
  Cuando:    abre el namespace protegido
  Entonces:  el backend rechaza la conexion
  Y:         el canal publico sigue disponible como alternativa legitima
```

### Reglas de Negocio

1. El canal operativo interno usa `idToken` de Firebase como mecanismo de autenticacion; no debe depender de un secreto compartido expuesto al frontend.
2. Solo un `Usuario` con `Perfil` activo puede conectarse al canal operativo.
3. El `uid` siempre proviene de Firebase y debe resolverse contra `Profile` antes de aceptar la conexion.
4. La pantalla publica sigue disponible sin autenticacion y no debe quedar acoplada a reglas de acceso interno.
5. Un error de autenticacion WebSocket debe ser observable por frontend y terminar en desconexion controlada.
6. El contrato de eventos operativos debe mantenerse consistente con `AppointmentEventPayload` ya usado en producer y frontend.

---

## 2. DISENO

### Modelos de Datos

#### Entidades afectadas

| Entidad                   | Almacen              | Cambios               | Descripcion                                                                     |
| ------------------------- | -------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `Profile`                 | coleccion `profiles` | sin cambios de schema | Se reutiliza para autorizar el socket via `uid` y validar `status=active`       |
| `AppointmentEventPayload` | runtime / WebSocket  | sin cambios de schema | Se reutiliza como payload del canal operativo autenticado                       |
| `OperationalSocketUser`   | memoria del proceso  | nueva                 | Contexto autenticado adjunto al `Socket` para trazabilidad y guards posteriores |

#### Campos del modelo

| Campo          | Tipo                                   | Obligatorio | Validacion                | Descripcion                                 |
| -------------- | -------------------------------------- | ----------- | ------------------------- | ------------------------------------------- |
| `uid`          | string                                 | si          | proviene de Firebase      | Identificador unico del Usuario autenticado |
| `role`         | `admin` \| `recepcionista` \| `doctor` | si          | debe existir en `Profile` | Rol operativo del Usuario                   |
| `status`       | `active` \| `inactive`                 | si          | solo `active` conecta     | Estado operativo del Perfil                 |
| `doctor_id`    | string \| null                         | no          | requerido si rol=`doctor` | Contexto medico del Usuario                 |
| `socket_id`    | string                                 | si          | generado por Socket.IO    | Identificador de la conexion                |
| `connected_at` | datetime (UTC)                         | si          | auto-generado             | Timestamp de apertura del socket            |

#### Indices / Constraints

- No hay cambios de indices MongoDB.
- Se reutiliza la unicidad existente de `uid` en `Profile`.
- El canal operativo debe rechazar `Profile` inexistente o inactivo antes de exponer datos.

### API Endpoints y Contratos de Tiempo Real

#### POST /auth/session

- **Descripcion**: Reutilizado para resolver la sesion operativa antes o durante el bootstrap del frontend autenticado.
- **Auth requerida**: si, `Authorization: Bearer <idToken>`
- **Response 200**:
  ```json
  {
    "uid": "firebase-uid",
    "role": "admin",
    "status": "active",
    "doctor_id": null,
    "allowed_modules": ["dashboard", "registration", "doctors", "profiles"]
  }
  ```
- **Response 401**: token ausente, invalido o expirado
- **Response 403**: Perfil no configurado o inactivo

#### WS /ws/appointments

- **Descripcion**: Canal publico existente para pantalla de sala de espera.
- **Auth requerida**: no.
- **Eventos emitidos**:
  - `APPOINTMENTS_SNAPSHOT`
  - `APPOINTMENT_UPDATED`
- **Notas**:
  - La continuidad de este namespace es obligatoria para no romper SPEC-003.
  - La minimizacion de datos del payload publico queda alineada con SPEC-009 si esa spec es aprobada.

#### WS /ws/operational-appointments

- **Descripcion**: Nuevo canal operativo autenticado para vistas internas.
- **Auth requerida**: si.
- **Handshake preferido**:
  ```json
  {
    "auth": {
      "token": "<firebase-id-token>"
    }
  }
  ```
- **Fallback aceptado**:
  - Header `Authorization: Bearer <firebase-id-token>`
- **Evento inicial exitoso**:
  ```json
  {
    "type": "APPOINTMENTS_SNAPSHOT",
    "data": [
      {
        "id": "apt-001",
        "fullName": "Paciente Demo",
        "idCard": 123456,
        "office": "3",
        "status": "waiting",
        "priority": "medium",
        "timestamp": 1760000000,
        "doctorId": null,
        "doctorName": null
      }
    ]
  }
  ```
- **Evento incremental**:
  ```json
  {
    "type": "APPOINTMENT_UPDATED",
    "data": {
      "id": "apt-001",
      "fullName": "Paciente Demo",
      "idCard": 123456,
      "office": "3",
      "status": "called",
      "priority": "medium",
      "timestamp": 1760000000,
      "doctorId": "doctor-01",
      "doctorName": "Dr. House"
    }
  }
  ```
- **Evento de rechazo recomendado**:
  ```json
  {
    "type": "WS_AUTH_ERROR",
    "code": "FORBIDDEN",
    "message": "Perfil operativo no configurado"
  }
  ```
- **Comportamiento de error**:
  - token ausente o invalido -> rechazo de conexion + desconexion
  - `Profile` inexistente o inactivo -> rechazo de conexion + desconexion

### Diseno Backend

#### Componentes nuevos o modificados

| Componente                       | Archivo                                                           | Cambio esperado                                                                |
| -------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `WsFirebaseAuthGuard`            | `backend/producer/src/auth/guards/ws-firebase-auth.guard.ts`      | nuevo guard WebSocket basado en `FirebaseAuthPort` y `ProfileRepository`       |
| `AppointmentsGateway`            | `backend/producer/src/events/appointments.gateway.ts`             | dejarlo como canal publico o simplificarlo para no depender de `WS_AUTH_TOKEN` |
| `OperationalAppointmentsGateway` | `backend/producer/src/events/operational-appointments.gateway.ts` | nuevo namespace protegido `/ws/operational-appointments`                       |
| `AppModule` / `EventsModule`     | wiring existente                                                  | registrar el nuevo gateway y el guard                                          |

#### Estrategia de autorizacion

1. Extraer el token desde `client.handshake.auth.token` o `client.handshake.headers.authorization`.
2. Verificar el `idToken` con `FirebaseAuthPort.verifyIdToken(...)`.
3. Resolver `Profile` por `uid` y rechazar si no existe o si `status != active`.
4. Adjuntar `client.data.user = { uid, role, status, doctor_id }`.
5. Emitir `APPOINTMENTS_SNAPSHOT` solo despues de autenticar correctamente.

#### Decisiones de compatibilidad

- El secreto compartido `WS_AUTH_TOKEN` deja de ser el contrato principal para clientes operativos.
- Si se mantiene temporalmente por compatibilidad, debe quedar limitado al namespace publico legado o eliminado por completo en una migracion controlada.
- No se requieren cambios de schema ni nuevas colecciones.

### Diseno Frontend

#### Hooks nuevos

| Hook                                  | Archivo                                                     | Retorna                                                   | Descripcion                                                                 |
| ------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| `useOperationalAppointmentsWebSocket` | `frontend/src/hooks/useOperationalAppointmentsWebSocket.ts` | `{ appointments, connectionStatus, error, authRejected }` | Hook autenticado que consume `useAuth().token` y conecta al canal operativo |

#### Adaptadores nuevos o modificados

| Componente                     | Archivo                                                                | Cambio esperado                                      |
| ------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `RealTimePort`                 | `frontend/src/domain/ports/RealTimePort.ts`                            | conservarlo para el canal publico                    |
| `OperationalRealTimePort`      | `frontend/src/domain/ports/OperationalRealTimePort.ts`                 | nuevo puerto con `connect(token: string)`            |
| `SocketIoAdapter`              | `frontend/src/infrastructure/adapters/SocketIoAdapter.ts`              | seguir conectado al canal publico                    |
| `AuthenticatedSocketIoAdapter` | `frontend/src/infrastructure/adapters/AuthenticatedSocketIoAdapter.ts` | nuevo adapter que envia `auth.token` en el handshake |
| `DependencyContext`            | `frontend/src/context/DependencyContext.tsx`                           | inyectar ambos canales: publico y operativo          |

#### Integracion con auth

- `useOperationalAppointmentsWebSocket` debe leer `token` desde `useAuth()`.
- Si `token` es `null`, el hook no intenta conectar y expone estado no autenticado.
- Si el backend emite `WS_AUTH_ERROR` o desconecta por autenticacion, el hook debe reflejar `authRejected=true` y dejar de reportar el canal como conectado.

#### Paginas afectadas

| Pagina                      | Archivo                               | Ruta         | Protegida |
| --------------------------- | ------------------------------------- | ------------ | --------- |
| Pantalla publica existente  | `frontend/src/app/page.tsx`           | `/`          | no        |
| Dashboard publico existente | `frontend/src/app/dashboard/page.tsx` | `/dashboard` | no        |
| Futuras vistas operativas   | por definir                           | por definir  | si        |

**Nota:** esta spec crea la infraestructura autenticada; una pagina operativa concreta puede ser consumidora inmediata en SPEC-008 u otra spec posterior.

### Arquitectura y Dependencias

- Paquetes nuevos requeridos: ninguno.
- Servicios externos: Firebase Auth para verificar `idToken` y MongoDB para resolver `Profile`.
- Impacto en puntos de entrada:
  - producer registra un gateway operativo adicional
  - frontend amplia la composicion de dependencias para soportar canal publico y canal operativo

### Notas de Implementacion

- No duplicar la logica de autenticacion HTTP; reutilizar `FirebaseAuthPort` y `ProfileRepository`.
- Evitar exponer `WS_AUTH_TOKEN` al frontend o documentarlo como requisito del navegador.
- Mantener los eventos `APPOINTMENTS_SNAPSHOT` y `APPOINTMENT_UPDATED` para reducir riesgo de migracion.
- Si el canal publico sigue usando el mismo payload completo, la mitigacion de privacidad queda gobernada por SPEC-009 y no por esta spec.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementacion

- [ ] Crear `WsFirebaseAuthGuard` reutilizando `FirebaseAuthPort` y `ProfileRepository`
- [ ] Crear `OperationalAppointmentsGateway` en `/ws/operational-appointments`
- [ ] Ajustar `AppointmentsGateway` para que el canal publico no dependa de `WS_AUTH_TOKEN`
- [ ] Registrar el nuevo gateway y guard en el modulo correspondiente
- [ ] Eliminar o acotar `WS_AUTH_TOKEN` como contrato operativo principal

#### Tests Backend

- [ ] `ws-firebase-auth.guard.spec.ts` - acepta `idToken` valido con `Profile` activo
- [ ] `ws-firebase-auth.guard.spec.ts` - rechaza token ausente o invalido
- [ ] `ws-firebase-auth.guard.spec.ts` - rechaza `Profile` inexistente o inactivo
- [ ] `operational-appointments.gateway.spec.ts` - emite snapshot solo tras autenticacion exitosa
- [ ] `operational-appointments.gateway.spec.ts` - desconecta cliente no autenticado

### Frontend

#### Implementacion

- [ ] Crear `OperationalRealTimePort`
- [ ] Crear `AuthenticatedSocketIoAdapter` con `auth.token`
- [ ] Crear `useOperationalAppointmentsWebSocket` integrado con `useAuth()`
- [ ] Ampliar `DependencyContext` para exponer canal publico y operativo
- [ ] Mantener `useAppointmentsWebSocket` actual para las paginas publicas existentes

#### Tests Frontend

- [ ] `AuthenticatedSocketIoAdapter` envia `auth.token` en el handshake
- [ ] `useOperationalAppointmentsWebSocket` no conecta si `token` es `null`
- [ ] `useOperationalAppointmentsWebSocket` actualiza estado a error cuando recibe `WS_AUTH_ERROR`
- [ ] `DependencyContext` provee ambas implementaciones sin romper el canal publico
- [ ] Regresion de `useAppointmentsWebSocket` y pantallas publicas `/` y `/dashboard`

### QA

- [ ] Ejecutar skill `/gherkin-case-generator` sobre HU-01 y HU-02
- [ ] Ejecutar skill `/risk-identifier` para validar riesgos de seguridad y regresion publica
- [ ] Validar matrix de escenarios: token valido, token invalido, Perfil faltante, Perfil inactivo, canal publico sin auth
- [ ] Confirmar que la pantalla publica sigue operando sin login
- [ ] Confirmar que un cliente interno sin `idToken` no recibe snapshot operativo
