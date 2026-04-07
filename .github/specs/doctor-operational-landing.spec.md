---
id: SPEC-008
status: IMPLEMENTED
feature: doctor-operational-landing
created: 2026-04-05
updated: 2026-04-06
author: spec-generator
version: "1.0"
related-specs:
  - SPEC-003
  - SPEC-004
---

# Spec: Landing Operativa del Doctor

> **Estado:** `IMPLEMENTED` → frontend implementado, validado y sin bloqueos QA activos.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Crear una página operativa dedicada para el rol `doctor` en el frontend. Actualmente, tras login exitoso, el doctor es redirigido a `/` (pantalla pública de turnos), que no es coherente con su responsabilidad operativa. La nueva ruta `/doctor/dashboard` le permite ver su estado (available/busy/offline), ejecutar check-in/check-out sobre su propio contexto y ver sus pacientes asignados.

### Requerimiento de Negocio

El refinamiento de SPEC-004 identificó como gap de riesgo medio que el doctor no tiene landing dedicada tras login; su redirección actual a `/` le muestra la pantalla pública de sala de espera sin herramientas operativas. El backend ya expone los endpoints necesarios (`PATCH /doctors/:id/check-in`, `PATCH /doctors/:id/check-out`, `GET /doctors/:id`) protegidos con `DoctorContextGuard`.

### Historias de Usuario

#### HU-01: Landing operativa del doctor

```
Como:        Doctor autenticado con Perfil activo
Quiero:      Ver una pantalla dedicada con mi estado de disponibilidad y mis pacientes asignados
Para:        Operar mi check-in/check-out sin depender de la pantalla pública ni del admin

Prioridad:   Alta
Estimación:  M (Medium — 8 pts)
Dependencias: SPEC-004 (auth + perfiles + DoctorContextGuard)
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Doctor ve su dashboard tras login
  Dado que:  el doctor tiene Perfil activo con doctor_id vinculado
  Cuando:    inicia sesión exitosamente
  Entonces:  es redirigido a /doctor/dashboard
  Y          ve su nombre, consultorio y estado actual (offline por defecto)
```

```gherkin
CRITERIO-1.2: Doctor hace check-in desde su dashboard
  Dado que:  el doctor está en /doctor/dashboard con estado offline
  Cuando:    pulsa el botón "Reportar disponibilidad"
  Entonces:  el sistema llama PATCH /doctors/:id/check-in con su Bearer token
  Y          el estado visual cambia a "available"
  Y          se muestra confirmación
```

```gherkin
CRITERIO-1.3: Doctor hace check-out desde su dashboard
  Dado que:  el doctor está en /doctor/dashboard con estado available y sin paciente asignado
  Cuando:    pulsa el botón "Salir de consultorio"
  Entonces:  el sistema llama PATCH /doctors/:id/check-out con su Bearer token
  Y          el estado visual cambia a "offline"
```

**Error Path**

```gherkin
CRITERIO-1.4: Doctor intenta check-out con paciente asignado
  Dado que:  el doctor tiene estado busy (paciente en atención)
  Cuando:    intenta hacer check-out
  Entonces:  el sistema muestra error "Tiene un paciente asignado, no puede salir del consultorio"
  Y          el estado no cambia
```

```gherkin
CRITERIO-1.5: Doctor sin doctor_id intenta acceder al dashboard
  Dado que:  el doctor autenticado tiene Perfil activo pero doctor_id es null
  Cuando:    accede a /doctor/dashboard
  Entonces:  ve mensaje de error indicando que su perfil no está vinculado a un médico
  Y          no puede ejecutar check-in/check-out
```

**Edge Case**

```gherkin
CRITERIO-1.6: No-doctor intenta acceder a /doctor/dashboard
  Dado que:  un usuario con rol admin o recepcionista navega a /doctor/dashboard
  Cuando:    la página carga
  Entonces:  RoleGate bloquea el acceso y muestra mensaje de permisos insuficientes
```

### Reglas de Negocio

1. Solo el rol `doctor` puede acceder a `/doctor/dashboard`.
2. El doctor solo opera sobre su propio `doctor_id` (enforcement ya existe en backend via `DoctorContextGuard`).
3. Check-out bloqueado si el doctor tiene un paciente asignado (status `busy`).
4. La redirección post-login del doctor cambia de `/` a `/doctor/dashboard`.

---

## 2. DISEÑO

### Modelos de Datos

Sin cambios de modelo. El backend ya expone:

- `GET /doctors/:id` — estado del doctor
- `PATCH /doctors/:id/check-in` — transición a available
- `PATCH /doctors/:id/check-out` — transición a offline
- `GET /appointments?status=called&doctorId=:id` — pacientes asignados (si el endpoint soporta filtro)

### API Endpoints

Sin endpoints nuevos. Se consumen los existentes de `DoctorController` (SPEC-003/SPEC-004).

### Diseño Frontend

#### Componentes nuevos

| Componente         | Archivo                                            | Props principales                                    | Descripción                                              |
| ------------------ | -------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| `DoctorStatusCard` | `components/DoctorStatusCard/DoctorStatusCard.tsx` | `doctor: DoctorView, onCheckIn, onCheckOut, loading` | Tarjeta con estado actual del doctor y botones de acción |

#### Páginas nuevas

| Página                | Archivo                         | Ruta                | Protegida                          |
| --------------------- | ------------------------------- | ------------------- | ---------------------------------- |
| `DoctorDashboardPage` | `app/doctor/dashboard/page.tsx` | `/doctor/dashboard` | Sí — `RoleGate roles={["doctor"]}` |

#### Hooks y State

| Hook                 | Archivo                       | Retorna                                                  | Descripción                                        |
| -------------------- | ----------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `useDoctorDashboard` | `hooks/useDoctorDashboard.ts` | `{ doctor, loading, error, checkIn, checkOut, refetch }` | Estado del doctor + acciones de check-in/check-out |

#### Services (llamadas API)

| Función                     | Archivo                     | Endpoint                       |
| --------------------------- | --------------------------- | ------------------------------ |
| `getDoctorById(id, token)`  | `services/doctorService.ts` | `GET /doctors/:id`             |
| `checkInDoctor(id, token)`  | `services/doctorService.ts` | `PATCH /doctors/:id/check-in`  |
| `checkOutDoctor(id, token)` | `services/doctorService.ts` | `PATCH /doctors/:id/check-out` |

#### Cambio en redirección post-login

En `app/login/page.tsx`, cambiar:

```typescript
// Antes
} else {
  router.replace("/");
}

// Después
} else if (profile.role === "doctor") {
  router.replace("/doctor/dashboard");
} else {
  router.replace("/");
}
```

### Notas de Implementación

- `useDoctorDashboard` extrae `doctor_id` del perfil actual via `useAuth().profile.doctor_id`.
- Si `doctor_id` es null, el hook no hace fetch y expone un error estático.
- El componente `DoctorStatusCard` usa CSS Modules y el patrón visual existente del proyecto.
- No agregar dependencias externas.

---

## 3. LISTA DE TAREAS

### Backend

No hay tareas backend — endpoints ya existen.

### Frontend

#### Implementación

- [x] Crear `services/doctorService.ts` con funciones `getDoctorById`, `checkInDoctor`, `checkOutDoctor`
- [x] Crear `hooks/useDoctorDashboard.ts` — consume doctorService + useAuth
- [x] Crear `components/DoctorStatusCard/DoctorStatusCard.tsx` + `DoctorStatusCard.module.css`
- [x] Crear `app/doctor/dashboard/page.tsx` con `RoleGate` + `DoctorStatusCard`
- [x] Actualizar redirección en `app/login/page.tsx` — doctor → `/doctor/dashboard`

#### Tests Frontend

- [x] Test `useDoctorDashboard` — fetch exitoso, check-in, check-out, error handling
- [x] Test `DoctorStatusCard` — render por estado, click en acciones, estado disabled
- [x] Test `DoctorDashboardPage` — RoleGate bloquea no-doctor, render con doctor activo
- [x] Test `LoginPage` — redirección de doctor a `/doctor/dashboard`
