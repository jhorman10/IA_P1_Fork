
# AI Workflow - AI Interaction Strategy

## AI-First Methodology

This project uses an **AI-First** methodology where the AI acts as a "Junior Developer" generating initial code that is then reviewed and refined by the team.

## Tools Used

- **GitHub Copilot**: Code generation and intelligent autocompletion.
- **Cursor**: AI-assisted code review and refactoring.

## Interaction Process

1. **Initial generation**: The AI generates the base project structure, including Docker configurations, microservices (Producer and Consumer), and frontend components.
2. **Human review**: The team reviews the generated code, paying special attention to areas marked with `// ⚕️ HUMAN CHECK`.
3. **Refinement**: The code is adjusted according to best practices and project-specific requirements.
4. **Validation**: Tests are run and the correct functioning of the system is verified.

## Sentinel Comments & Traceability

This project uses `// ⚕️ HUMAN CHECK` to mark points where human intervention was required.

### Examples of Evidence:
- **`docker-compose.yml`**: Configured healthchecks and memory limits.
- **`backend/producer/src/dto/create-appointment.dto.ts`**: Added specific validations for `idCard` range.
- **`backend/consumer/src/scheduler/scheduler.service.ts`**: Optimized hot path for performance.

## Prompts Used (Real Examples)

1. **Initial Refactor**: *"Refactorizar nomenclatura de español a inglés en todo el proyecto."* (Iteración 1: Falló en WebSocket interfaces -> Iteración 2: Corregido con Shared Types).
2. **Docker Orchestration**: *"Añadir healthchecks y asegurar que consumer espere a rabbitmq realmente."* (Resultado: Implementación de HealthControllers).

## What the AI Got Wrong (Anti-Pattern Log)

| Problema | Cómo se detectó | Fix aplicado | Prevención |
| :--- | :--- | :--- | :--- |
| **Credenciales Hardcodeadas** | Auditoría manual en `docker-compose.yml` | Uso de `.env` y variables de entorno | Checklist de pre-deployment |
| **Race Conditions** | Stress testing en la asignación de turnos | Bloqueo lógico y validación de estado previo | Tests unitarios concurrentes |
| **Nomenclatura inconsistente** | Code Review manual | Refactor total a idioma inglés | Guía de estilos en `agent.md` |
| **Falta de Validaciones** | Errores 500 en el backend al enviar tipos incorrectos | Decoradores `class-validator` en DTOs | Middleware de validación global |

## Recent Architectural Updates

- **English Naming Convention**: The project has undergone a complete refactor (e.g., `Appointment` instead of `Turno`).
- **Shared Types**: Use `AppointmentEventPayload` for all RabbitMQ and WebSocket events.
- **Automated Tests**: Moved critical tests to `src` directories for continuous validation.
