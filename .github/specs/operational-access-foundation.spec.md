id: SPEC-004
status: IMPLEMENTED
feature: operational-access-foundation
created: 2026-04-05
updated: 2026-04-05
author: spec-generator
version: "2.0"
related-specs: [smart-appointment-management]
deadline: 2026-04-07

---

# Spec: Base de Acceso Operativo, Roles y Ecosistema de Calidad

> **Estado:** `IMPLEMENTED` — implementacion completada con validacion de tests, CI y cierre QA del alcance de SPEC-004.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED
> **Deadline:** Martes 7 de abril de 2026 — todo funcional, con tests, CI/CD y documentacion QA.

---

## 0. OBJETIVO Y ALCANCE GENERAL

### Objetivo

Implementar la **Base de Acceso Operativo** (autenticacion Firebase, perfiles, roles) sobre el sistema de turnos medicos existente, acompanada de un **ecosistema de calidad completo** que cumpla con los estandares de:

| Semana | Eje evaluado                                    | Entregables clave                                                               |
| ------ | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| **S2** | TDD IA-Native, Verify vs Validate, Zero Errors  | `TESTING_STRATEGY.md`, suite 100% verde, reportes Jest                          |
| **S3** | DevOps, CI/CD, Testing Multinivel, GitFlow      | Pipeline `.github/workflows/`, `TEST_PLAN.md`, Dockerfiles seguros, Release tag |
| **S4** | QA Automation, INVEST, Gherkin, Refinamiento IA | `BUSINESS_CONTEXT.md`, `USER_STORIES_REFINEMENT.md`, `TEST_CASES_AI.md`         |

### Alcance funcional

- Login para personal interno via Firebase Auth
- Perfiles operativos con rol (`admin`, `recepcionista`, `doctor`)
- Proteccion por rol de los modulos existentes (turnos, medicos, perfiles)
- Modulo de administracion de perfiles (CRUD admin-only)
- Pantalla publica de espera permanece sin auth (no romper demo realtime)

### Fuera de alcance

- Signup publico, recuperacion de password, MFA
- RBAC granular avanzado o permisos a nivel campo
- Proteccion de WebSocket con idToken (extension futura)
- Migracion de datos existentes a perfiles

---

## 1. REQUERIMIENTOS

### Descripcion

El sistema actual de turnos medicos ya tiene logica fuerte de negocio (asignacion inteligente, prioridad, cola, WebSocket realtime), pero todavia opera sin identidad de usuario ni permisos reales. Esta funcionalidad agrega autenticacion, perfiles operativos y autorizacion por rol para que los modulos existentes de registro, administracion de medicos y operacion diaria ofrezcan **valor de producto** y no solo valor tecnico.

El ecosistema de calidad (TDD, CI/CD, documentacion QA) se construye **en simultanea** con la feature para demostrar que la calidad es parte del desarrollo, no un paso posterior.

### Requerimiento de Negocio

Antes de seguir ampliando la inteligencia del motor de asignacion, el sistema debe dejar de ser anonimo. Se requiere una base minima de acceso operativo con autenticacion, perfiles y roles para que exista responsabilidad sobre las acciones, control de acceso a los modulos y una demostracion clara de valor al negocio.

### Historias de Usuario

> Todas las HUs fueron analizadas bajo principios **INVEST** (Independent, Negotiable, Valuable, Estimable, Small, Testable).

---

#### HU-01: Inicio de sesion con perfil operativo

```
Como:        Usuario interno (recepcionista, admin o doctor)
Quiero:      Iniciar sesion con mi cuenta institucional y recuperar mi perfil operativo
Para:        Acceder unicamente a los modulos permitidos por mi rol,
             garantizando trazabilidad de mis acciones en el sistema

Prioridad:   Alta
Estimacion:  S (3-5 puntos)
Dependencias: Ninguna (primera historia del pipeline)
Capa:        Ambas (Backend + Frontend)
```

**Analisis INVEST — HU-01:**

| Principio       | Cumple | Justificacion                                                                                    |
| --------------- | ------ | ------------------------------------------------------------------------------------------------ |
| **I**ndependent | Si     | No depende de otras HUs. Firebase Auth es externo y el schema Profile se crea aqui.              |
| **N**egotiable  | Si     | El mecanismo de login (email/password vs Google provider) es negociable sin afectar el contrato. |
| **V**aluable    | Si     | Sin login no hay identidad; habilita todo el sistema de permisos y trazabilidad.                 |
| **E**stimable   | Si     | Scope acotado: 1 guard backend + 1 endpoint session + 1 form login + 1 hook useAuth.             |
| **S**mall       | Si     | Entregable en < 1 dia. No incluye signup, MFA ni recuperacion de password.                       |
| **T**estable    | Si     | Criterios Gherkin con happy path, error path y edge case. Verificable con mocks de Firebase.     |

#### Criterios de Aceptacion - HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Login exitoso con perfil activo
  Dado que:  el Usuario interno tiene una cuenta valida y un Perfil activo en el sistema
  Cuando:    inicia sesion desde la pantalla de login
  Entonces:  el sistema obtiene un idToken valido, resuelve el Perfil asociado
  Y:         devuelve el rol del Usuario
  Y:         redirige al modulo inicial permitido por su rol
```

**Error Path**

```gherkin
CRITERIO-1.2: Token valido sin Perfil operativo
  Dado que:  el Usuario autentica correctamente su cuenta
  Cuando:    el backend intenta resolver su Perfil
  Entonces:  responde HTTP 403 indicando "Perfil no configurado"
  Y:         el frontend no habilita acceso a modulos internos
```

**Edge Case** _(si aplica)_

```gherkin
CRITERIO-1.3: Sesion expirada en ruta protegida
  Dado que:  el Usuario ya habia ingresado al sistema
  Cuando:    el idToken expira o deja de ser valido
  Entonces:  la siguiente llamada protegida responde HTTP 401
  Y:         el frontend limpia la sesion local
  Y:         redirige a /login
```

#### HU-02: Administracion de perfiles y roles

```
Como:        Administrador del sistema
Quiero:      Crear, activar, desactivar y actualizar Perfiles operativos asignando roles
Para:        Habilitar o deshabilitar personal interno sin intervencion manual en la base de datos,
             manteniendo control centralizado del acceso al sistema

Prioridad:   Alta
Estimacion:  M (5-8 puntos)
Dependencias: HU-01 (requiere AuthGuard funcional para proteger el CRUD)
Capa:        Ambas (Backend + Frontend)
```

**Analisis INVEST — HU-02:**

| Principio       | Cumple  | Justificacion                                                                           |
| --------------- | ------- | --------------------------------------------------------------------------------------- |
| **I**ndependent | Parcial | Depende de HU-01 para auth, pero su logica de negocio (CRUD Profiles) es autocontenida. |
| **N**egotiable  | Si      | Campos del perfil, reglas de validacion y UI del formulario son negociables.            |
| **V**aluable    | Si      | Elimina la necesidad de acceso directo a MongoDB para gestionar personal.               |
| **E**stimable   | Si      | CRUD estandar con 4 endpoints, 1 pagina admin, 1 modal de formulario. Scope claro.      |
| **S**mall       | Si      | No incluye bulk import, audit log de cambios ni notificaciones por cambio de rol.       |
| **T**estable    | Si      | Criterios para creacion, duplicado, desactivacion. Cada validacion es asercionable.     |

#### Criterios de Aceptacion - HU-02

**Happy Path**

```gherkin
CRITERIO-2.1: Creacion de Perfil operativo
  Dado que:  el Administrador esta autenticado
  Cuando:    registra un Perfil con uid, email, nombre visible y rol "recepcionista"
  Entonces:  el sistema crea el Perfil con status="active"
  Y:         responde HTTP 201 con el Perfil creado
```

**Error Path**

```gherkin
CRITERIO-2.2: Duplicado de Perfil
  Dado que:  ya existe un Perfil con el mismo uid o email
  Cuando:    el Administrador intenta crear otro Perfil con esos datos
  Entonces:  el sistema responde HTTP 409
  Y:         informa que el Perfil ya existe
```

**Edge Case** _(si aplica)_

```gherkin
CRITERIO-2.3: Desactivacion de Perfil en uso
  Dado que:  un Usuario tiene sesion activa y su Perfil es desactivado por un Administrador
  Cuando:    el Usuario hace una nueva llamada protegida
  Entonces:  el sistema responde HTTP 403 por Perfil inactivo
  Y:         no permite continuar operando
```

#### HU-03: Acceso por rol a los modulos operativos existentes

```
Como:        Usuario interno con perfil activo
Quiero:      Acceder solo a los modulos permitidos por mi rol (registro de turnos,
             administracion de medicos, gestion de perfiles) y que el sistema bloquee
             los que no me corresponden
Para:        Operar el sistema con responsabilidad, sin exponer funciones indebidas
             y garantizando separacion de responsabilidades entre actores

Prioridad:   Alta
Estimacion:  M (5-8 puntos)
Dependencias: HU-01, HU-02 (requiere auth + perfiles existentes para aplicar guards)
Capa:        Ambas (Backend + Frontend)
```

**Analisis INVEST — HU-03:**

| Principio       | Cumple  | Justificacion                                                                                     |
| --------------- | ------- | ------------------------------------------------------------------------------------------------- |
| **I**ndependent | Parcial | Requiere HU-01 y HU-02, pero su valor (control de acceso) es completamente distinto al CRUD.      |
| **N**egotiable  | Si      | La matrix de permisos (que rol accede a que modulo) es configurable sin cambiar arquitectura.     |
| **V**aluable    | Si      | Es el pegamento que da sentido a auth + perfiles: sin esto, los roles existen pero no se aplican. |
| **E**stimable   | Si      | Scope finito: RoleGuard backend + RoleGate frontend + proteccion de 5 endpoints existentes.       |
| **S**mall       | Si      | No incluye permisos a nivel campo, ACL dinamico ni configuracion de permisos en runtime.          |
| **T**estable    | Si      | Matrix de permisos 3x5 (roles x modulos) completamente verificable con tests parametrizados.      |

#### Criterios de Aceptacion - HU-03

**Happy Path**

```gherkin
CRITERIO-3.1: Recepcionista accede al modulo de registro
  Dado que:  el Usuario tiene rol "recepcionista" y Perfil activo
  Cuando:    ingresa a /registration y registra un turno
  Entonces:  el sistema permite el acceso a la pantalla
  Y:         envia la peticion autenticada a POST /appointments
  Y:         el backend responde HTTP 202 si el payload es valido
```

```gherkin
CRITERIO-3.2: Administrador accede a perfiles y medicos
  Dado que:  el Usuario tiene rol "admin"
  Cuando:    ingresa a la administracion de Perfiles y al modulo de medicos
  Entonces:  el sistema le permite listar, crear y actualizar Perfiles
  Y:         tambien le permite crear medicos y consultar su disponibilidad
```

**Error Path**

```gherkin
CRITERIO-3.3: Rol no autorizado en modulo protegido
  Dado que:  el Usuario tiene rol "doctor"
  Cuando:    intenta acceder a /registration o invocar POST /appointments
  Entonces:  el frontend bloquea la ruta
  Y:         el backend responde HTTP 403 si la peticion llega directamente
```

**Edge Case** _(si aplica)_

```gherkin
CRITERIO-3.4: Medico opera solo su propio contexto
  Dado que:  el Usuario tiene rol "doctor" y su Perfil esta enlazado a un Doctor existente
  Cuando:    intenta ejecutar check-in o check-out
  Entonces:  solo puede operar sobre su propio doctorId enlazado
  Y:         el sistema responde HTTP 403 si intenta actuar sobre otro medico
```

### Reglas de Negocio

1. Todo endpoint operativo interno requiere autenticacion con `Authorization: Bearer <idToken>` validado contra Firebase Auth.
2. Todo acceso autenticado requiere un `Profile` activo; token valido sin Perfil activo no autoriza operacion.
3. Los roles permitidos en esta fase son `admin`, `recepcionista` y `doctor`.
4. Solo `admin` puede crear, actualizar o desactivar Perfiles.
5. Solo `admin` y `recepcionista` pueden usar el modulo de registro de turnos y `POST /appointments`.
6. El rol `doctor` solo puede operar acciones vinculadas a su propio `doctorId` asociado en el `Profile`.
7. La pantalla publica de espera puede permanecer fuera de autenticacion en esta fase para no romper la demo realtime existente.

### Matrix de Permisos por Rol

| Modulo / Endpoint              | `admin` | `recepcionista` | `doctor`    | Publico             |
| ------------------------------ | ------- | --------------- | ----------- | ------------------- |
| `POST /auth/session`           | Si      | Si              | Si          | No (requiere token) |
| `GET /profiles/me`             | Si      | Si              | Si          | No                  |
| `POST /profiles`               | **Si**  | No (403)        | No (403)    | No                  |
| `GET /profiles`                | **Si**  | No (403)        | No (403)    | No                  |
| `PATCH /profiles/{uid}`        | **Si**  | No (403)        | No (403)    | No                  |
| `POST /appointments`           | Si      | **Si**          | No (403)    | No                  |
| `POST /doctors`                | **Si**  | No (403)        | No (403)    | No                  |
| `GET /doctors`                 | Si      | Si              | Si          | No                  |
| `PATCH /doctors/:id/check-in`  | Si      | No (403)        | Solo propio | No                  |
| `PATCH /doctors/:id/check-out` | Si      | No (403)        | Solo propio | No                  |
| Pantalla `/waiting-room`       | —       | —               | —           | **Si**              |

### Estrategia de Verificar vs Validar (Semana 2)

> **Verificar** = comprobar que la implementacion tecnica funciona correctamente (el codigo respeta interfaces, contratos y flujos).
> **Validar** = comprobar que las reglas de negocio se protegen incluso bajo condiciones adversas.

| Tipo                    | Que se prueba                                                    | Ejemplo concreto                                          |
| ----------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| **Verificar (tecnico)** | Que `AuthGuard` llama a Firebase Admin para decodificar el token | `test_auth_guard_calls_firebase_verify_id_token`          |
| **Verificar (tecnico)** | Que `ProfileRepository` busca por `uid` unico                    | `test_profile_repository_find_by_uid`                     |
| **Verificar (tecnico)** | Que `RoleGuard` lee el rol del request decorado                  | `test_role_guard_reads_role_from_request`                 |
| **Verificar (tecnico)** | Que `LoginForm` renderiza campos email y password                | `LoginForm renders email and password inputs`             |
| **Validar (negocio)**   | Que un token valido SIN perfil activo NO autoriza operacion      | `test_auth_session_missing_profile_returns_403`           |
| **Validar (negocio)**   | Que un doctor NO puede hacer check-in de OTRO medico             | `test_doctor_check_in_returns_403_when_operating_other`   |
| **Validar (negocio)**   | Que un perfil duplicado por email genera conflicto 409           | `test_profile_service_create_duplicate_raises_conflict`   |
| **Validar (negocio)**   | Que un recepcionista NO puede crear perfiles                     | `test_profiles_controller_post_returns_403_for_non_admin` |
| **Validar (negocio)**   | Que un doctor desactivado pierde acceso inmediatamente           | `test_deactivated_profile_returns_403_on_next_call`       |

---

## 2. DISENO

### Modelos de Datos

#### Entidades afectadas

| Entidad   | Almacen              | Cambios    | Descripcion                                                    |
| --------- | -------------------- | ---------- | -------------------------------------------------------------- |
| `Profile` | coleccion `profiles` | nueva      | Perfil operativo del Usuario autenticado mediante Firebase     |
| `Doctor`  | coleccion `doctors`  | modificada | Agrega vinculacion opcional con `uid` o `doctor_id` del Perfil |

#### Campos del modelo

| Campo          | Tipo           | Obligatorio | Validacion                             | Descripcion                        |
| -------------- | -------------- | ----------- | -------------------------------------- | ---------------------------------- |
| `uid`          | string         | si          | UID valido Firebase, unico             | Identificador canonico del Usuario |
| `email`        | string         | si          | email valido, unico                    | Correo institucional del Usuario   |
| `display_name` | string         | si          | max 100 chars                          | Nombre visible del Usuario         |
| `role`         | string         | si          | `admin` \| `recepcionista` \| `doctor` | Rol operativo                      |
| `status`       | string         | si          | `active` \| `inactive`                 | Estado del Perfil                  |
| `doctor_id`    | string \| null | no          | referencia a `Doctor` existente        | Enlace requerido para rol `doctor` |
| `created_at`   | datetime (UTC) | si          | auto-generado                          | Timestamp creacion                 |
| `updated_at`   | datetime (UTC) | si          | auto-generado                          | Timestamp actualizacion            |

#### Indices / Constraints

- Indice unico sobre `uid` en `profiles`.
- Indice unico sobre `email` en `profiles`.
- Indice compuesto `{ role: 1, status: 1 }` para filtros operativos.
- Constraint de integridad: si `role = doctor`, `doctor_id` debe existir y referenciar un medico valido.

### API Endpoints

#### POST /auth/session

- **Descripcion**: Valida el `idToken` del Usuario y resuelve su Perfil operativo.
- **Auth requerida**: si (Bearer Firebase `idToken`)
- **Request Body**:
  ```json
  {}
  ```
- **Response 200**:
  ```json
  {
    "uid": "firebase_uid_123",
    "email": "recepcion@clinic.local",
    "display_name": "Recepcion Principal",
    "role": "recepcionista",
    "status": "active",
    "doctor_id": null,
    "allowed_modules": ["registration", "dashboard"]
  }
  ```
- **Response 401**: token ausente, expirado o invalido
- **Response 403**: Perfil no configurado o inactivo

#### GET /profiles/me

- **Descripcion**: Obtiene el Perfil del Usuario autenticado.
- **Auth requerida**: si
- **Response 200**:
  ```json
  {
    "uid": "firebase_uid_123",
    "email": "admin@clinic.local",
    "display_name": "Admin Central",
    "role": "admin",
    "status": "active",
    "doctor_id": null,
    "created_at": "2026-04-05T14:00:00Z",
    "updated_at": "2026-04-05T14:00:00Z"
  }
  ```
- **Response 401**: sin token valido
- **Response 403**: Perfil inactivo

#### POST /profiles

- **Descripcion**: Crea un nuevo Perfil operativo.
- **Auth requerida**: si (`admin`)
- **Request Body**:
  ```json
  {
    "uid": "firebase_uid_123",
    "email": "doctor@clinic.local",
    "display_name": "Dr. Laura Torres",
    "role": "doctor",
    "doctor_id": "67f01abc1234def567890123"
  }
  ```
- **Response 201**:
  ```json
  {
    "uid": "firebase_uid_123",
    "role": "doctor",
    "status": "active",
    "doctor_id": "67f01abc1234def567890123",
    "created_at": "2026-04-05T14:00:00Z",
    "updated_at": "2026-04-05T14:00:00Z"
  }
  ```
- **Response 400**: rol invalido o `doctor_id` faltante para rol `doctor`
- **Response 401**: sin token valido
- **Response 403**: rol distinto de `admin`
- **Response 409**: Perfil duplicado por `uid` o `email`

#### GET /profiles

- **Descripcion**: Lista Perfiles operativos.
- **Auth requerida**: si (`admin`)
- **Request Query**:
  - `role` (opcional)
  - `status` (opcional)
  - `page` (opcional, default `1`)
  - `limit` (opcional, default `20`, max `100`)
- **Response 200**:
  ```json
  {
    "data": [
      {
        "uid": "firebase_uid_123",
        "email": "recepcion@clinic.local",
        "display_name": "Recepcion Principal",
        "role": "recepcionista",
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  }
  ```
- **Response 401**: sin token valido
- **Response 403**: rol distinto de `admin`

#### PATCH /profiles/{uid}

- **Descripcion**: Actualiza rol, estado o vinculacion operativa de un Perfil.
- **Auth requerida**: si (`admin`)
- **Request Body**:
  ```json
  {
    "role": "doctor",
    "status": "active",
    "doctor_id": "67f01abc1234def567890123"
  }
  ```
- **Response 200**: Perfil actualizado
- **Response 400**: combinacion invalida de datos
- **Response 404**: Perfil no encontrado

#### POST /appointments

- **Descripcion**: Reutiliza el endpoint existente de creacion de turnos, ahora protegido por rol.
- **Auth requerida**: si (`admin` o `recepcionista`)
- **Request Body**:
  ```json
  {
    "idCard": 123456789,
    "fullName": "Paciente Demo",
    "priority": "high"
  }
  ```
- **Response 202**: turno aceptado para procesamiento
- **Response 401**: sin token valido
- **Response 403**: rol no autorizado

#### PATCH /doctors/{id}/check-in

- **Descripcion**: Reutiliza el endpoint existente de disponibilidad, ahora protegido por rol y contexto.
- **Auth requerida**: si (`admin` o `doctor` propietario)
- **Response 200**: medico disponible
- **Response 401**: sin token valido
- **Response 403**: intento de operar otro medico
- **Response 404**: medico no encontrado

### Diseno Frontend

#### Componentes nuevos

| Componente         | Archivo                                            | Props principales               | Descripcion                 |
| ------------------ | -------------------------------------------------- | ------------------------------- | --------------------------- |
| `LoginForm`        | `components/LoginForm/LoginForm.tsx`               | `onSubmit, loading, error`      | Formulario de autenticacion |
| `RoleGate`         | `components/RoleGate/RoleGate.tsx`                 | `roles, fallback, children`     | Bloqueo visual por rol      |
| `ProfileFormModal` | `components/ProfileFormModal/ProfileFormModal.tsx` | `isOpen, initialData, onSubmit` | Alta y edicion de Perfiles  |

#### Paginas nuevas

| Pagina         | Archivo                       | Ruta              | Protegida |
| -------------- | ----------------------------- | ----------------- | --------- |
| `LoginPage`    | `app/login/page.tsx`          | `/login`          | no        |
| `ProfilesPage` | `app/admin/profiles/page.tsx` | `/admin/profiles` | si        |

#### Hooks y State

| Hook           | Archivo                 | Retorna                                              | Descripcion                             |
| -------------- | ----------------------- | ---------------------------------------------------- | --------------------------------------- |
| `useAuth`      | `hooks/useAuth.ts`      | `{ user, profile, loading, login, logout }`          | Fuente unica de verdad de autenticacion |
| `useProfiles`  | `hooks/useProfiles.ts`  | `{ items, loading, error, create, update, refetch }` | Administracion de Perfiles              |
| `useRoleGuard` | `hooks/useRoleGuard.ts` | `{ allowed, redirectTo }`                            | Resolucion local de permisos por ruta   |

#### Services (llamadas API)

| Funcion                             | Archivo                      | Endpoint                |
| ----------------------------------- | ---------------------------- | ----------------------- |
| `signInWithFirebase(credentials)`   | `services/authService.ts`    | Firebase Auth           |
| `resolveSession(idToken)`           | `services/authService.ts`    | `POST /auth/session`    |
| `getMyProfile(idToken)`             | `services/profileService.ts` | `GET /profiles/me`      |
| `getProfiles(filters, idToken)`     | `services/profileService.ts` | `GET /profiles`         |
| `createProfile(data, idToken)`      | `services/profileService.ts` | `POST /profiles`        |
| `updateProfile(uid, data, idToken)` | `services/profileService.ts` | `PATCH /profiles/{uid}` |

### Arquitectura y Dependencias

- Paquetes nuevos requeridos:
  - Frontend: Firebase Web SDK
  - Backend Producer: Firebase Admin SDK o verificador equivalente de `idToken`
- Servicios externos: Firebase Auth para identidad y emision de `idToken`
- Impacto en punto de entrada de la app:
  - Frontend: agregar `AuthProvider` en `app/layout.tsx` y proteger rutas por rol
  - Backend Producer: agregar `AuthGuard` + `RoleGuard` a endpoints HTTP existentes
  - Modulo actual de turnos inteligentes permanece intacto en su logica de negocio; solo cambia su capa de acceso

### Notas de Implementacion

- Esta spec busca valor demostrable rapido: identidad, perfiles y permisos sobre modulos ya construidos.
- La pantalla publica de espera puede mantenerse sin autenticacion en esta fase para no bloquear la demo realtime.
- No se incluye signup publico, recuperacion de password, MFA ni RBAC granular avanzado.
- Si el equipo decide proteger tambien WebSocket con el mismo `idToken`, debe planificarse como extension controlada y no como condicion obligatoria de esta fase.

### Diseno CI/CD Pipeline (Semana 3)

#### Arquitectura del Pipeline

```yaml
# .github/workflows/ci.yml
# Estructura de Jobs (separacion visual obligatoria)

trigger: push to develop, PR to main

jobs:
  ┌─────────────────────────────────────────────────────────────┐
  │ lint-and-build                                               │
  │   - ESLint backend producer + consumer + frontend            │
  │   - TypeScript compile check (tsc --noEmit)                  │
  │   - Build de produccion (npm run build)                      │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────┴──────────────────────────────────┐
  │ component-tests (Job separado — Caja Blanca)                 │
  │   - Backend Producer unit tests (jest --testPathPattern unit)│
  │   - Backend Consumer unit tests                              │
  │   - Frontend unit tests (jest)                               │
  │   - Coverage reports (lcov + json)                           │
  │   - Quality gate: >= 80% lines coverage                      │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────┴──────────────────────────────────┐
  │ integration-tests (Job separado — Caja Negra incluida)       │
  │   - Levanta MongoDB + RabbitMQ via services                  │
  │   - Backend integration tests contra servicios reales        │
  │   - E2E: flujo API real (POST /appointments → cola → assign) │
  │   - Upload de reportes como artifacts                        │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────┴──────────────────────────────────┐
  │ docker-security                                              │
  │   - Build imagenes Docker (producer, consumer, frontend)     │
  │   - Docker Scout / Trivy scan de vulnerabilidades            │
  │   - Fail si hay vulnerabilidades CRITICAL o HIGH             │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────┴──────────────────────────────────┐
  │ deploy-ready (solo en PR to main)                            │
  │   - Validar que todos los jobs anteriores pasaron            │
  │   - Comentar PR con resumen de coverage + scan               │
  └─────────────────────────────────────────────────────────────┘
```

#### Criterios de aceptacion del Pipeline

- [ ] Jobs de Component e Integration visualmente separados en GitHub Actions
- [ ] Prueba de Caja Negra: flujo API completo ejecutandose contra servicios reales en contenedores
- [ ] Reporte de cobertura legible como artifact descargable
- [ ] Escaneo de vulnerabilidades Docker con output visible en el pipeline
- [ ] Quality gate: pipeline falla si cobertura < 80% o vulnerabilidades criticas
- [ ] Branch protection: main requiere pipeline verde para merge

### Mejoras Dockerfiles (Semana 3)

#### Frontend Dockerfile (actualmente no multi-stage ni non-root)

```dockerfile
# ANTES: single-stage, root, no build
FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "run", "dev"]

# DESPUES: multi-stage, non-root, optimizado
# --- Stage: development ---
FROM node:20-slim AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev", "--", "-p", "3001", "-H", "0.0.0.0"]

# --- Stage: build ---
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage: production ---
FROM node:20-slim AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --chown=node:node --from=build /app/.next ./.next
COPY --chown=node:node --from=build /app/public ./public
EXPOSE 3001
USER node
CMD ["npm", "start"]
```

#### Mejoras comunes a todos los Dockerfiles

- Imagen base `node:20-slim` (ya cumple — ligera)
- Multi-stage build con targets `development`, `build`, `production`
- `USER node` en stage production (no root)
- `.dockerignore` actualizado: `node_modules`, `.git`, `coverage`, `*.md`
- Escaneo con `docker scout cves` o `trivy image` en pipeline

### Estrategia GitFlow (Semana 3)

```
main (protegida, solo releases)
  └── develop (integracion continua)
       ├── feature/spec-004-auth-backend
       ├── feature/spec-004-auth-frontend
       ├── feature/spec-004-ci-pipeline
       ├── feature/spec-004-qa-docs
       └── release/v2.0.0 → PR formal a main con tag
```

**Criterios de aceptacion GitFlow:**

- [ ] Branch protection en `main`: requiere PR + pipeline verde + 1 approval
- [ ] Ramas `feature/*` creadas desde `develop`
- [ ] PR de `develop` → `main` como Release formal
- [ ] Tag semantico `v2.0.0` en el merge a main
- [ ] Commits siguiendo Conventional Commits (`feat:`, `fix:`, `test:`, `ci:`, `docs:`)

### Arquitectura de Tests (Semana 2 + 3)

#### Piramide de Testing aplicada

```
         ╱╲
        ╱E2E╲           ~5%  → Flujo API Caja Negra (POST → queue → assign)
       ╱──────╲
      ╱Integrac╲        ~20% → Guards + Controllers con servicios reales mock
     ╱──────────╲
    ╱  Unitarios  ╲     ~75% → Services, Repositories, Hooks, Components
   ╱────────────────╲
```

#### Distribucion de tests nuevos (esta feature)

| Nivel                         | Tipo                                                             | Cantidad estimada    | Ubicacion            |
| ----------------------------- | ---------------------------------------------------------------- | -------------------- | -------------------- |
| **Unit (Caja Blanca)**        | ProfileService, AuthGuard, RoleGuard, useAuth, RoleGate          | ~20 tests            | `test/src/`, `test/` |
| **Integration (Caja Blanca)** | ProfileController + AuthGuard + DB mock, auth flow e2e           | ~8 tests             | `test/src/`          |
| **E2E (Caja Negra)**          | Flujo completo: login → crear perfil → registrar turno protegido | ~3 tests             | `backend/e2e/`       |
| **Frontend Unit**             | LoginForm, ProfilesPage, RoleGate, useAuth, useProfiles          | ~10 tests            | `test/`              |
| Total estimado                |                                                                  | **~41 tests nuevos** |                      |

#### Metodologia TDD (Red-Green-Refactor)

Evidencia requerida en cada commit:

1. **RED**: Commit con test que falla (ej: `test: RED - auth guard rejects missing token`)
2. **GREEN**: Commit con implementacion minima que hace pasar el test (ej: `feat: GREEN - auth guard validates bearer token`)
3. **REFACTOR**: Commit de limpieza sin romper tests (ej: `refactor: extract token parsing to helper`)

> **Convecion de commits TDD**: prefijo `test: RED -` / `feat: GREEN -` / `refactor:` para evidencia Git.

### Entregables de Documentacion QA (Semana 4)

#### BUSINESS_CONTEXT.md

Plantilla de contexto de negocio diligenciada que sirvio de entrada para el analisis IA:

- Nombre del proyecto y descripcion
- Stack tecnologico completo
- Actores del sistema (admin, recepcionista, doctor, paciente)
- Flujos criticos de negocio
- Restricciones y regulaciones aplicables
- Integraciones externas (Firebase, RabbitMQ, MongoDB)

#### USER_STORIES_REFINEMENT.md

Informe comparativo de 3 HUs analizadas:

| Columna                | Contenido                                                    |
| ---------------------- | ------------------------------------------------------------ |
| HU original            | Texto original pre-refinamiento                              |
| HU refinada por IA     | Version mejorada con INVEST, criterios de seguridad, tiempos |
| Diferencias detectadas | Que agrego la IA, que falto, que se ajusto                   |

#### TEST_CASES_AI.md

Matriz de casos de prueba generados con tabla de ajustes:

| ID    | Caso generado por IA | Ajuste del probador                                  | Justificacion del ajuste         |
| ----- | -------------------- | ---------------------------------------------------- | -------------------------------- |
| TC-01 | Login exitoso        | Agregar validacion de token expirado en 1h           | La IA no considero TTL del token |
| TC-02 | Crear perfil admin   | Agregar intento de crear perfil con email malformado | La IA solo probo happy path      |

### Entregables de Estrategia (Semana 2 + 3)

#### TESTING_STRATEGY.md (Semana 2)

Documento que define la estrategia de QA diferenciando Verificar vs Validar:

1. **Objetivo de la estrategia** — por que testeamos y que protegemos
2. **Metodologia TDD** — ciclo Red-Green-Refactor con evidencia Git
3. **Tabla Verificar vs Validar** — cada test categorizado (ver seccion 1)
4. **Mocks y aislamiento** — que se mockea y por que (Firebase Admin, MongoDB, RabbitMQ)
5. **Cobertura objetivo** — >= 80% lines como quality gate
6. **Herramientas** — Jest, Testing Library, ESLint, coverage reporters

#### TEST_PLAN.md (Semana 3)

Informe tecnico profesional:

1. **Resumen ejecutivo** — alcance, riesgos, criterios de salida
2. **Test Suites** — listado con nombre, nivel (unit/integration/e2e), herramienta
3. **Test Cases** — ID, descripcion, precondicion, pasos, resultado esperado, prioridad
4. **Los 7 Principios del Testing aplicados:**
   - P1 (Testing muestra presencia de defectos) → suite captura inyecciones de error
   - P2 (Testing exhaustivo es imposible) → priorizacion por riesgo, no exhaustividad
   - P3 (Testing temprano) → TDD como practica, tests antes del codigo
   - P4 (Agrupamiento de defectos) → foco en auth guards y reglas de negocio
   - P5 (Paradoja del pesticida) → tests parametrizados con multiples roles
   - P6 (Testing depende del contexto) → sistema medico requiere validacion de acceso estricta
   - P7 (Falacia de ausencia de errores) → tests validan reglas de negocio, no solo cobertura
5. **Estrategia Multinivel** — piramide aplicada con porcentajes y justificacion
6. **Caja Blanca vs Caja Negra** — identificacion de cada tipo en el proyecto
7. **Pipeline** — diagrama del CI/CD y como ejecuta cada nivel

---

## 3. PLAN DE EJECUCION DIA A DIA

> Deadline: **Martes 7 de abril de 2026**. Cuatro dias de trabajo (Sab-Dom-Lun-Mar).
> Metodologia: TDD (Red → Green → Refactor) en cada unidad implementada.

---

### DIA 1 — Sabado 5 abril: FUNDACION + TDD RED

**Objetivo:** Crear toda la infraestructura base (schemas, guards, repositories) y escribir los tests PRIMERO (fase RED del TDD). Al final del dia: tests existen y fallan (RED), estructura de archivos creada, GitFlow configurado.

#### Bloque 1: Setup y GitFlow (1h)

- [ ] Crear rama `develop` desde `main` (si no existe)
- [ ] Crear rama `feature/spec-004-auth-backend` desde `develop`
- [ ] Crear rama `feature/spec-004-auth-frontend` desde `develop`
- [ ] Crear rama `feature/spec-004-ci-pipeline` desde `develop`
- [ ] Crear rama `feature/spec-004-qa-docs` desde `develop`
- [ ] Actualizar `.dockerignore` en los 3 proyectos (excluir `node_modules`, `.git`, `coverage`, `*.md`)
- [ ] Instalar Firebase Admin SDK en backend producer (`npm i firebase-admin`)
- [ ] Instalar Firebase Web SDK en frontend (`npm i firebase`)

**Criterio de aceptacion:** Ramas creadas, dependencias instaladas, proyecto compila sin errores.

#### Bloque 2: Backend — Schemas + TDD RED (3h)

- [ ] Crear schema `Profile` en `backend/producer/src/schemas/profile.schema.ts`
- [ ] Crear DTO `CreateProfileDto` en `backend/producer/src/dto/create-profile.dto.ts`
- [ ] Crear DTO `UpdateProfileDto` en `backend/producer/src/dto/update-profile.dto.ts`
- [ ] Crear interfaz `ProfileRepository` (port) en `backend/producer/src/domain/`
- [ ] Crear interfaz `AuthPort` (port) para verificacion de tokens en `backend/producer/src/domain/`
- [ ] **TDD RED**: Escribir test `auth.guard.spec.ts` — token valido, token invalido, token ausente (3 tests que fallan)
- [ ] **TDD RED**: Escribir test `role.guard.spec.ts` — admin permitido, recepcionista denegado, sin rol (3 tests que fallan)
- [ ] **TDD RED**: Escribir test `profile.service.spec.ts` — crear perfil, duplicado 409, doctor sin doctor_id (5 tests que fallan)
- [ ] **TDD RED**: Escribir test `profile.controller.spec.ts` — POST 201 admin, POST 403 no-admin, GET con filtros (4 tests que fallan)
- [ ] **TDD RED**: Escribir test `auth.controller.spec.ts` — session 200 con perfil, 401 sin token, 403 sin perfil (3 tests que fallan)
- [ ] Commit: `test: RED - auth and profile test suite (18 tests failing)`

**Criterio de aceptacion:** 18+ tests escritos con aserciones reales que fallan (RED). Schema y DTOs compilando. Cada test sigue patron AAA (Arrange-Act-Assert).

#### Bloque 3: Frontend — Scaffolding + TDD RED (2h)

- [ ] Crear `frontend/src/config/firebase.ts` (solo estructura, mock-ready)
- [ ] Crear `frontend/src/services/authService.ts` (interfaces exportadas, sin implementacion)
- [ ] Crear `frontend/src/services/profileService.ts` (interfaces exportadas, sin implementacion)
- [ ] **TDD RED**: Escribir test `useAuth.test.ts` — login exitoso, session expirada, logout limpio (3 tests que fallan)
- [ ] **TDD RED**: Escribir test `LoginForm.test.tsx` — render campos, submit, error display (3 tests que fallan)
- [ ] **TDD RED**: Escribir test `RoleGate.test.tsx` — permite rol, bloquea rol, sin sesion (3 tests que fallan)
- [ ] **TDD RED**: Escribir test `ProfilesPage.test.tsx` — render lista admin, ocultar no-admin (2 tests que fallan)
- [ ] Commit: `test: RED - frontend auth test suite (11 tests failing)`

**Criterio de aceptacion:** 11+ tests frontend escritos y fallando. Interfaces de servicio definidas. Componentes esqueleto creados.

#### Bloque 4: Documentacion QA — Scaffolding (1h)

- [ ] Crear `docs/BUSINESS_CONTEXT.md` con estructura base y contexto de negocio del proyecto
- [ ] Crear `docs/USER_STORIES_REFINEMENT.md` con tabla comparativa (HU original vs refinada) para HU-01, HU-02, HU-03
- [ ] Crear `docs/TEST_CASES_AI.md` con estructura de matriz y primeros 5 casos generados
- [ ] Commit: `docs: scaffold QA documentation (S4 deliverables)`

**Criterio de aceptacion:** 3 archivos MD creados con estructura completa. Contexto de negocio diligenciado. Tabla comparativa con al menos las 3 HUs.

---

### DIA 2 — Domingo 6 abril: IMPLEMENTACION + TDD GREEN

**Objetivo:** Implementar toda la logica que hace pasar los tests (fase GREEN). Al final del dia: todos los tests del Dia 1 en verde + tests heredados sin regresion.

#### Bloque 1: Backend — Guards + Auth (3h)

- [ ] Implementar `FirebaseAuthAdapter` (adapter de `AuthPort`) — verifica `idToken` con Firebase Admin
- [ ] Implementar `AuthGuard` (NestJS CanActivate) — extrae Bearer token, valida con adapter, inyecta uid en request
- [ ] Implementar `RoleGuard` (NestJS CanActivate) — lee `@Roles()` decorator, compara con perfil del request
- [ ] Crear decorator `@Roles(...roles)` para metadata de endpoints
- [ ] Implementar `AuthController` — `POST /auth/session` resuelve perfil por uid
- [ ] Commit: `feat: GREEN - auth guard and session controller (tests passing)`
- [ ] Verificar: `npm test` en producer → 0 tests fallando en auth suite

**Criterio de aceptacion:** AuthGuard valida tokens Firebase (mockeado en tests). RoleGuard filtra por rol. `POST /auth/session` resuelve perfil. Tests auth en GREEN.

#### Bloque 2: Backend — Profiles CRUD (2h)

- [ ] Implementar `MongooseProfileRepository` (adapter) — CRUD + busqueda paginada
- [ ] Implementar `ProfileService` — reglas de negocio (duplicado, doctor requiere doctor_id, activacion)
- [ ] Implementar `ProfileController` — `POST /profiles`, `GET /profiles`, `GET /profiles/me`, `PATCH /profiles/:uid`
- [ ] Registrar `ProfileModule` en `app.module.ts`
- [ ] Commit: `feat: GREEN - profile CRUD with business rules (tests passing)`
- [ ] Verificar: `npm test` en producer → 0 tests fallando

**Criterio de aceptacion:** CRUD completo de perfiles. Validaciones de negocio (409, 400, 403). Tests profile en GREEN.

#### Bloque 3: Backend — Proteger endpoints existentes (1h)

- [ ] Aplicar `@UseGuards(AuthGuard, RoleGuard)` + `@Roles('admin', 'recepcionista')` a `POST /appointments`
- [ ] Aplicar guards a `POST /doctors`, `GET /doctors`
- [ ] Implementar ownership check en `PATCH /doctors/:id/check-in` y `check-out` para rol `doctor`
- [ ] **TDD RED+GREEN**: Test `producer.controller_protected.spec.ts` — doctor rechazado en appointments (403)
- [ ] **TDD RED+GREEN**: Test `doctor.controller_protected.spec.ts` — doctor no puede operar otro medico
- [ ] Commit: `feat: GREEN - existing endpoints protected by role`
- [ ] Verificar: `npm test` completo → TODOS los tests anteriores + nuevos en verde

**Criterio de aceptacion:** Endpoints existentes protegidos. No regresion en tests heredados. Matrix de permisos respetada.

#### Bloque 4: Frontend — Implementacion completa (3h)

- [ ] Implementar `config/firebase.ts` — inicializacion real con env vars
- [ ] Implementar `services/authService.ts` — `signInWithEmailAndPassword`, `resolveSession`, `signOut`
- [ ] Implementar `services/profileService.ts` — `getProfiles`, `createProfile`, `updateProfile`, `getMyProfile`
- [ ] Implementar `hooks/useAuth.ts` — estado de sesion, login, logout, auto-resolve profile
- [ ] Implementar `hooks/useProfiles.ts` — CRUD + refetch
- [ ] Implementar `hooks/useRoleGuard.ts` — resolucion de permisos por ruta
- [ ] Implementar `context/AuthProvider.tsx` + registrar en `app/layout.tsx`
- [ ] Implementar `components/LoginForm/LoginForm.tsx` + `LoginForm.module.css`
- [ ] Implementar `app/login/page.tsx`
- [ ] Implementar `components/RoleGate/RoleGate.tsx`
- [ ] Implementar `app/admin/profiles/page.tsx` + `ProfileFormModal`
- [ ] Adaptar `/registration/page.tsx` — envolver en RoleGate, enviar Bearer token
- [ ] Adaptar navegacion — redirigir segun rol despues de login
- [ ] Commit: `feat: GREEN - frontend auth, login, profiles, role gate (tests passing)`
- [ ] Verificar: `npm test` en frontend → TODOS los tests en verde

**Criterio de aceptacion:** Login funcional. Perfiles CRUD visual. Rutas protegidas por rol. Tests frontend en GREEN. No regresion en tests heredados (88+ tests anteriores siguen verde).

#### Bloque 5: Refactor pass (1h)

- [ ] Revisar codigo duplicado en guards y extraer helpers
- [ ] Revisar nombres de variables y funciones (Clean Code)
- [ ] Revisar que no haya `any` o `console.log` en codigo de produccion
- [ ] Commit: `refactor: clean up auth module after GREEN pass`

**Criterio de aceptacion:** Codigo limpio. Todos los tests siguen en verde tras refactor.

---

### DIA 3 — Lunes 7 abril: CI/CD + DOCUMENTACION + TESTS AVANZADOS

**Objetivo:** Pipeline CI/CD funcional, Dockerfiles optimizados, documentacion QA completa, tests de integracion y E2E.

#### Bloque 1: CI/CD Pipeline (2h)

- [ ] Crear `.github/workflows/ci.yml` con jobs separados:
  - Job `lint-and-build`: ESLint + tsc + build
  - Job `component-tests`: unit tests con coverage report (backend + frontend)
  - Job `integration-tests`: tests con servicios levantados (MongoDB, RabbitMQ)
  - Job `docker-security`: build + scan de vulnerabilidades (trivy/scout)
- [ ] Configurar quality gate: fail si coverage < 80%
- [ ] Configurar upload de reportes como artifacts
- [ ] Commit: `ci: add multi-job pipeline with component and integration separation`
- [ ] Push y verificar pipeline ejecuta en verde

**Criterio de aceptacion:** Pipeline ejecuta 4+ jobs diferenciados. Reportes descargables. Quality gate activo.

#### Bloque 2: Dockerfiles + Seguridad (1h)

- [ ] Actualizar `frontend/Dockerfile` a multi-stage con `USER node`
- [ ] Verificar que producer y consumer Dockerfiles ya tienen multi-stage + non-root (confirmado)
- [ ] Agregar `.dockerignore` optimizado a los 3 proyectos
- [ ] Verificar build exitoso: `docker compose build`
- [ ] Commit: `ci: optimize frontend Dockerfile (multi-stage, non-root)`

**Criterio de aceptacion:** 3 Dockerfiles con multi-stage, non-root. Build exitoso. `.dockerignore` presente.

#### Bloque 3: Tests de Integracion + E2E Caja Negra (2h)

- [ ] Crear `backend/e2e/auth-flow.e2e.spec.ts` — flujo completo: login → crear perfil → registrar turno con rol
- [ ] Crear test de integracion: `ProfileController` con MongoDB mock completo
- [ ] Crear test de integracion: `AuthGuard` + `ProfileService` chain
- [ ] Verificar que el E2E existente (`appointment.e2e.spec.ts`) se actualiza para enviar Bearer token
- [ ] Commit: `test: integration and e2e black-box tests for auth flow`

**Criterio de aceptacion:** Al menos 1 test E2E Caja Negra ejecutandose contra servicios reales. Tests de integracion que prueban la cadena auth → profile → operation.

#### Bloque 4: Documentacion completa (3h)

- [ ] Completar `docs/TESTING_STRATEGY.md`:
  - Objetivo, metodologia TDD, tabla Verificar vs Validar, mocks, cobertura, herramientas
- [ ] Completar `docs/TEST_PLAN.md`:
  - Resumen ejecutivo, test suites, test cases con ID, 7 principios aplicados, estrategia multinivel, caja blanca/negra, pipeline
- [ ] Completar `docs/BUSINESS_CONTEXT.md`:
  - Contexto completo del negocio (stack, diagramas, actores, flujos, restricciones)
- [ ] Completar `docs/USER_STORIES_REFINEMENT.md`:
  - 3 HUs refinadas con tabla comparativa y diferencias detectadas
- [ ] Completar `docs/TEST_CASES_AI.md`:
  - Matriz completa de casos Gherkin + tabla de ajustes del probador con justificacion tecnica
- [ ] Commit: `docs: complete QA documentation (S2 + S3 + S4 deliverables)`

**Criterio de aceptacion:** 5 archivos MD completos, profesionales, con contenido real del proyecto (no generico).

---

### DIA 4 — Martes 8 abril: RELEASE + QA FINAL + ZERO ERRORS

**Objetivo:** Release formal, zero errors, todo integrado y demostrable.

#### Bloque 1: Integracion y Zero Errors (2h)

- [ ] Merge `feature/spec-004-auth-backend` → `develop` via PR
- [ ] Merge `feature/spec-004-auth-frontend` → `develop` via PR
- [ ] Merge `feature/spec-004-ci-pipeline` → `develop` via PR
- [ ] Merge `feature/spec-004-qa-docs` → `develop` via PR
- [ ] Ejecutar suite completa en `develop`: backend producer + consumer + frontend
- [ ] **Zero Errors**: captura de pantalla con 100% tests en verde
- [ ] Verificar cobertura >= 80% en las 3 capas
- [ ] Commit en develop: `chore: merge all spec-004 features`

**Criterio de aceptacion:** TODAS las pruebas pasan (0 fallos). Cobertura >= 80%. Pipeline verde en develop.

#### Bloque 2: Release formal (1h)

- [ ] Crear rama `release/v2.0.0` desde `develop`
- [ ] Crear PR de `release/v2.0.0` → `main` con descripcion formal:
  - Resumen de cambios (auth, perfiles, roles, CI/CD, docs QA)
  - Checklist de calidad (tests, coverage, pipeline, docker scan)
  - Screenshots de pipeline verde + coverage
- [ ] Merge a `main`
- [ ] Crear tag `v2.0.0` en main
- [ ] Verificar pipeline ejecuta en `main` y sale verde

**Criterio de aceptacion:** PR formal documentado. Tag `v2.0.0` en main. Pipeline verde. Branch protection activa.

#### Bloque 3: Validacion final (1h)

- [ ] Levantar sistema completo: `docker compose up --build`
- [ ] Probar flujo manual: login → crear perfil → registrar turno → verificar proteccion por rol
- [ ] Verificar que pantalla de espera sigue funcionando sin auth
- [ ] Captura de pantalla del sistema funcionando (evidencia)
- [ ] Actualizar spec status a `IMPLEMENTED`

**Criterio de aceptacion:** Sistema funcional end-to-end. Flujo auth demostrable. No regresion en features existentes.

---

## 4. LISTA DE TAREAS (CHECKLIST CONSOLIDADO)

> Checklist accionable para todos los agentes. Marcar cada item (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementacion

- [ ] Crear modelo y schema `Profile` en Producer
- [ ] Crear DTOs `CreateProfileDto` y `UpdateProfileDto`
- [ ] Crear ports `AuthPort` y `ProfileRepository` en domain
- [ ] Implementar `FirebaseAuthAdapter` (adapter de `AuthPort`)
- [ ] Implementar `MongooseProfileRepository` con busqueda por `uid`, `email` y filtros paginados
- [ ] Implementar `ProfileService` con reglas de negocio de roles y estado
- [ ] Implementar `AuthGuard` para validar `Authorization: Bearer <idToken>` contra Firebase
- [ ] Implementar `RoleGuard` para proteger endpoints por rol
- [ ] Crear decorator `@Roles()` para metadata
- [ ] Implementar controller `/auth/session`
- [ ] Implementar controller `/profiles` con `POST`, `GET`, `GET /me`, `PATCH`
- [ ] Proteger `POST /appointments` para `admin` y `recepcionista`
- [ ] Proteger `POST /doctors` y `GET /doctors` para perfiles autorizados
- [ ] Proteger `PATCH /doctors/:id/check-in` y `PATCH /doctors/:id/check-out` con validacion de contexto para rol `doctor`
- [ ] Registrar wiring de auth y profiles en `app.module.ts`

#### Tests Backend (TDD)

| ID    | Test                                             | Tipo           | Verificar/Validar |
| ----- | ------------------------------------------------ | -------------- | ----------------- |
| TB-01 | `auth_guard_validates_bearer_token`              | Unit           | Verificar         |
| TB-02 | `auth_guard_rejects_missing_token_401`           | Unit           | Verificar         |
| TB-03 | `auth_guard_rejects_expired_token_401`           | Unit           | Verificar         |
| TB-04 | `role_guard_allows_matching_role`                | Unit           | Verificar         |
| TB-05 | `role_guard_rejects_non_matching_role_403`       | Unit           | Verificar         |
| TB-06 | `role_guard_rejects_missing_role`                | Unit           | Verificar         |
| TB-07 | `profile_service_create_success`                 | Unit           | Verificar         |
| TB-08 | `profile_service_create_duplicate_uid_409`       | Unit           | **Validar**       |
| TB-09 | `profile_service_create_duplicate_email_409`     | Unit           | **Validar**       |
| TB-10 | `profile_service_doctor_role_requires_doctor_id` | Unit           | **Validar**       |
| TB-11 | `profile_service_deactivate_profile`             | Unit           | Verificar         |
| TB-12 | `auth_session_success_returns_profile_200`       | Integration    | Verificar         |
| TB-13 | `auth_session_invalid_token_401`                 | Integration    | **Validar**       |
| TB-14 | `auth_session_missing_profile_403`               | Integration    | **Validar**       |
| TB-15 | `profiles_controller_post_201_for_admin`         | Integration    | Verificar         |
| TB-16 | `profiles_controller_post_403_for_non_admin`     | Integration    | **Validar**       |
| TB-17 | `appointments_post_403_for_doctor_role`          | Integration    | **Validar**       |
| TB-18 | `doctor_checkin_403_when_operating_other_doctor` | Integration    | **Validar**       |
| TB-19 | `deactivated_profile_loses_access_403`           | Integration    | **Validar**       |
| TB-20 | `e2e_login_create_profile_register_turn`         | E2E Caja Negra | **Validar**       |

### Frontend

#### Implementacion

- [ ] Crear `config/firebase.ts` para inicializacion de Firebase
- [ ] Crear `services/authService.ts` para `signIn`, `signOut` y bootstrap de sesion con backend
- [ ] Crear `services/profileService.ts` para CRUD de perfiles
- [ ] Crear `hooks/useAuth.ts` como fuente unica de verdad de autenticacion
- [ ] Crear `hooks/useProfiles.ts` para administracion de perfiles
- [ ] Crear `hooks/useRoleGuard.ts` para resolucion de permisos por ruta
- [ ] Crear `context/AuthProvider.tsx` y registrarlo en `app/layout.tsx`
- [ ] Implementar `LoginForm` y pagina `/login`
- [ ] Implementar `RoleGate` / proteccion de rutas por rol
- [ ] Implementar pagina `/admin/profiles` para listar y crear Perfiles
- [ ] Implementar `ProfileFormModal` para alta y edicion
- [ ] Adaptar `/registration` para requerir rol `recepcionista` o `admin`
- [ ] Adaptar navegacion/landing para redirigir segun rol
- [ ] Enviar `Authorization: Bearer <idToken>` en llamadas protegidas

#### Tests Frontend (TDD)

| ID    | Test                                              | Tipo | Verificar/Validar |
| ----- | ------------------------------------------------- | ---- | ----------------- |
| TF-01 | `LoginForm renders email and password inputs`     | Unit | Verificar         |
| TF-02 | `LoginForm calls onSubmit with credentials`       | Unit | Verificar         |
| TF-03 | `LoginForm displays error message`                | Unit | Verificar         |
| TF-04 | `useAuth returns loading while resolving session` | Unit | Verificar         |
| TF-05 | `useAuth login resolves profile and sets state`   | Unit | Verificar         |
| TF-06 | `useAuth clears session when backend returns 401` | Unit | **Validar**       |
| TF-07 | `useAuth logout clears all auth state`            | Unit | Verificar         |
| TF-08 | `RoleGate renders children for allowed role`      | Unit | Verificar         |
| TF-09 | `RoleGate blocks doctor from registration`        | Unit | **Validar**       |
| TF-10 | `RoleGate redirects when no session`              | Unit | **Validar**       |
| TF-11 | `ProfilesPage renders profile list for admin`     | Unit | Verificar         |
| TF-12 | `ProfilesPage hides content for non-admin`        | Unit | **Validar**       |
| TF-13 | `AppointmentRegistrationForm sends Bearer token`  | Unit | Verificar         |

### CI/CD y DevOps

- [ ] Crear `.github/workflows/ci.yml` con 4 jobs separados
- [ ] Job `lint-and-build`: ESLint + TypeScript + build
- [ ] Job `component-tests`: unit tests + coverage >= 80%
- [ ] Job `integration-tests`: tests con MongoDB + RabbitMQ services
- [ ] Job `docker-security`: build + vulnerability scan
- [ ] Actualizar `frontend/Dockerfile` a multi-stage + non-root
- [ ] Crear/actualizar `.dockerignore` en 3 proyectos
- [ ] Configurar branch protection en `main`
- [ ] Pipeline verde en `develop` y `main`

### GitFlow y Release

- [ ] Ramas `feature/*` creadas desde `develop`
- [ ] PRs con descripcion formal para cada feature branch
- [ ] PR de `release/v2.0.0` de `develop` → `main`
- [ ] Tag `v2.0.0` en main
- [ ] Commits con Conventional Commits

### Documentacion QA

- [ ] `docs/TESTING_STRATEGY.md` — estrategia Verificar vs Validar, TDD, mocks, cobertura (Semana 2)
- [ ] `docs/TEST_PLAN.md` — informe profesional con 7 principios, test suites, test cases, multinivel (Semana 3)
- [ ] `docs/BUSINESS_CONTEXT.md` — contexto de negocio completo (Semana 4)
- [ ] `docs/USER_STORIES_REFINEMENT.md` — 3 HUs original vs refinada con diferencias (Semana 4)
- [ ] `docs/TEST_CASES_AI.md` — matriz de casos + ajustes del probador con justificacion (Semana 4)

### QA y Validacion Final

- [ ] Ejecutar skill `/gherkin-case-generator` → criterios CRITERIO-1.1 a 3.4
- [ ] Ejecutar skill `/risk-identifier` → clasificacion ASD de riesgos de acceso y autorizacion
- [ ] Validar matrix de permisos por rol (`admin`, `recepcionista`, `doctor`)
- [ ] Verificar no regresion del flujo existente de turnos publicos
- [ ] Verificar expiracion de sesion y manejo de 401 / 403 en frontend
- [ ] Captura de pantalla: 100% tests en verde (Zero Errors)
- [ ] Captura de pantalla: sistema funcionando end-to-end
- [ ] Captura de pantalla: pipeline verde en GitHub Actions
- [ ] Actualizar estado spec: `status: IMPLEMENTED`

---

## 5. CRITERIOS DE SALIDA (Definition of Done)

La spec se considera `IMPLEMENTED` cuando **todos** los siguientes criterios se cumplen:

| #   | Criterio                                                                            | Evidencia                                |
| --- | ----------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | **Zero Errors**: 100% tests en verde (heredados + nuevos)                           | Captura de `npm test` en los 3 proyectos |
| 2   | **Cobertura >= 80%** en lines para producer, consumer y frontend                    | Reportes Jest coverage (lcov)            |
| 3   | **TDD evidenciado** en historial Git con commits RED → GREEN → REFACTOR             | `git log --oneline` filtrado             |
| 4   | **Pipeline CI/CD** con 4 jobs separados ejecutando en verde                         | Link/captura de GitHub Actions           |
| 5   | **Dockerfiles seguros**: multi-stage, non-root, scan sin CRITICAL                   | Output de docker scan                    |
| 6   | **GitFlow**: PR formal de develop → main con tag `v2.0.0`                           | Link al PR en GitHub                     |
| 7   | **5 archivos MD** completos y profesionales                                         | Archivos en `docs/`                      |
| 8   | **Funcionalidad**: login, perfiles, roles, proteccion de modulos operativos         | Demo manual o captura                    |
| 9   | **No regresion**: features existentes (turnos, medicos, websocket, cola) funcionan  | Tests heredados en verde                 |
| 10  | **Verificar vs Validar** diferenciado en tests y documentado en TESTING_STRATEGY.md | Tabla en MD + tests etiquetados          |
