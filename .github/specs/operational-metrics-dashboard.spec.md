---
id: SPEC-013
status: IMPLEMENTED
feature: operational-metrics-dashboard
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

# Spec: Dashboard de Métricas Operativas en Tiempo Real

> **Estado:** `IMPLEMENTED` → implementación, pruebas focales y QA completados bajo ASDD.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Implementar un endpoint de métricas operativas agregadas en el producer y una página de dashboard administrativo en el frontend que muestre KPIs clave del sistema de turnos en tiempo real. Actualmente, el administrador solo puede ver la lista cruda de turnos (pantalla pública `/`) y la trazabilidad de auditoría (`/admin/audit`), pero no cuenta con una vista consolidada que responda preguntas operativas como: ¿cuántos pacientes esperan?, ¿cuánto llevan esperando en promedio?, ¿cuántos médicos están disponibles?, ¿cuál es el rendimiento del día? El Diccionario de Dominio define **Dashboard** como "Pantalla principal con métricas (solo lectura)" y el requerimiento de negocio identifica "Invisibilidad operativa" como problema central.

### Requerimiento de Negocio

El requerimiento original en `.github/requirements/smart-appointment-management.md` identifica el problema:

> **Invisibilidad operativa**: no sabemos en tiempo real qué médicos están atendiendo y cuáles no.

La solución propuesta indica que el sistema debe proveer visibilidad operativa en tiempo real. Actualmente, la información existe en la base de datos (colecciones `appointments` y `doctors`) pero no hay ningún endpoint de agregación ni vista de métricas. Los administradores deben inferir el estado operativo del sistema navegando entre pantallas no diseñadas para ese propósito.

### Análisis de Estado Actual vs. Delta

| Capacidad                   | Estado actual                                          | Delta requerido                                                    |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| Conteo de turnos por estado | ❌ No existe endpoint de agregación                    | **Nuevo**: endpoint `/metrics/appointments` con conteos por status |
| Disponibilidad de médicos   | ❌ Solo `GET /doctors?status=` devuelve lista completa | **Nuevo**: conteo agregado por status en `/metrics/doctors`        |
| Tiempo promedio de espera   | ❌ No se calcula                                       | **Nuevo**: cálculo sobre turnos `called` del día                   |
| Tiempo promedio de consulta | ❌ No se calcula                                       | **Nuevo**: cálculo sobre turnos `completed` del día                |
| Rendimiento (turnos/hora)   | ❌ No se calcula                                       | **Nuevo**: turnos completados hoy / horas transcurridas            |
| Dashboard admin             | ❌ No existe                                           | **Nuevo**: página `/admin/dashboard` con tarjetas KPI              |

### Historias de Usuario

#### HU-01: Vista consolidada de métricas operativas

```
Como:        Administrador
Quiero:      Ver un dashboard con métricas clave del sistema de turnos en tiempo real
Para:        Tomar decisiones operativas informadas sin recorrer múltiples pantallas

Prioridad:   Alta
Estimación:  M (5 pts)
Dependencias: SPEC-003 (appointments + doctors), SPEC-004 (auth + roles)
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Dashboard muestra métricas actualizadas
  Dado que:  el administrador está autenticado y accede a /admin/dashboard
  Cuando:    la página carga
  Entonces:  se muestran las siguientes métricas del día:
             - Turnos en espera (waiting)
             - Turnos en atención (called)
             - Turnos completados hoy (completed)
             - Médicos disponibles / ocupados / desconectados
             - Tiempo promedio de espera (minutos)
             - Tiempo promedio de consulta (minutos)
             - Rendimiento (turnos completados por hora)
```

```gherkin
CRITERIO-1.2: Métricas se refrescan periódicamente
  Dado que:  el admin tiene el dashboard abierto
  Cuando:    transcurren 30 segundos
  Entonces:  las métricas se refrescan automáticamente sin recargar la página
```

**Error Path**

```gherkin
CRITERIO-1.3: Acceso denegado a no-admin
  Dado que:  un usuario con rol "recepcionista" intenta acceder a /admin/dashboard
  Cuando:    la página evalúa el rol
  Entonces:  se redirige a la pantalla principal sin mostrar métricas
```

```gherkin
CRITERIO-1.4: Acceso sin autenticación
  Dado que:  un visitante no autenticado accede a GET /metrics
  Cuando:    el backend valida el token
  Entonces:  responde HTTP 401 con mensaje "Unauthorized"
```

**Edge Case**

```gherkin
CRITERIO-1.5: Sin datos del día
  Dado que:  es inicio de jornada y no hay turnos registrados hoy
  Cuando:    el admin accede al dashboard
  Entonces:  los contadores muestran 0, los promedios muestran "N/A" o "—",
             y el rendimiento muestra "0 turnos/h"
```

```gherkin
CRITERIO-1.6: Error de conectividad con el backend
  Dado que:  el admin está en el dashboard
  Cuando:    falla la llamada al endpoint de métricas
  Entonces:  se muestra un mensaje de error no intrusivo y se conservan los últimos datos válidos
```

### Reglas de Negocio

1. **Solo lectura**: El dashboard no modifica datos. Todas las operaciones son consultas de agregación.
2. **Solo admin**: El endpoint y la página son accesibles únicamente por usuarios con rol `admin`.
3. **Ventana temporal del día**: Las métricas de rendimiento (completados, promedios, throughput) se calculan sobre turnos del día actual (desde 00:00 UTC).
4. **Tiempos en minutos**: `avgWaitTimeMinutes` = promedio de `(assignedAt - timestamp)` para turnos `called` o `completed` del día. `avgConsultationTimeMinutes` = promedio de `(completedTimestamp - assignedAt)` para turnos `completed` del día. Donde `assignedAt` se infiere del momento en que el turno pasó a `called`.
5. **Throughput**: `completedToday / horasTranscurridas`. Si la jornada acaba de iniciar (< 1 hora), se usa fracción de hora. Si no hay turnos completados, throughput = 0.
6. **Conteos de médicos**: Se cuentan sobre la colección `doctors` filtrada por `status`.
7. **Conteos de turnos en tiempo real**: `waiting` y `called` se cuentan sobre todos los turnos activos (no solo del día), ya que un turno puede seguir esperando desde el día anterior. `completedToday` sí se filtra por día.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad       | Almacén                  | Cambios     | Descripción                                                       |
| ------------- | ------------------------ | ----------- | ----------------------------------------------------------------- |
| `Appointment` | colección `appointments` | sin cambios | Se consulta para agregar métricas por status y calcular promedios |
| `Doctor`      | colección `doctors`      | sin cambios | Se consulta para contar disponibilidad por status                 |

#### Modelo de respuesta — OperationalMetrics (nuevo, solo DTO)

| Campo                                    | Tipo              | Descripción                                                   |
| ---------------------------------------- | ----------------- | ------------------------------------------------------------- |
| `appointments.waiting`                   | number            | Turnos activos con status `waiting`                           |
| `appointments.called`                    | number            | Turnos activos con status `called`                            |
| `appointments.completedToday`            | number            | Turnos completados hoy (desde 00:00 UTC)                      |
| `doctors.available`                      | number            | Médicos con status `available`                                |
| `doctors.busy`                           | number            | Médicos con status `busy`                                     |
| `doctors.offline`                        | number            | Médicos con status `offline`                                  |
| `performance.avgWaitTimeMinutes`         | number \| null    | Tiempo promedio de espera en minutos (null si no hay datos)   |
| `performance.avgConsultationTimeMinutes` | number \| null    | Tiempo promedio de consulta en minutos (null si no hay datos) |
| `performance.throughputPerHour`          | number            | Turnos completados por hora hoy                               |
| `generatedAt`                            | string (ISO 8601) | Timestamp de generación de las métricas                       |

#### Índices / Constraints

No se requieren índices nuevos. Las consultas de agregación utilizan los índices existentes:

- `appointments.status` (índice existente) — para conteos por estado
- `appointments.timestamp` (campo existente) — para filtrar por día
- `doctors.status` (campo existente, sin índice dedicado; volumen bajo, scan aceptable)

### API Endpoints

#### GET /metrics

- **Descripción**: Retorna métricas operativas agregadas del sistema de turnos
- **Auth requerida**: sí — Firebase `idToken` en `Authorization: Bearer`
- **Roles permitidos**: `admin`
- **Query params**: ninguno
- **Response 200**:
  ```json
  {
    "appointments": {
      "waiting": 12,
      "called": 3,
      "completedToday": 45
    },
    "doctors": {
      "available": 2,
      "busy": 3,
      "offline": 0
    },
    "performance": {
      "avgWaitTimeMinutes": 8.5,
      "avgConsultationTimeMinutes": 12.3,
      "throughputPerHour": 7.5
    },
    "generatedAt": "2026-04-05T14:30:00.000Z"
  }
  ```
- **Response 401**: Token ausente o inválido
- **Response 403**: Rol no autorizado (no es admin)

### Diseño Backend

#### Puertos y adaptadores (Hexagonal)

| Capa           | Artefacto                       | Archivo                                                      | Descripción                                                |
| -------------- | ------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| Domain         | `OperationalMetricsPort`        | `domain/ports/inbound/operational-metrics.port.ts`           | Puerto de entrada: interfaz del caso de uso                |
| Domain         | `OperationalMetricsResult`      | `domain/ports/inbound/operational-metrics.port.ts`           | Tipo de retorno con la forma de la respuesta               |
| Application    | `OperationalMetricsUseCaseImpl` | `application/use-cases/operational-metrics.use-case.impl.ts` | Implementación: agrega datos de appointments + doctors     |
| Infrastructure | `MetricsController`             | `metrics/metrics.controller.ts`                              | Controller NestJS: GET /metrics con guards                 |
| Infrastructure | `MetricsModule`                 | `metrics/metrics.module.ts`                                  | Módulo NestJS: registra controller, use case, dependencias |
| DTO            | `OperationalMetricsResponseDto` | `dto/operational-metrics-response.dto.ts`                    | DTO de respuesta con decoradores Swagger                   |

#### Dependencias del caso de uso

El `OperationalMetricsUseCaseImpl` depende de puertos outbound existentes:

- `QueryAppointmentsUseCase` (puerto existente) — para obtener todos los turnos y agregar
- `DoctorServicePort` (puerto existente) — para obtener todos los médicos y contar por status

No se requieren puertos outbound nuevos. Las queries de agregación se ejecutan sobre los datos que ya retornan `findAll()` en ambos puertos. Si el volumen crece y se necesita optimización, se puede introducir un puerto de agregación directa a MongoDB en una iteración futura.

### Diseño Frontend

#### Componentes nuevos

| Componente    | Archivo                                  | Props principales               | Descripción                                  |
| ------------- | ---------------------------------------- | ------------------------------- | -------------------------------------------- |
| `MetricCard`  | `components/MetricCard/MetricCard.tsx`   | `label, value, icon?, variant?` | Tarjeta individual de KPI con valor numérico |
| `MetricsGrid` | `components/MetricsGrid/MetricsGrid.tsx` | `metrics: OperationalMetrics`   | Grid de tarjetas organizadas por sección     |

#### Páginas nuevas

| Página               | Archivo                        | Ruta               | Protegida                      |
| -------------------- | ------------------------------ | ------------------ | ------------------------------ |
| `AdminDashboardPage` | `app/admin/dashboard/page.tsx` | `/admin/dashboard` | sí — `useRoleGuard(["admin"])` |

#### Hooks y State

| Hook                    | Archivo                          | Retorna                                | Descripción                               |
| ----------------------- | -------------------------------- | -------------------------------------- | ----------------------------------------- |
| `useOperationalMetrics` | `hooks/useOperationalMetrics.ts` | `{ metrics, loading, error, refetch }` | Fetcha métricas con auto-refresh cada 30s |

#### Services (llamadas API)

| Función                          | Archivo                      | Endpoint       |
| -------------------------------- | ---------------------------- | -------------- |
| `getOperationalMetrics(idToken)` | `services/metricsService.ts` | `GET /metrics` |

#### Tipos de dominio

| Tipo                 | Archivo                        | Descripción                                               |
| -------------------- | ------------------------------ | --------------------------------------------------------- |
| `OperationalMetrics` | `domain/OperationalMetrics.ts` | Interfaz TypeScript que refleja la respuesta del endpoint |

### Arquitectura y Dependencias

- **Paquetes nuevos requeridos**: ninguno — se usa `fetch` nativo (convención del proyecto) y CSS Modules
- **Servicios externos**: ninguno adicional — solo consultas a MongoDB vía Mongoose (existente)
- **Impacto en punto de entrada**: registrar `MetricsModule` en `app.module.ts` del producer

### Notas de Implementación

> **Cálculo de `assignedAt`**: El schema `Appointment` no almacena explícitamente la fecha de asignación. Para calcular tiempos de espera, el caso de uso debe inferir `assignedAt` como el campo `completedAt - durationSeconds*1000` para turnos asignados, o usar `timestamp` de creación como proxy del inicio de espera. Alternativa: si la precisión es insuficiente, considerar agregar un campo `assignedAt` al schema en una iteración futura.
>
> **Auto-refresh en frontend**: El hook `useOperationalMetrics` utiliza `setInterval` con 30 segundos. Se limpia en `useEffect` cleanup. No se usa WebSocket para métricas dado que son agregadas y la latencia de 30s es aceptable para un dashboard administrativo.
>
> **Formateo de valores**: Los tiempos promedio se muestran como `X.X min`. Valores `null` se renderizan como `—`. El throughput se muestra como `X.X turnos/h`.
>
> **Patrón existente**: Seguir el mismo patrón de la página `/admin/audit` (SPEC-011): `useRoleGuard(["admin"])`, header con nombre de usuario, CSS Modules, service con `fetch` y `Authorization: Bearer`.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación

- [ ] Crear puerto `OperationalMetricsPort` + tipo `OperationalMetricsResult` en `domain/ports/inbound/operational-metrics.port.ts`
- [ ] Implementar `OperationalMetricsUseCaseImpl` en `application/use-cases/operational-metrics.use-case.impl.ts` — agrega datos de appointments y doctors
- [ ] Crear `OperationalMetricsResponseDto` en `dto/operational-metrics-response.dto.ts` — con decoradores Swagger
- [ ] Crear `MetricsController` en `metrics/metrics.controller.ts` — GET /metrics con `FirebaseAuthGuard` + `RoleGuard` + `@Roles("admin")`
- [ ] Crear `MetricsModule` en `metrics/metrics.module.ts` — registra controller, caso de uso, importa dependencias
- [ ] Registrar `MetricsModule` en `app.module.ts`

#### Tests Backend

- [ ] `test_metrics_use_case_returns_correct_counts` — happy path con datos mixtos
- [ ] `test_metrics_use_case_handles_empty_data` — sin turnos ni médicos
- [ ] `test_metrics_use_case_calculates_avg_wait_time` — verifica cálculo de promedio de espera
- [ ] `test_metrics_use_case_calculates_throughput` — verifica turnos/hora
- [ ] `test_metrics_controller_returns_200_for_admin` — endpoint con admin autenticado
- [ ] `test_metrics_controller_returns_401_no_token` — sin autenticación
- [ ] `test_metrics_controller_returns_403_non_admin` — rol no autorizado

### Frontend

#### Implementación

- [ ] Crear tipo `OperationalMetrics` en `domain/OperationalMetrics.ts`
- [ ] Crear `metricsService.ts` en `services/` — `getOperationalMetrics(idToken)`
- [ ] Crear hook `useOperationalMetrics` en `hooks/` — fetch + auto-refresh 30s + loading/error
- [ ] Implementar `MetricCard` en `components/MetricCard/` — tarjeta KPI + CSS Module
- [ ] Implementar `MetricsGrid` en `components/MetricsGrid/` — layout grid de tarjetas + CSS Module
- [ ] Implementar página `AdminDashboardPage` en `app/admin/dashboard/page.tsx` — integra hook + grid + `useRoleGuard(["admin"])` + CSS Module

#### Tests Frontend

- [ ] `metricsService fetches metrics with auth header` — service unit test
- [ ] `useOperationalMetrics loads metrics on mount` — hook test
- [ ] `useOperationalMetrics auto-refreshes every 30s` — timer test
- [ ] `MetricCard renders label and value` — component test
- [ ] `MetricsGrid renders all metric sections` — component test
- [ ] `AdminDashboardPage shows metrics for admin` — page integration test
- [ ] `AdminDashboardPage blocks non-admin` — role guard test

### QA

- [ ] Ejecutar skill `/gherkin-case-generator` → criterios CRITERIO-1.1 a 1.6
- [ ] Ejecutar skill `/risk-identifier` → clasificación ASD de riesgos
- [ ] Revisar cobertura de tests contra criterios de aceptación
- [ ] Validar que todas las reglas de negocio están cubiertas
- [ ] Actualizar estado spec: `status: IMPLEMENTED`
