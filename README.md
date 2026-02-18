# IA_P1 - Real-Time Medical Appointment System

> Medical appointment management system based on **Microservices**, **Event-Driven Architecture**, and **WebSockets**.

## 🚀 Architecture and Flow

The system decouples appointment reception from processing to ensure high availability and scalability.

```mermaid
sequenceDiagram
    participant C as Client (Frontend)
    participant P as Producer (API + WS)
    participant Q as RabbitMQ
    participant W as Consumer (Worker)
    participant S as Scheduler (Consumer)
    participant D as MongoDB

    C->>P: 1. POST /appointments (HTTP)
    P->>Q: 2. Publishes 'create_appointment'
    P-->>C: 202 Accepted
    Q->>W: 3. Consumes message
    W->>D: 4. Saves appointment (Status: Waiting)
    
    loop Every 15s (Scheduler)
        S->>D: 5. Searches for waiting appointments
        S->>D: 6. Assigns office (Atomic Update)
        S->>Q: 7. Publishes 'appointment_updated'
    end

    Q->>P: 8. Consumes event 'appointment_updated'
    P->>C: 9. Emits WebSocket event (Real-time)
```

## 🧩 Services

| Service | Technology | Port | Responsibility |
|---|---|---|---|
| **Producer** | NestJS | `3000` | API Gateway, Input Validation, WebSocket Gateway, Swagger Documentation. |
| **Consumer** | NestJS | — | Async processing, Assignment Scheduler, DB Persistence. |
| **Frontend** | Next.js | `3001` | Reactive User Interface, WebSocket Client, Modern Design. |
| **RabbitMQ** | RabbitMQ 3 | `5672` | Messaging Broker (Queues: `turnos_queue`, `turnos_notifications`). |
| **MongoDB** | MongoDB 7 | `27017` | Persistent NoSQL Database. |

## 🛠️ Installation and Execution

### Prerequisites
- Docker Engine & Docker Compose

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Duver0/IA_P1.git
   cd IA_P1
   ```

2. **Start the infrastructure**
   ```bash
   docker compose up -d --build
   ```

3. **Access the application**
   - **Frontend:** [http://localhost:3001](http://localhost:3001)
   - **API Swagger:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
   - **RabbitMQ Admin:** [http://localhost:15672](http://localhost:15672) (user: `guest`, pass: `guest`)

## ✨ Key Features

- **Event-Driven**: Asynchronous communication between services for better resilience.
- **Real-Time**: Instant updates on the frontend via WebSockets (`socket.io`).
- **Concurrency Safe**: Atomic appointment assignment (`findOneAndUpdate`) to prevent race conditions.
- **Robustness**:
  - Typed error handling (`AppointmentEventPayload`).
  - Data validation (DTOs + `class-validator`).
  - Structured logs (`NestJS Logger`).
- **Infrastructure as Code**: Fully dockerized environment (`docker-compose.yml`).

## 📡 API Endpoints (Producer)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/appointments` | Create a new appointment (Async) |
| `GET` | `/appointments` | List all appointments |
| `GET` | `/appointments/:idCard` | Search appointments by ID card |

## 🧪 Manual Testing (cURL)

**Create an appointment:**
```bash
curl -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Test Patient", "idCard": 12345, "priority": "high"}'
```

**View response:**
```json
{
  "status": "accepted",
  "message": "Appointment assignment in progress"
}
```

## 📂 Project Structure

```
IA_P1/
├── backend/
│   ├── producer/        # API Gateway & WebSocket Server
│   │   ├── src/events/  # Event controllers (RabbitMQ -> WS)
│   │   └── src/turnos/  # HTTP business logic
│   └── consumer/        # Worker Service
│       ├── src/scheduler/ # Auto-assignment logic
│       └── src/turnos/    # MongoDB persistence
├── frontend/            # Next.js App Router
│   ├── src/hooks/       # Custom Hooks (useAppointmentsWebSocket)
│   └── src/domain/      # Shared models
├── docker-compose.yml   # Container orchestration
└── README.md            # Documentation
```

## 📝 Audit Notes (Recent Fixes)

- **Naming Convention**: Refactored the entire codebase from Spanish to English (e.g., `cedula` -> `idCard`, `nombre` -> `fullName`, `turno` -> `appointment`).
- **Type Safety**: Eliminated `any` types using shared interfaces (`AppointmentEventPayload`).
- **Race Conditions**: Corrected scheduler logic to ensure unique assignments.
- **Frontend Sync**: Adjusted types (`idCard: number`) to match the backend.
- **Docker Networking**: Configuration corrected for the browser client to use `localhost`.
- **Healthchecks**: Implemented healthchecks for all services in `docker-compose.yml`.
- **Ack/Nack explícitos**: The consumer confirms messages on success and differentiates `nack` without requeue for validation errors vs requeue on transient errors.
