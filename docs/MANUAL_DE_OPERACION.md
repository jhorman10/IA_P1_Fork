# Manual de Operación — Sistema de Turnos Médicos

> Versión: 1.0 · Fecha: 2026-04-06

---

## Tabla de Contenido

1. [Requisitos Previos](#1-requisitos-previos)
2. [Instalación y Arranque](#2-instalación-y-arranque)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
   - 3.1 [Diagrama de Despliegue](#31-diagrama-de-despliegue)
   - 3.2 [Diagrama de Secuencia — Ciclo de Vida de un Turno](#32-diagrama-de-secuencia--ciclo-de-vida-de-un-turno)
   - 3.3 [Diagrama de Estados de un Turno](#33-diagrama-de-estados-de-un-turno)
4. [Configuración de Variables de Entorno](#4-configuración-de-variables-de-entorno)
5. [Roles y Autenticación](#5-roles-y-autenticación)
   - [Diagrama de Casos de Uso](#diagrama-de-casos-de-uso)
   - [Flujo de Autenticación](#flujo-de-autenticación)
   - [Mapa de Navegación por Rol](#mapa-de-navegación-por-rol)
6. [Pantallas del Frontend](#6-pantallas-del-frontend)
7. [API REST — Referencia Completa](#7-api-rest--referencia-completa)
8. [WebSocket — Tiempo Real](#8-websocket--tiempo-real)
9. [Flujos Operativos Paso a Paso](#9-flujos-operativos-paso-a-paso)
   - 9.1 [Registro → Atención → Finalización](#91-flujo-completo-registro--atención--finalización)
   - 9.2 [Cancelar un Turno](#92-cancelar-un-turno)
   - 9.3 [Gestión de Perfiles](#93-gestión-de-perfiles-admin)
   - 9.4 [Jornada del Doctor](#94-jornada-completa-del-doctor)
   - 9.7 [Flujo de Datos Completo](#97-flujo-de-datos-completo-del-sistema)
10. [Paneles de Infraestructura](#10-paneles-de-infraestructura)
11. [Desarrollo Local](#11-desarrollo-local)
12. [Solución de Problemas](#12-solución-de-problemas)
13. [Usuarios de Prueba](#13-usuarios-de-prueba)
14. [Rutas del Frontend](#14-rutas-del-frontend)

---

## 1. Requisitos Previos

| Herramienta                       | Versión Mínima      | Verificación                                   |
| --------------------------------- | ------------------- | ---------------------------------------------- |
| Docker Engine + Docker Compose v2 | 24.x / 2.x          | `docker --version && docker compose version`   |
| **o** Podman + Podman Compose     | 4.x                 | `podman --version && podman-compose --version` |
| Git                               | 2.x                 | `git --version`                                |
| Navegador moderno                 | Chrome/Firefox/Edge | —                                              |

> **Nota:** No necesitas instalar Node.js, MongoDB ni RabbitMQ localmente. Todo corre en contenedores.

### Opcional (para autenticación)

Si quieres usar el flujo completo de login con roles (admin, recepcionista, doctor), necesitas:

- Un proyecto en **Firebase** con Authentication (email/password) habilitado.
- Las credenciales Firebase configuradas en el `.env` (ver sección 4).

Sin Firebase, la **pantalla pública de turnos** funciona completa. Las secciones protegidas requieren login.

---

## 2. Instalación y Arranque

### 2.1 Clonar el repositorio

```bash
git clone https://github.com/jhorman10/IA_P1_Fork.git
cd IA_P1_Fork
```

### 2.2 Configurar entorno

```bash
cp .env.example .env
# Editar .env con las credenciales deseadas (ver sección 4)
```

### 2.3 Iniciar todo el sistema

```bash
docker compose up -d --build
```

Con Podman:

```bash
podman-compose up -d --build
```

### 2.4 Verificar que todo esté funcionando

```bash
docker compose ps
```

Resultado esperado — 5 servicios, todos `Up` o `Healthy`:

| Servicio          | Container          | Puerto      |
| ----------------- | ------------------ | ----------- |
| MongoDB           | `P1_mongodb`       | 27017       |
| RabbitMQ          | `P1_rabbitmq`      | 5672, 15672 |
| Producer (API)    | `backend-producer` | 3000        |
| Consumer (Worker) | `backend-consumer` | (interno)   |
| Frontend          | `frontend-app`     | 3001        |

### 2.5 Acceder

| Recurso                         | URL                            |
| ------------------------------- | ------------------------------ |
| **Frontend (pantalla pública)** | http://localhost:3001          |
| **API Swagger**                 | http://localhost:3000/api/docs |
| **RabbitMQ Admin**              | http://localhost:15672         |

### 2.6 Detener el sistema

```bash
docker compose down
```

Para detener **y eliminar datos** (MongoDB, volúmenes):

```bash
docker compose down -v
```

---

## 3. Arquitectura del Sistema

### 3.1 Diagrama de Despliegue

```mermaid
graph TB
    subgraph Cliente
        FE["Frontend<br/>Next.js :3001"]
    end

    subgraph Backend
        API["Producer<br/>NestJS :3000<br/>API + WebSocket"]
        WK["Consumer<br/>NestJS (interno)<br/>Worker + Scheduler"]
    end

    subgraph Infraestructura
        MQ["RabbitMQ<br/>:5672 / :15672"]
        DB[("MongoDB<br/>:27017<br/>appointments_db")]
    end

    FE -- "HTTP REST" --> API
    FE <-- "WebSocket<br/>(tiempo real)" --> API
    API -- "Publica mensajes<br/>(AMQP)" --> MQ
    MQ -- "Consume mensajes" --> WK
    API -- "Lee turnos" --> DB
    WK -- "Escribe turnos<br/>Asigna consultorios" --> DB
    MQ -- "Notificaciones" --> API
```

### 3.2 Diagrama de Secuencia — Ciclo de Vida de un Turno

```mermaid
sequenceDiagram
    actor R as Recepcionista
    participant FE as Frontend
    participant API as Producer
    participant MQ as RabbitMQ
    participant WK as Consumer
    participant DB as MongoDB
    participant SCH as Scheduler

    R->>FE: Registra paciente
    FE->>API: POST /appointments
    API->>MQ: Publica create_appointment
    API-->>FE: 202 Accepted
    MQ->>WK: Consume mensaje
    WK->>DB: Guarda turno (waiting)
    WK->>MQ: Evento notificación

    loop Cada SCHEDULER_INTERVAL_MS
        SCH->>DB: Busca turnos waiting
        SCH->>DB: Asigna consultorio + doctor
        SCH->>MQ: Publica appointment_updated
    end

    MQ->>API: Consume notificación
    API->>FE: WebSocket: appointment_update
    FE->>R: Pantalla actualizada en tiempo real
```

### 3.3 Diagrama de Estados de un Turno

```mermaid
stateDiagram-v2
    [*] --> waiting : Registro del paciente
    waiting --> called : Scheduler asigna<br/>consultorio y doctor
    called --> completed : Doctor finaliza<br/>atención
    waiting --> cancelled : Admin/Recepcionista<br/>cancela el turno
    completed --> [*]
    cancelled --> [*]
```

| Estado      | Significado                                      |
| ----------- | ------------------------------------------------ |
| `waiting`   | Paciente en sala de espera                       |
| `called`    | Paciente llamado a consultorio (médico asignado) |
| `completed` | Atención finalizada por el doctor                |
| `cancelled` | Turno cancelado por recepcionista o admin        |

---

## 4. Configuración de Variables de Entorno

El archivo `.env` en la raíz controla toda la configuración. Basarse en `.env.example`.

### Variables del sistema

| Variable        | Valor por defecto       | Descripción                  |
| --------------- | ----------------------- | ---------------------------- |
| `PRODUCER_PORT` | `3000`                  | Puerto del API backend       |
| `FRONTEND_PORT` | `3001`                  | Puerto del frontend          |
| `FRONTEND_URL`  | `http://localhost:3001` | URL del frontend (para CORS) |
| `NODE_ENV`      | `development`           | Entorno de ejecución         |

### RabbitMQ

| Variable                       | Valor por defecto      | Descripción                        |
| ------------------------------ | ---------------------- | ---------------------------------- |
| `RABBITMQ_USER`                | `guest`                | Usuario de RabbitMQ                |
| `RABBITMQ_PASS`                | `guest`                | Contraseña de RabbitMQ             |
| `RABBITMQ_QUEUE`               | `turnos_queue`         | Cola principal de turnos           |
| `RABBITMQ_NOTIFICATIONS_QUEUE` | `turnos_notifications` | Cola de notificaciones             |
| `RABBITMQ_PORT`                | `5672`                 | Puerto AMQP                        |
| `RABBITMQ_MGMT_PORT`           | `15672`                | Puerto del panel de administración |

### MongoDB

| Variable       | Valor por defecto | Descripción                |
| -------------- | ----------------- | -------------------------- |
| `MONGO_USER`   | `admin`           | Usuario root de MongoDB    |
| `MONGO_PASS`   | `admin123`        | Contraseña root de MongoDB |
| `MONGODB_PORT` | `27017`           | Puerto de MongoDB          |

### Scheduler (Consumer)

| Variable                | Valor por defecto | Descripción                                                     |
| ----------------------- | ----------------- | --------------------------------------------------------------- |
| `SCHEDULER_INTERVAL_MS` | `10000`           | Intervalo del scheduler en ms (cada cuánto asigna consultorios) |
| `CONSULTORIOS_TOTAL`    | `5`               | Número total de consultorios disponibles                        |

### Frontend (Next.js)

| Variable                   | Valor por defecto       | Descripción                |
| -------------------------- | ----------------------- | -------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3000` | URL base de la API         |
| `NEXT_PUBLIC_WS_URL`       | `http://localhost:3000` | URL del servidor WebSocket |

### Firebase (Opcional — para autenticación)

Estas variables se agregan al `.env` solo si se desea habilitar el login con roles:

| Variable                           | Descripción                                  |
| ---------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`     | API Key del proyecto Firebase                |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de auth (`proyecto.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | ID del proyecto                              |
| `FIREBASE_SERVICE_ACCOUNT_KEY`     | JSON de la cuenta de servicio (backend)      |

---

## 5. Roles y Autenticación

El sistema utiliza Firebase Authentication con tres roles operativos:

| Rol               | Acceso                                                   | Redirección post-login |
| ----------------- | -------------------------------------------------------- | ---------------------- |
| **admin**         | Todo el sistema: perfiles, auditoría, métricas           | `/admin/profiles`      |
| **recepcionista** | Registro de turnos, cancelación                          | `/registration`        |
| **doctor**        | Panel del doctor, check-in/check-out, finalizar atención | `/doctor/dashboard`    |

### Diagrama de Casos de Uso

```mermaid
graph LR
    subgraph Público
        UC1((Ver pantalla<br/>de turnos))
        UC2((Ver dashboard<br/>de turnos))
    end

    subgraph Recepcionista
        UC3((Registrar<br/>turno))
        UC4((Cancelar<br/>turno))
    end

    subgraph Doctor
        UC5((Check-in))
        UC6((Check-out))
        UC7((Finalizar<br/>atención))
    end

    subgraph Admin
        UC8((Gestionar<br/>perfiles))
        UC9((Ver métricas))
        UC10((Ver auditoría))
        UC11((Crear perfil))
    end

    Visitante --> UC1
    Visitante --> UC2
    Recep[Recepcionista] --> UC1
    Recep --> UC3
    Recep --> UC4
    Doc[Doctor] --> UC5
    Doc --> UC6
    Doc --> UC7
    Adm[Admin] --> UC3
    Adm --> UC4
    Adm --> UC8
    Adm --> UC9
    Adm --> UC10
    Adm --> UC11
```

### Sin autenticación (público)

| Pantalla            | URL          | Descripción                           |
| ------------------- | ------------ | ------------------------------------- |
| Pantalla de turnos  | `/`          | Cola en tiempo real (sala de espera)  |
| Dashboard de turnos | `/dashboard` | Vista expandida con todos los estados |

### Flujo de Autenticación

```mermaid
sequenceDiagram
    actor U as Usuario
    participant FE as Frontend
    participant FB as Firebase Auth
    participant API as Producer API
    participant DB as MongoDB

    U->>FE: Abre /login
    U->>FE: Ingresa email + contraseña
    FE->>FB: signInWithEmailAndPassword()
    FB-->>FE: idToken + User
    FE->>API: POST /auth/session<br/>Authorization: Bearer idToken
    API->>FB: Verifica token
    FB-->>API: UID decodificado
    API->>DB: Buscar perfil por UID
    DB-->>API: Perfil (rol, estado)
    alt Perfil activo
        API-->>FE: 200 {perfil, allowed_modules}
        FE->>FE: Redirige según rol
    else Perfil no existe o inactivo
        API-->>FE: 403 Forbidden
        FE->>U: Muestra error
    end
```

### Flujo de login (resumen)

1. El usuario abre http://localhost:3001/login.
2. Ingresa email y contraseña.
3. Firebase valida las credenciales.
4. El backend resuelve el perfil operativo asociado al UID de Firebase (`POST /auth/session`).
5. El frontend redirige según el rol del perfil.

### Mapa de Navegación por Rol

```mermaid
graph TD
    LOGIN["/login"] --> |admin| AP["/admin/profiles"]
    LOGIN --> |recepcionista| REG["/registration"]
    LOGIN --> |doctor| DD["/doctor/dashboard"]

    AP --> AD["/admin/dashboard"]
    AP --> AA["/admin/audit"]

    subgraph "Público (sin login)"
        HOME["/"]
        DASH["/dashboard"]
    end

    style HOME fill:#e8f5e9
    style DASH fill:#e8f5e9
    style LOGIN fill:#fff3e0
    style REG fill:#e3f2fd
    style DD fill:#fce4ec
    style AP fill:#f3e5f5
    style AD fill:#f3e5f5
    style AA fill:#f3e5f5
```

---

## 6. Pantallas del Frontend

### 6.1 Pantalla Pública de Turnos — `/`

**Acceso:** público, sin login.

Muestra la cola de turnos en tiempo real vía WebSocket:

- **Columna izquierda:** turnos en estado `called` (pacientes siendo atendidos).
- **Columna derecha:** turnos en estado `waiting` (en espera).
- Sonido de notificación cuando un turno pasa a `called`.
- Indicador de conexión WebSocket en la esquina.

**Uso típico:** pantalla grande en la sala de espera de la clínica.

---

### 6.2 Dashboard de Turnos — `/dashboard`

**Acceso:** público o autenticado.

Vista expandida que muestra turnos en todos los estados: `waiting`, `called`, `completed`, `cancelled`.

- Si el usuario autenticado es admin o recepcionista, aparece el botón **Cancelar** en turnos `waiting`.
- Actualización en tiempo real vía WebSocket.

---

### 6.3 Login — `/login`

**Acceso:** público.

Formulario de email y contraseña. Tras autenticarse exitosamente, redirige según el rol del perfil.

---

### 6.4 Registro de Turnos — `/registration`

**Acceso:** `admin`, `recepcionista`.

Formulario para registrar un nuevo turno:

- **Nombre completo** del paciente.
- **Cédula** (número de identificación).
- **Prioridad:** Alta, Media, Baja.

Al enviar, el turno se publica vía RabbitMQ y aparece automáticamente en la pantalla pública.

---

### 6.5 Panel del Doctor — `/doctor/dashboard`

**Acceso:** `doctor`.

Panel operativo del médico:

- **Check-in:** el doctor se marca como disponible para recibir pacientes.
- **Check-out:** el doctor se marca como no disponible.
- **Paciente actual:** muestra el turno `called` asignado al doctor.
- **Finalizar atención:** marca el turno actual como `completed`.
- Información del doctor (nombre, especialidad, estado).

---

### 6.6 Gestión de Perfiles — `/admin/profiles`

**Acceso:** `admin`.

CRUD completo de perfiles operativos:

- **Listar** todos los perfiles con filtros por rol y estado.
- **Crear** nuevo perfil: asignar UID de Firebase, email, nombre, rol y (si es doctor) el ID del médico.
- **Editar** perfil existente: cambiar rol, estado (activo/inactivo), doctor_id.

---

### 6.7 Dashboard Operativo — `/admin/dashboard`

**Acceso:** `admin`.

Panel de métricas del sistema en tiempo real:

- Total de turnos hoy.
- Turnos por estado (esperando, llamados, completados, cancelados).
- Tiempo promedio de espera.
- Médicos activos.
- Consultorios en uso.

---

### 6.8 Trazabilidad Operativa — `/admin/audit`

**Acceso:** `admin`.

Visor de logs de auditoría con filtros:

- Filtrar por acción, actor, fecha.
- Paginación.
- Detalle de cada entrada: quién, qué, cuándo, sobre qué recurso.

Registra acciones como: creación/actualización de perfiles, cancelación de turnos, check-in/check-out de doctores.

---

## 7. API REST — Referencia Completa

Base URL: `http://localhost:3000`

Documentación interactiva Swagger: http://localhost:3000/api/docs

### Turnos (Appointments)

| Método | Endpoint                                | Auth | Descripción                               |
| ------ | --------------------------------------- | ---- | ----------------------------------------- |
| `POST` | `/appointments`                         | No   | Crear un nuevo turno (publica a RabbitMQ) |
| `GET`  | `/appointments`                         | No   | Listar todos los turnos                   |
| `GET`  | `/appointments/queue-position/{idCard}` | No   | Posición en cola por cédula               |
| `GET`  | `/appointments/{idCard}`                | No   | Buscar turnos por cédula                  |

#### Ejemplo — Crear turno

```bash
curl -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Juan Pérez",
    "idCard": 12345678,
    "priority": "medium"
  }'
```

Respuesta: `202 Accepted`

---

### Autenticación (Auth)

| Método | Endpoint        | Auth         | Descripción                                                      |
| ------ | --------------- | ------------ | ---------------------------------------------------------------- |
| `POST` | `/auth/session` | Bearer token | Resolver sesión operativa (devuelve perfil + módulos permitidos) |

#### Ejemplo

```bash
curl -X POST http://localhost:3000/auth/session \
  -H "Authorization: Bearer <firebase-id-token>"
```

---

### Perfiles (Profiles)

| Método  | Endpoint          | Auth                   | Descripción                           |
| ------- | ----------------- | ---------------------- | ------------------------------------- |
| `GET`   | `/profiles/me`    | Bearer (cualquier rol) | Perfil del usuario autenticado        |
| `POST`  | `/profiles`       | Bearer (admin)         | Crear perfil operativo                |
| `GET`   | `/profiles`       | Bearer (admin)         | Listar perfiles (paginado, filtrable) |
| `PATCH` | `/profiles/{uid}` | Bearer (admin)         | Actualizar perfil                     |

#### Ejemplo — Crear perfil

```bash
curl -X POST http://localhost:3000/profiles \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "firebase-uid-del-usuario",
    "email": "doctor@clinica.com",
    "display_name": "Dr. García",
    "role": "doctor",
    "doctor_id": "DOC-001"
  }'
```

---

### Médicos (Doctors)

| Método  | Endpoint                  | Auth | Descripción                      |
| ------- | ------------------------- | ---- | -------------------------------- |
| `POST`  | `/doctors`                | No   | Registrar nuevo médico           |
| `GET`   | `/doctors`                | No   | Listar médicos                   |
| `GET`   | `/doctors/{id}`           | No   | Obtener médico por ID            |
| `PATCH` | `/doctors/{id}/check-in`  | No   | Marcar check-in (disponible)     |
| `PATCH` | `/doctors/{id}/check-out` | No   | Marcar check-out (no disponible) |

#### Ejemplo — Check-in

```bash
curl -X PATCH http://localhost:3000/doctors/DOC-001/check-in
```

---

### Métricas (Metrics)

| Método | Endpoint   | Auth           | Descripción                     |
| ------ | ---------- | -------------- | ------------------------------- |
| `GET`  | `/metrics` | Bearer (admin) | Métricas operativas del sistema |

---

### Auditoría (Audit)

| Método | Endpoint      | Auth           | Descripción                 |
| ------ | ------------- | -------------- | --------------------------- |
| `GET`  | `/audit-logs` | Bearer (admin) | Logs de auditoría operativa |

Soporta query params: `action`, `actorUid`, `from`, `to`, `page`, `limit`.

---

### Health Check

| Método | Endpoint  | Auth | Descripción                  |
| ------ | --------- | ---- | ---------------------------- |
| `GET`  | `/health` | No   | Estado de salud del servicio |

```bash
curl http://localhost:3000/health
```

---

## 8. WebSocket — Tiempo Real

### Conexión

```
ws://localhost:3000/ws/appointments
```

### Canal público

El frontend se conecta automáticamente y recibe eventos cada vez que un turno cambia de estado.

**Evento recibido:** `appointment_update`

```json
{
  "id": "abc123",
  "fullName": "Juan Pérez",
  "idCard": 12345678,
  "office": "A3",
  "status": "called",
  "priority": "medium",
  "doctorId": "DOC-001",
  "doctorName": "Dr. García",
  "timestamp": 1712419200000
}
```

### Canal operativo autenticado

Para secciones protegidas, existe un canal WebSocket autenticado que requiere token Bearer en la conexión. El frontend lo utiliza internamente a través del hook `useOperationalAppointmentsWebSocket`.

---

## 9. Flujos Operativos Paso a Paso

### 9.1 Flujo completo: registro → atención → finalización

```mermaid
flowchart TD
    A([Recepcionista<br/>abre /login]) --> B[Ingresa credenciales]
    B --> C[Redirigido a /registration]
    C --> D[Llena formulario:<br/>nombre, cédula, prioridad]
    D --> E[Clic en Registrar]
    E --> F["API: POST /appointments<br/>→ RabbitMQ → Consumer"]
    F --> G["Turno aparece en<br/>pantalla pública como<br/>🟡 waiting"]

    H([Doctor abre /login]) --> I[Ingresa credenciales]
    I --> J[Redirigido a /doctor/dashboard]
    J --> K[Clic en Check-in]
    K --> L["Scheduler asigna turno<br/>waiting al doctor"]
    L --> M["Turno pasa a<br/>🟢 called<br/>+ consultorio asignado"]
    M --> N[Doctor atiende paciente]
    N --> O[Clic en Finalizar atención]
    O --> P["Turno pasa a<br/>✅ completed"]

    G -.->|cada 10s| L

    style G fill:#fff9c4
    style M fill:#c8e6c9
    style P fill:#e8f5e9
```

**Pasos detallados:**

1. **Recepcionista** abre http://localhost:3001/login e ingresa credenciales.
2. Es redirigido a `/registration`.
3. Llena el formulario: nombre del paciente, cédula, prioridad.
4. Hace clic en **Registrar**.
5. El turno aparece en la **pantalla pública** (`/`) como `waiting`.
6. **Doctor** abre http://localhost:3001/login e ingresa credenciales.
7. Es redirigido a `/doctor/dashboard`.
8. Hace clic en **Check-in** para marcarse disponible.
9. El **scheduler** (cada 10s por defecto) asigna un turno `waiting` al doctor.
10. El turno pasa a `called` — aparece en la pantalla pública con consultorio asignado.
11. El doctor ve al paciente actual en su panel.
12. Al terminar, hace clic en **Finalizar atención**.
13. El turno pasa a `completed`.

---

### 9.2 Cancelar un turno

```mermaid
flowchart LR
    A([Admin o<br/>Recepcionista]) --> B[Abre /dashboard]
    B --> C[Encuentra turno<br/>en estado waiting]
    C --> D[Clic en Cancelar]
    D --> E["API: PATCH lifecycle<br/>→ Consumer procesa"]
    E --> F["Turno pasa a<br/>❌ cancelled"]
    F --> G[Pantalla pública<br/>se actualiza vía WS]

    style F fill:#ffcdd2
```

**Pasos detallados:**

1. **Admin** o **recepcionista** abre `/dashboard`.
2. Encuentra el turno en estado `waiting`.
3. Hace clic en **Cancelar**.
4. El turno pasa a `cancelled`.

---

### 9.3 Gestión de perfiles (admin)

```mermaid
flowchart TD
    A([Admin abre<br/>/admin/profiles]) --> B{¿Crear o editar?}
    B -->|Crear| C[Clic en Crear Perfil]
    C --> D[Llena: UID, email,<br/>nombre, rol]
    D --> E{¿Rol = doctor?}
    E -->|Sí| F[Asigna doctor_id]
    E -->|No| G[Guarda directamente]
    F --> G
    G --> H["API: POST /profiles"]
    H --> I[Perfil creado<br/>usuario puede hacer login]

    B -->|Editar| J[Selecciona perfil existente]
    J --> K[Modifica rol, estado<br/>o doctor_id]
    K --> L["API: PATCH /profiles/:uid"]
    L --> M[Perfil actualizado<br/>+ audit log generado]

    style I fill:#e8f5e9
    style M fill:#e3f2fd
```

**Pasos detallados:**

1. **Admin** abre `/admin/profiles`.
2. Hace clic en **Crear Perfil**.
3. Llena: UID Firebase, email, nombre, rol.
4. Si el rol es `doctor`, asigna un `doctor_id`.
5. Guarda. El nuevo usuario ya puede hacer login.

---

### 9.4 Jornada completa del doctor

```mermaid
flowchart TD
    A([Doctor abre<br/>/doctor/dashboard]) --> B[Clic en Check-in]
    B --> C["Estado: disponible<br/>Esperando asignación"]
    C --> D{¿Scheduler asigna<br/>turno?}
    D -->|Sí| E["Ve paciente actual<br/>en su panel"]
    E --> F[Atiende paciente]
    F --> G[Clic en Finalizar atención]
    G --> H[Turno → completed]
    H --> D
    D -->|No hay más turnos| I[Clic en Check-out]
    I --> J["Estado: no disponible<br/>Jornada terminada"]

    style C fill:#c8e6c9
    style J fill:#ffcdd2
```

---

### 9.5 Consultar métricas (admin)

1. **Admin** navega a `/admin/dashboard`.
2. Ve métricas en tiempo real: turnos del día, tiempos de espera, médicos activos.

### 9.6 Revisar auditoría (admin)

1. **Admin** navega a `/admin/audit`.
2. Filtra por acción, actor o fecha.
3. Navega por páginas de registros.

---

### 9.7 Flujo de Datos Completo del Sistema

```mermaid
flowchart TB
    subgraph Frontend
        P1["Pantalla Pública /"]
        P2["/registration"]
        P3["/doctor/dashboard"]
        P4["/admin/*"]
    end

    subgraph "Producer (API :3000)"
        REST[REST API]
        WS[WebSocket Gateway]
        AUTH[Firebase Auth Guard]
    end

    subgraph RabbitMQ
        Q1[turnos_queue]
        Q2[turnos_notifications]
        DLQ[Dead Letter Queue]
    end

    subgraph "Consumer (Worker)"
        WORKER[Message Handler]
        SCHED[Scheduler]
    end

    subgraph MongoDB
        C1[(appointments)]
        C2[(doctors)]
        C3[(profiles)]
        C4[(audit_logs)]
    end

    P2 -->|POST /appointments| REST
    P3 -->|PATCH check-in/out| REST
    P4 -->|CRUD perfiles| AUTH
    AUTH --> REST

    REST -->|Publica| Q1
    Q1 -->|Consume| WORKER
    WORKER -->|Escribe| C1
    WORKER -->|Notifica| Q2
    Q2 -->|Consume| WS
    WS -->|Evento tiempo real| P1

    SCHED -->|Lee waiting| C1
    SCHED -->|Asigna doctor| C2
    SCHED -->|Actualiza| C1
    SCHED -->|Notifica| Q2

    WORKER -.->|Error| DLQ

    REST -->|Lee| C1
    REST -->|Lee/Escribe| C3
    REST -->|Escribe| C4
```

---

## 10. Paneles de Infraestructura

### RabbitMQ Management

- **URL:** http://localhost:15672
- **Usuario/Contraseña:** los definidos en `RABBITMQ_USER` / `RABBITMQ_PASS` del `.env`.
- Permite ver colas, mensajes en tránsito, consumidores conectados y tasas de procesamiento.

### MongoDB

- **Puerto:** `localhost:27017`
- **Base de datos:** `appointments_db`
- **Credenciales:** las definidas en `MONGO_USER` / `MONGO_PASS` del `.env`.
- Puedes conectarte con MongoDB Compass, mongosh o cualquier cliente:

```bash
mongosh "mongodb://sofka_admin:sofka_secure_pass_456@localhost:27017/appointments_db?authSource=admin"
```

### Colecciones principales

| Colección                | Contenido                                          |
| ------------------------ | -------------------------------------------------- |
| `appointments`           | Turnos de pacientes                                |
| `doctors`                | Médicos registrados                                |
| `profiles`               | Perfiles operativos (admin, recepcionista, doctor) |
| `operational_audit_logs` | Logs de auditoría operativa del producer           |
| `audit_logs`             | Logs de eventos clínicos del consumer              |
| `profile_audit_logs`     | Auditoría de cambios a perfiles                    |

---

## 11. Desarrollo Local

### Ejecutar tests

```bash
# Backend Producer
cd backend/producer && npm test

# Backend Consumer
cd backend/consumer && npm test

# Frontend
cd frontend && npm test

# Tests con cobertura
cd backend/producer && npm run test:cov
cd frontend && npm run test:cov
```

### Verificar TypeScript

```bash
cd backend/producer && npx tsc --noEmit
cd backend/consumer && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

### Ver logs en tiempo real

```bash
# Todos los servicios
docker compose logs -f

# Solo un servicio
docker compose logs -f producer
docker compose logs -f consumer
docker compose logs -f frontend
```

### Reconstruir un servicio específico

```bash
docker compose up -d --build producer
```

### Reconstruir todo desde cero

```bash
docker compose down -v
docker compose up -d --build
```

---

## 13. Usuarios de Prueba

El sistema usa **Firebase Authentication** para login. Los usuarios no vienen precargados; se crean en Firebase y luego se asocian a un perfil operativo en MongoDB.

### Usuarios recomendados para pruebas

Crear los siguientes usuarios en la consola de Firebase → Authentication → Users (email/password):

| Email                   | Contraseña     | Rol           | Nombre                |
| ----------------------- | -------------- | ------------- | --------------------- |
| `admin@clinica.com`     | `Admin.2026!`  | admin         | Admin Pruebas         |
| `recepcion@clinica.com` | `Recep.2026!`  | recepcionista | Recepcionista Pruebas |
| `doctor@clinica.com`    | `Doctor.2026!` | doctor        | Dr. Pruebas           |

### Cómo crear los usuarios paso a paso

**Paso 1 —** Crear los 3 usuarios en la consola de Firebase → Authentication → Users con los emails y contraseñas de la tabla anterior. Anotar el **UID** que Firebase asigna a cada uno.

**Paso 2 —** Registrar un médico (necesario para el rol doctor):

```bash
curl -X POST http://localhost:3000/doctors \
  -H "Content-Type: application/json" \
  -d '{"name": "Dr. Pruebas", "specialty": "General", "office": "1"}'
# Anotar el _id devuelto en la respuesta
```

**Paso 3 —** Loguearse como admin para obtener su token:

Ir a http://localhost:3001/login → ingresar `admin@clinica.com` / `Admin.2026!` → abrir DevTools (F12) → Network → buscar la petición a `/auth/session` → copiar el header `Authorization: Bearer <token>`.

**Paso 4 —** Crear los 3 perfiles operativos vía API (usando el token del admin):

```bash
# ADMIN
curl -X POST http://localhost:3000/profiles \
  -H "Authorization: Bearer <token-admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "<firebase-uid-admin>",
    "email": "admin@clinica.com",
    "display_name": "Admin Pruebas",
    "role": "admin"
  }'

# RECEPCIONISTA
curl -X POST http://localhost:3000/profiles \
  -H "Authorization: Bearer <token-admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "<firebase-uid-recep>",
    "email": "recepcion@clinica.com",
    "display_name": "Recepcionista Pruebas",
    "role": "recepcionista"
  }'

# DOCTOR (reemplazar <id-del-doctor-creado> con el _id del paso 2)
curl -X POST http://localhost:3000/profiles \
  -H "Authorization: Bearer <token-admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "<firebase-uid-doctor>",
    "email": "doctor@clinica.com",
    "display_name": "Dr. Pruebas",
    "role": "doctor",
    "doctor_id": "<id-del-doctor-creado>"
  }'
```

**Paso 5 —** Probar login desde el frontend:

| Probar como…      | Email                   | Contraseña     | Se redirige a       |
| ----------------- | ----------------------- | -------------- | ------------------- |
| **Admin**         | `admin@clinica.com`     | `Admin.2026!`  | `/admin/profiles`   |
| **Recepcionista** | `recepcion@clinica.com` | `Recep.2026!`  | `/registration`     |
| **Doctor**        | `doctor@clinica.com`    | `Doctor.2026!` | `/doctor/dashboard` |

### Usuarios de prueba en tests E2E (modo bypass)

Los tests automatizados usan un bypass de Firebase (`E2E_TEST_MODE=true`) con estos perfiles seed:

| UID ficticio         | Email                    | Rol           | Nombre            |
| -------------------- | ------------------------ | ------------- | ----------------- |
| `e2e-admin-uid-001`  | `e2e-admin@clinic.test`  | admin         | E2E Admin         |
| `e2e-recep-uid-001`  | `e2e-recep@clinic.test`  | recepcionista | E2E Recepcionista |
| `e2e-doctor-uid-001` | `e2e-doctor@clinic.test` | doctor        | E2E Doctor        |
| `e2e-no-profile-uid` | —                        | (sin perfil)  | Para probar 403   |

**Formato de token E2E:** `Bearer e2e::<uid>` (ej: `Bearer e2e::e2e-admin-uid-001`)

> **Importante:** El bypass solo funciona con `NODE_ENV=test` + `E2E_TEST_MODE=true`. En modo normal (Docker Compose), se requiere un token Firebase real.

---

## 14. Rutas del Frontend

Base URL: `http://localhost:3001`

| Ruta                | URL Completa                           | Acceso                | Descripción                                        |
| ------------------- | -------------------------------------- | --------------------- | -------------------------------------------------- |
| `/`                 | http://localhost:3001/                 | Público               | Pantalla de turnos en tiempo real (sala de espera) |
| `/login`            | http://localhost:3001/login            | Público               | Login con email y contraseña                       |
| `/dashboard`        | http://localhost:3001/dashboard        | Público / Autenticado | Dashboard de turnos con todos los estados          |
| `/registration`     | http://localhost:3001/registration     | Admin, Recepcionista  | Registro de nuevos turnos                          |
| `/doctor/dashboard` | http://localhost:3001/doctor/dashboard | Doctor                | Panel operativo del médico (check-in/out, atender) |
| `/admin/dashboard`  | http://localhost:3001/admin/dashboard  | Admin                 | Métricas operativas del sistema                    |
| `/admin/profiles`   | http://localhost:3001/admin/profiles   | Admin                 | Gestión CRUD de perfiles operativos                |
| `/admin/audit`      | http://localhost:3001/admin/audit      | Admin                 | Visor de logs de auditoría                         |

### Barra de Navegación

La aplicación incluye una **barra de navegación superior** persistente en todas las páginas que permite moverse entre secciones sin necesidad de escribir URLs:

- **Sin login:** muestra enlaces públicos (Turnos, Dashboard) + botón "Iniciar sesión".
- **Con login:** muestra enlaces según el rol del usuario + badge de rol + nombre + botón "Salir".
- Los enlaces visibles se adaptan automáticamente al rol:
  - **Admin:** Dashboard, Registro, Métricas, Gestión Operativa, Auditoría
  - **Recepcionista:** Dashboard, Registro
  - **Doctor:** Dashboard, Panel Doctor

---

## 12. Solución de Problemas

### El producer no arranca (crash loop)

**Síntoma:** `docker compose ps` muestra `Restarting`.

```bash
docker compose logs producer --tail 30
```

**Causas comunes:**

- MongoDB o RabbitMQ no están `healthy` todavía → esperar y reintentar.
- Falta `firebase-admin` en `node_modules` → reconstruir sin cache: `docker compose build --no-cache producer`.

---

### El frontend no carga

**Síntoma:** http://localhost:3001 no responde.

1. Verificar que esté corriendo: `docker compose ps frontend`.
2. Ver logs: `docker compose logs frontend --tail 20`.
3. Si muestra error de `NEXT_PUBLIC_API_BASE_URL`, verificar que exista en el `.env`.

---

### Los turnos no aparecen en la pantalla

**Síntoma:** se registra un turno pero no aparece.

1. Verificar que el consumer esté corriendo: `docker compose ps consumer`.
2. Verificar que RabbitMQ esté `healthy`.
3. Revisar logs del consumer: `docker compose logs consumer --tail 20`.
4. El scheduler asigna cada `SCHEDULER_INTERVAL_MS` ms (10 segundos por defecto). Esperar al menos ese tiempo.

---

### El login no funciona

**Síntoma:** al hacer login muestra error de autenticación.

1. Verificar que las variables `NEXT_PUBLIC_FIREBASE_*` estén en el `.env`.
2. Verificar que el proyecto Firebase tenga Authentication habilitado con email/password.
3. Verificar que exista un perfil operativo en la base de datos para el UID del usuario Firebase.

Sin Firebase configurado, la pantalla pública (`/`) funciona sin login.

---

### Puertos en conflicto

Si algún puerto ya está en uso:

```bash
# Cambiar en .env:
PRODUCER_PORT=3010
FRONTEND_PORT=3011
RABBITMQ_PORT=5673
RABBITMQ_MGMT_PORT=15673
MONGODB_PORT=27018
```

Luego reconstruir: `docker compose down && docker compose up -d`.

---

### Limpiar todo y empezar de cero

```bash
docker compose down -v --rmi all
docker compose up -d --build
```

Esto elimina contenedores, volúmenes (datos de MongoDB), imágenes y reconstruye todo.
