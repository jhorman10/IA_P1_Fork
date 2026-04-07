---
id: SPEC-011
status: IMPLEMENTED
feature: structured-operational-audit-trail
created: 2026-04-05
updated: 2026-04-06
author: spec-generator
version: "1.0"
related-specs:
  - SPEC-003
  - SPEC-004
  - SPEC-006
---

# Spec: Trazabilidad Operativa Estructurada (Audit Trail)

> **Estado:** `IMPLEMENTED` — implementación completada con evidencia de tests focalizados y QA documentado.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Implementar un sistema de auditoría estructurada en el microservicio **producer** que registre todas las operaciones administrativas y operativas (creación/edición de perfiles, check-in/check-out de médicos, creación de turnos, resolución de sesión) en una colección `operational_audit_logs` de MongoDB. Exponer un endpoint de consulta de solo lectura para administradores. El consumer ya tiene auditoría para decisiones de asignación (`audit_logs`); esta spec cubre las operaciones HTTP del producer exclusivamente.

### Requerimiento de Negocio

SPEC-003-VAL identificó la **auditoría estructurada** como el único ítem ❌ NO PASA en la validación post-implementación. El requerimiento original (HT-06) exige notificación "visible y **auditable** al paciente", pero la trazabilidad hoy solo cubre las decisiones de asignación del consumer. Las operaciones administrativas del producer (creación de perfiles, cambios de rol, check-in de médicos) se registran únicamente en `console.log` sin persistencia consultable. SPEC-006 Hallazgo D identificó la ausencia de auditoría de cambios de perfil como un gap de compliance clínico.

### Análisis de Estado Actual vs. Delta

| Capacidad                            | Estado actual                                              | Delta requerido                                   |
| ------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------- |
| Audit de asignaciones (consumer)     | ✅ `AuditPort` + `MongooseAuditAdapter` + `AuditLogSchema` | Sin cambio — ya operativo                         |
| Audit de operaciones HTTP (producer) | ❌ Solo `console.log`                                      | **Nuevo**: puerto, adaptador, schema, interceptor |
| API de consulta de audit logs        | ❌ No existe                                               | **Nuevo**: endpoint GET admin-only con filtros    |
| Visor de auditoría en frontend       | ❌ No existe                                               | **Nuevo**: tabla read-only en dashboard admin     |

### Historias de Usuario

#### HU-01: Registro automático de operaciones administrativas

```
Como:        Administrador del sistema
Quiero:      Que cada operación administrativa (crear perfil, cambiar rol, check-in médico, crear turno) quede registrada automáticamente con quién la hizo, cuándo y qué cambió
Para:        Tener trazabilidad completa de acciones operativas y cumplir con requisitos de auditoría clínica

Prioridad:   Alta
Estimación:  M (Medium — 8 pts)
Dependencias: SPEC-004 (auth + perfiles + FirebaseAuthGuard)
Capa:        Backend
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Auditoría de creación de perfil
  Dado que:  un admin autenticado crea un perfil vía POST /profiles
  Cuando:    el perfil se persiste exitosamente
  Entonces:  se inserta un documento en operational_audit_logs con:
             action="PROFILE_CREATED", actorUid=<uid del admin>, targetUid=<uid del perfil creado>,
             details={role, email, displayName}, timestamp en epoch ms UTC
```

```gherkin
CRITERIO-1.2: Auditoría de actualización de perfil
  Dado que:  un admin autenticado actualiza un perfil vía PATCH /profiles/:uid
  Cuando:    la actualización se aplica exitosamente
  Entonces:  se inserta un documento en operational_audit_logs con:
             action="PROFILE_UPDATED", actorUid=<uid del admin>, targetUid=<uid del perfil>,
             details={changes: {field: {from, to}}}, timestamp en epoch ms UTC
```

```gherkin
CRITERIO-1.3: Auditoría de check-in de médico
  Dado que:  un doctor autenticado hace check-in vía PATCH /doctors/:id/check-in
  Cuando:    el estado cambia a available exitosamente
  Entonces:  se inserta un documento en operational_audit_logs con:
             action="DOCTOR_CHECK_IN", actorUid=<uid del doctor>, targetId=<doctor mongo id>,
             details={doctorName, office, previousStatus: "offline"}, timestamp en epoch ms UTC
```

```gherkin
CRITERIO-1.4: Auditoría de check-out de médico
  Dado que:  un doctor autenticado hace check-out vía PATCH /doctors/:id/check-out
  Cuando:    el estado cambia a offline exitosamente
  Entonces:  se inserta un documento en operational_audit_logs con:
             action="DOCTOR_CHECK_OUT", actorUid=<uid del doctor>, targetId=<doctor mongo id>,
             details={doctorName, office, previousStatus: "available"}, timestamp en epoch ms UTC
```

```gherkin
CRITERIO-1.5: Auditoría de creación de turno
  Dado que:  un recepcionista autenticado crea un turno vía POST /appointments
  Cuando:    el turno es aceptado (HTTP 202)
  Entonces:  se inserta un documento en operational_audit_logs con:
             action="APPOINTMENT_CREATED", actorUid=<uid del recepcionista>,
             details={patientIdCard, patientName, priority}, timestamp en epoch ms UTC
```

**Error Path**

```gherkin
CRITERIO-1.6: No se auditan operaciones fallidas por validación
  Dado que:  un admin envía POST /profiles con datos inválidos
  Cuando:    el backend responde HTTP 400
  Entonces:  NO se inserta registro de auditoría (solo se auditan operaciones exitosas)
```

```gherkin
CRITERIO-1.7: Fallo de escritura de audit no bloquea la operación
  Dado que:  la escritura a operational_audit_logs falla (ej. timeout de MongoDB)
  Cuando:    la operación de negocio principal ya se completó
  Entonces:  la respuesta HTTP al cliente es exitosa (la auditoría es fire-and-forget)
  Y          se registra un warning en console.warn con el detalle del fallo
```

**Edge Case**

```gherkin
CRITERIO-1.8: Auditoría de resolución de sesión (solo primer login del día)
  Dado que:  un usuario resuelve su sesión vía POST /auth/session
  Cuando:    es la primera resolución de ese uid en las últimas 24h
  Entonces:  se inserta action="SESSION_RESOLVED" con actorUid=<uid>, details={role, email}
  Y          resoluciones subsecuentes dentro de las 24h NO generan audit (deduplicación)
```

### Reglas de Negocio

1. **Solo operaciones exitosas**: las operaciones que fallan por validación (4xx) o error de negocio NO generan registro de auditoría.
2. **Fire-and-forget**: la escritura de audit es asíncrona y no debe bloquear ni retrasar la respuesta HTTP al cliente. Si falla, se registra un `console.warn` y la operación principal continúa.
3. **Inmutabilidad**: los registros de auditoría son write-only. No existe operación de actualización ni eliminación sobre `operational_audit_logs`.
4. **Actor identificado**: todo registro debe incluir el `actorUid` (uid de Firebase del usuario que ejecuta la acción), extraído del token autenticado.
5. **Deduplicación de sesión**: `SESSION_RESOLVED` se limita a 1 registro por `actorUid` por ventana de 24 horas para evitar floods.
6. **Timestamps**: `timestamp` es epoch ms UTC, generado en el producer al momento de la operación.
7. **Colección separada**: el producer usa `operational_audit_logs` (distinta de `audit_logs` del consumer) para mantener separación de responsabilidades entre microservicios.

---

#### HU-02: Consulta de registros de auditoría

```
Como:        Administrador del sistema
Quiero:      Consultar los registros de auditoría con filtros por acción, actor, rango de fechas y paginación
Para:        Investigar incidentes, verificar acciones de otros usuarios y cumplir con auditorías externas

Prioridad:   Media
Estimación:  M (Medium — 8 pts)
Dependencias: HU-01
Capa:        Ambas (Backend + Frontend)
```

#### Criterios de Aceptación — HU-02

**Happy Path**

```gherkin
CRITERIO-2.1: Admin consulta audit logs sin filtros
  Dado que:  un admin autenticado envía GET /audit-logs?page=1&limit=20
  Cuando:    el backend procesa la solicitud
  Entonces:  responde HTTP 200 con {data: [...], total, page, limit, totalPages}
             ordenado por timestamp descendente (más recientes primero)
```

```gherkin
CRITERIO-2.2: Admin filtra audit logs por acción
  Dado que:  un admin envía GET /audit-logs?action=PROFILE_CREATED&page=1&limit=20
  Cuando:    el backend procesa la solicitud
  Entonces:  responde HTTP 200 solo con registros donde action="PROFILE_CREATED"
```

```gherkin
CRITERIO-2.3: Admin filtra audit logs por rango de fechas
  Dado que:  un admin envía GET /audit-logs?from=1712300000000&to=1712400000000
  Cuando:    el backend procesa la solicitud
  Entonces:  responde HTTP 200 solo con registros donde timestamp >= from AND timestamp <= to
```

```gherkin
CRITERIO-2.4: Admin filtra audit logs por actor
  Dado que:  un admin envía GET /audit-logs?actorUid=abc123
  Cuando:    el backend procesa la solicitud
  Entonces:  responde HTTP 200 solo con registros donde actorUid="abc123"
```

```gherkin
CRITERIO-2.5: Admin ve tabla de auditoría en frontend
  Dado que:  un admin navega a /admin/audit en el frontend
  Cuando:    la página carga
  Entonces:  se muestra una tabla con columnas: Fecha, Acción, Actor, Detalle
  Y          se muestra paginación con botones anterior/siguiente
  Y          se muestran filtros por acción (dropdown) y rango de fechas
```

**Error Path**

```gherkin
CRITERIO-2.6: Rol no-admin intenta consultar audit logs
  Dado que:  un usuario con rol recepcionista envía GET /audit-logs
  Cuando:    el backend evalúa el RoleGuard
  Entonces:  responde HTTP 403 "Forbidden"
```

```gherkin
CRITERIO-2.7: Página fuera de rango
  Dado que:  un admin envía GET /audit-logs?page=999&limit=20
  Cuando:    no existen registros en esa página
  Entonces:  responde HTTP 200 con {data: [], total: N, page: 999, limit: 20, totalPages: X}
```

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad               | Almacén                            | Cambios | Descripción                                            |
| --------------------- | ---------------------------------- | ------- | ------------------------------------------------------ |
| `OperationalAuditLog` | colección `operational_audit_logs` | nueva   | Registro de auditoría de operaciones HTTP del producer |

#### Campos del modelo

| Campo       | Tipo          | Obligatorio | Validación                            | Descripción                                          |
| ----------- | ------------- | ----------- | ------------------------------------- | ---------------------------------------------------- |
| `_id`       | ObjectId      | sí          | auto-generado                         | Identificador MongoDB                                |
| `action`    | string (enum) | sí          | ver enum abajo                        | Tipo de operación auditada                           |
| `actorUid`  | string        | sí          | uid de Firebase                       | UID del usuario que ejecutó la acción                |
| `targetUid` | string        | no          | uid de Firebase o null                | UID del perfil/recurso afectado (si aplica)          |
| `targetId`  | string        | no          | MongoDB ObjectId o null               | ID del recurso afectado (doctor, appointment)        |
| `details`   | object        | sí          | schema-free (Record<string, unknown>) | Contexto de la operación (campos cambiados, valores) |
| `timestamp` | number        | sí          | epoch ms UTC                          | Momento exacto de la operación                       |
| `createdAt` | Date          | sí          | auto-generado por Mongoose            | Timestamp de inserción en DB                         |

#### Enum `OperationalAuditAction`

```typescript
export type OperationalAuditAction =
  | "PROFILE_CREATED"
  | "PROFILE_UPDATED"
  | "DOCTOR_CHECK_IN"
  | "DOCTOR_CHECK_OUT"
  | "DOCTOR_CREATED"
  | "APPOINTMENT_CREATED"
  | "SESSION_RESOLVED";
```

#### Índices / Constraints

| Índice                       | Campos                                      | Justificación                                      |
| ---------------------------- | ------------------------------------------- | -------------------------------------------------- |
| Compuesto de acción + tiempo | `{ action: 1, timestamp: -1 }`              | Consulta por tipo de acción, más recientes primero |
| Actor                        | `{ actorUid: 1, timestamp: -1 }`            | Consulta de acciones por actor específico          |
| Deduplicación de sesión      | `{ actorUid: 1, action: 1, timestamp: -1 }` | Verificar last SESSION_RESOLVED por actor          |

### API Endpoints

#### GET /audit-logs

- **Descripción**: Consulta paginada de registros de auditoría operativa
- **Auth requerida**: sí — Firebase idToken + rol `admin`
- **Guards**: `FirebaseAuthGuard` → `RoleGuard(@Roles('admin'))`

**Query Parameters:**

| Param      | Tipo   | Requerido | Default | Descripción                            |
| ---------- | ------ | --------- | ------- | -------------------------------------- |
| `page`     | number | no        | 1       | Número de página (1-based)             |
| `limit`    | number | no        | 20      | Registros por página (max 100)         |
| `action`   | string | no        | —       | Filtrar por tipo de acción             |
| `actorUid` | string | no        | —       | Filtrar por UID del actor              |
| `from`     | number | no        | —       | Timestamp mínimo (epoch ms, inclusive) |
| `to`       | number | no        | —       | Timestamp máximo (epoch ms, inclusive) |

- **Response 200**:
  ```json
  {
    "data": [
      {
        "id": "665a1b2c...",
        "action": "PROFILE_CREATED",
        "actorUid": "firebase-uid-admin",
        "targetUid": "firebase-uid-new-user",
        "targetId": null,
        "details": {
          "role": "recepcionista",
          "email": "ana@clinic.co",
          "displayName": "Ana García"
        },
        "timestamp": 1712345678000,
        "createdAt": "2026-04-05T14:21:18.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
  ```
- **Response 401**: Token ausente o expirado
- **Response 403**: Rol no autorizado (solo admin)

### Diseño Backend — Arquitectura Hexagonal

#### Puertos (Domain Layer)

| Puerto                      | Tipo     | Archivo                                                 | Descripción                                      |
| --------------------------- | -------- | ------------------------------------------------------- | ------------------------------------------------ |
| `OperationalAuditPort`      | Outbound | `domain/ports/outbound/operational-audit.port.ts`       | Interfaz write-only para registrar audit entries |
| `OperationalAuditQueryPort` | Outbound | `domain/ports/outbound/operational-audit-query.port.ts` | Interfaz read-only para consultar audit logs     |

```typescript
// domain/ports/outbound/operational-audit.port.ts
export interface OperationalAuditEntry {
  action: OperationalAuditAction;
  actorUid: string;
  targetUid?: string | null;
  targetId?: string | null;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface OperationalAuditPort {
  log(entry: OperationalAuditEntry): Promise<void>;
  hasRecentEntry(
    actorUid: string,
    action: OperationalAuditAction,
    windowMs: number,
  ): Promise<boolean>;
}
```

```typescript
// domain/ports/outbound/operational-audit-query.port.ts
export interface AuditLogFilters {
  action?: OperationalAuditAction;
  actorUid?: string;
  from?: number;
  to?: number;
}

export interface AuditLogPage {
  data: OperationalAuditEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OperationalAuditQueryPort {
  findPaginated(
    filters: AuditLogFilters,
    page: number,
    limit: number,
  ): Promise<AuditLogPage>;
}
```

#### Adaptadores (Infrastructure Layer)

| Adaptador                         | Archivo                                                                  | Implementa                                           | Descripción                                                |
| --------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------- |
| `MongooseOperationalAuditAdapter` | `infrastructure/adapters/outbound/mongoose-operational-audit.adapter.ts` | `OperationalAuditPort` + `OperationalAuditQueryPort` | Persistencia en MongoDB colección `operational_audit_logs` |

#### Schema Mongoose

| Schema                | Archivo                                   | Colección                |
| --------------------- | ----------------------------------------- | ------------------------ |
| `OperationalAuditLog` | `schemas/operational-audit-log.schema.ts` | `operational_audit_logs` |

#### Interceptor NestJS

| Componente         | Archivo                                    | Descripción                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuditInterceptor` | `common/interceptors/audit.interceptor.ts` | Interceptor NestJS que captura operaciones exitosas y registra audit entry via `OperationalAuditPort`. Se aplica con `@UseInterceptors(AuditInterceptor)` + decorador `@Auditable(action)` en cada endpoint auditable. |

**Patrón de decorador personalizado:**

```typescript
// common/decorators/auditable.decorator.ts
export const AUDIT_ACTION_KEY = "audit:action";
export const Auditable = (action: OperationalAuditAction) =>
  SetMetadata(AUDIT_ACTION_KEY, action);
```

**Integración con controladores (ejemplo):**

```typescript
// profiles.controller.ts — solo se agrega decorador + interceptor
@Post()
@HttpCode(201)
@UseGuards(FirebaseAuthGuard, RoleGuard)
@UseInterceptors(AuditInterceptor)
@Roles("admin")
@Auditable("PROFILE_CREATED")
async createProfile(@Body() dto, @CurrentUser() user): Promise<ProfileResponseDto> { ... }
```

**Lógica del interceptor:**

1. Deja pasar la ejecución del handler.
2. Si el handler responde exitosamente (no lanza excepción), extrae:
   - `action` del metadata `@Auditable`
   - `actorUid` del `request.user.uid` (inyectado por `FirebaseAuthGuard`)
   - `targetUid` del body (`dto.uid`) o params (`:uid`, `:id`)
   - `details` del body de la request (sanitizado — sin passwords ni tokens)
3. Para `SESSION_RESOLVED`: verifica `hasRecentEntry()` antes de insertar (deduplicación 24h).
4. Llama `auditPort.log(entry)` en un `Promise` sin `await` (fire-and-forget).
5. Si `auditPort.log()` falla, captura con `.catch()` y emite `console.warn`.

#### Módulo de Auditoría

| Módulo        | Archivo                 | Exports                                                                 |
| ------------- | ----------------------- | ----------------------------------------------------------------------- |
| `AuditModule` | `audit/audit.module.ts` | `OperationalAuditPort`, `OperationalAuditQueryPort`, `AuditInterceptor` |

Se registra como import global en `AppModule`.

#### Controlador de consulta

| Controlador       | Archivo                     | Endpoint          |
| ----------------- | --------------------------- | ----------------- |
| `AuditController` | `audit/audit.controller.ts` | `GET /audit-logs` |

### Diseño Frontend

#### Tipos de Dominio

| Tipo              | Archivo              | Descripción                                       |
| ----------------- | -------------------- | ------------------------------------------------- |
| `AuditLogEntry`   | `domain/AuditLog.ts` | Tipo del registro individual de auditoría         |
| `AuditLogPage`    | `domain/AuditLog.ts` | Respuesta paginada de `GET /audit-logs`           |
| `AuditAction`     | `domain/AuditLog.ts` | Union type de acciones auditables                 |
| `AuditLogFilters` | `domain/AuditLog.ts` | Filtros para consulta: action, actorUid, from, to |

#### Componentes nuevos

| Componente      | Archivo                                      | Props principales             | Descripción                                                     |
| --------------- | -------------------------------------------- | ----------------------------- | --------------------------------------------------------------- |
| `AuditLogTable` | `components/AuditLogTable/AuditLogTable.tsx` | `logs, loading, onPageChange` | Tabla read-only de audit logs con paginación                    |
| `AuditFilters`  | `components/AuditFilters/AuditFilters.tsx`   | `filters, onFilterChange`     | Controles de filtro: dropdown acción, input actor, date pickers |

#### Páginas nuevas

| Página      | Archivo                    | Ruta           | Protegida                      |
| ----------- | -------------------------- | -------------- | ------------------------------ |
| `AuditPage` | `app/admin/audit/page.tsx` | `/admin/audit` | sí — `useRoleGuard(["admin"])` |

#### Hooks y State

| Hook           | Archivo                 | Retorna                                                        | Descripción                         |
| -------------- | ----------------------- | -------------------------------------------------------------- | ----------------------------------- |
| `useAuditLogs` | `hooks/useAuditLogs.ts` | `{ logs, total, page, loading, error, fetchLogs, setFilters }` | Consulta paginada a GET /audit-logs |

#### Services (llamadas API — usa `fetch` nativo, consistente con `profileService.ts` y `doctorService.ts`)

| Función                       | Archivo                    | Endpoint          |
| ----------------------------- | -------------------------- | ----------------- |
| `getAuditLogs(params, token)` | `services/auditService.ts` | `GET /audit-logs` |

**Patrón de referencia** (alineado con `profileService.ts`):

```typescript
import { env } from "@/config/env";
import { AuditLogPage, AuditLogFilters } from "@/domain/AuditLog";

export async function getAuditLogs(
  idToken: string,
  filters?: AuditLogFilters & { page?: number; limit?: number },
): Promise<AuditLogPage> {
  const url = new URL(`${env.API_BASE_URL}/audit-logs`);
  if (filters?.action) url.searchParams.set("action", filters.action);
  if (filters?.actorUid) url.searchParams.set("actorUid", filters.actorUid);
  if (filters?.from) url.searchParams.set("from", String(filters.from));
  if (filters?.to) url.searchParams.set("to", String(filters.to));
  if (filters?.page) url.searchParams.set("page", String(filters.page));
  if (filters?.limit) url.searchParams.set("limit", String(filters.limit));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`HTTP_ERROR: ${res.status}`);
  return res.json();
}
```

### Arquitectura y Dependencias

- **Paquetes nuevos requeridos**: ninguno — todo usa NestJS core (`@nestjs/common` interceptors, decorators, metadata) y Mongoose.
- **Servicios externos**: ninguno nuevo — usa MongoDB existente.
- **Impacto en app.module.ts**: registrar `AuditModule` como import en `AppModule` del producer.
- **Impacto en controladores existentes**: agregar `@UseInterceptors(AuditInterceptor)` y `@Auditable(action)` a cada endpoint auditable. No se modifica lógica de negocio existente.

### Notas de Implementación

1. **Patrón fire-and-forget**: la auditoría NO debe aumentar la latencia de ningún endpoint. El `log()` se ejecuta sin `await`.
2. **Colección separada**: `operational_audit_logs` (producer) vs `audit_logs` (consumer). No unificar en esta spec.
3. **Mirroring del consumer**: la estructura de `OperationalAuditPort` replica el patrón de `AuditPort` del consumer para consistencia arquitectónica, pero con campos adicionales (`actorUid`, `targetUid`).
4. **Sanitización de details**: el interceptor debe excluir campos sensibles del body antes de persistir (ej. si algún DTO futuro incluyera passwords o tokens). Lista de exclusión: `password`, `token`, `secret`, `idToken`.
5. **Rendimiento**: los índices propuestos están optimizados para los 3 patrones de consulta del endpoint GET. No se necesita full-text search.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación — HU-01 (Registro de auditoría)

- [x] Crear schema `OperationalAuditLog` en `schemas/operational-audit-log.schema.ts` con enum de acciones, campos y 3 índices
- [x] Crear outbound port `OperationalAuditPort` en `domain/ports/outbound/operational-audit.port.ts` con `log()` y `hasRecentEntry()`
- [x] Crear outbound port `OperationalAuditQueryPort` en `domain/ports/outbound/operational-audit-query.port.ts` con `findPaginated()`
- [x] Crear adapter `MongooseOperationalAuditAdapter` en `infrastructure/adapters/outbound/mongoose-operational-audit.adapter.ts` implementando ambos puertos
- [x] Crear decorador `@Auditable(action)` en `common/decorators/auditable.decorator.ts`
- [x] Crear `AuditInterceptor` en `common/interceptors/audit.interceptor.ts` con lógica fire-and-forget + deduplicación SESSION_RESOLVED
- [x] Crear `AuditModule` en `audit/audit.module.ts` — registra schema, exporta port tokens y interceptor
- [x] Registrar `AuditModule` como import en `AppModule`
- [x] Agregar `@UseInterceptors(AuditInterceptor)` + `@Auditable(action)` a `ProfilesController.createProfile()`
- [x] Agregar `@UseInterceptors(AuditInterceptor)` + `@Auditable(action)` a `ProfilesController.updateProfile()`
- [x] Agregar `@UseInterceptors(AuditInterceptor)` + `@Auditable(action)` a `DoctorController.createDoctor()`
- [x] Agregar `@UseInterceptors(AuditInterceptor)` + `@Auditable(action)` a `DoctorController.checkIn()`
- [x] Agregar `@UseInterceptors(AuditInterceptor)` + `@Auditable(action)` a `DoctorController.checkOut()`
- [x] Agregar `@UseInterceptors(AuditInterceptor)` + `@Auditable(action)` a `ProducerController.createAppointment()`
- [x] Agregar `@UseInterceptors(AuditInterceptor)` + `@Auditable(action)` a `AuthController.resolveSession()`

#### Implementación — HU-02 (Consulta de audit logs)

- [x] Crear `AuditController` en `audit/audit.controller.ts` con `GET /audit-logs` — guards: `FirebaseAuthGuard` + `RoleGuard` + `@Roles('admin')`
- [x] Crear DTO `AuditLogQueryDto` para validar query params con `class-validator`
- [x] Crear DTO `AuditLogResponseDto` para tipar la respuesta paginada
- [x] Registrar `AuditController` en `AuditModule`

#### Tests Backend

- [x] `test_audit_interceptor_logs_on_success` — interceptor registra auditoría tras respuesta exitosa
- [x] `test_audit_interceptor_skips_on_error` — interceptor NO registra si el handler lanza excepción
- [x] `test_audit_interceptor_fire_and_forget` — fallo de audit NO bloquea la respuesta
- [x] `test_audit_interceptor_session_dedup` — SESSION_RESOLVED deduplica dentro de 24h
- [x] `test_audit_adapter_log_persists` — adapter inserta documento en colección
- [x] `test_audit_adapter_has_recent_entry` — verifica deduplicación por ventana temporal
- [x] `test_audit_adapter_find_paginated` — consulta paginada con/sin filtros
- [x] `test_audit_controller_get_returns_200` — endpoint retorna logs paginados
- [x] `test_audit_controller_get_returns_403_non_admin` — rol no-admin bloqueado
- [x] `test_audit_controller_get_returns_401_no_token` — sin autenticación

### Frontend

#### Implementación

- [x] Crear `services/auditService.ts` con función `getAuditLogs(params, token)`
- [x] Crear hook `hooks/useAuditLogs.ts` con estado, paginación y filtros
- [x] Crear componente `AuditFilters/AuditFilters.tsx` + `AuditFilters.module.css` con dropdown de acción y date pickers
- [x] Crear componente `AuditLogTable/AuditLogTable.tsx` + `AuditLogTable.module.css` con tabla paginada read-only
- [x] Crear tipo de dominio `domain/AuditLog.ts` con `AuditLogEntry`, `AuditLogPage`, `AuditAction`, `AuditLogFilters`
- [x] Crear página `app/admin/audit/page.tsx` protegida por `useRoleGuard(["admin"])` (patrón consistente con `admin/profiles/page.tsx`)

#### Tests Frontend

- [x] `test_audit_service_get_logs` — servicio llama endpoint con params correctos
- [x] `test_use_audit_logs_hook` — hook maneja loading, data, error, paginación
- [x] `test_audit_filters_renders` — componente de filtros renderiza correctamente
- [x] `test_audit_log_table_renders_data` — tabla muestra filas de audit logs
- [x] `test_audit_page_role_gate` — página bloquea acceso a roles no-admin

### QA

- [ ] Verificar que cada operación auditable genera exactamente 1 registro
- [x] Verificar fire-and-forget: fallo de audit no afecta respuesta HTTP
- [x] Verificar que SESSION_RESOLVED se deduplica en ventana de 24h
- [x] Verificar que GET /audit-logs filtra correctamente por action, actorUid, from, to
- [x] Verificar que la tabla frontend muestra datos consistentes con el API
- [x] Verificar que la colección `operational_audit_logs` es distinta de `audit_logs` del consumer
