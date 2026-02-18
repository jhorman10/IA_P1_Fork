
# AI Workflow - AI Interaction Strategy

## AI-First Methodology

This project uses an **AI-First** methodology where the AI acts as a "Junior Developer" generating initial code that is then reviewed and refined by the team.

## Tools Used

- **Antigravity**: Primary AI orchestration and code generation (current).
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
| **Nomenclatura inconsistente** | Code Review manual | Refactor total a idioma inglés | Guía de estilos en `GEMINI.md` |
| **Falta de Validaciones** | Errores 500 en el backend al enviar tipos incorrectos | Decoradores `class-validator` en DTOs | Middleware de validación global |

## Recent Architectural Updates

- **English Naming Convention**: The project has undergone a complete refactor (e.g., `Appointment` instead of `Turno`).
- **Shared Types**: Use `AppointmentEventPayload` for all RabbitMQ and WebSocket events.
- **Automated Tests**: Moved critical tests to `src` directories for continuous validation.

---

## Prompt Traceability Log

> Migrado desde `PROMPT_LOG.md` — Registro de las interacciones más significativas con la IA.

| Fecha | Contexto / Tarea | Resumen del Prompt | Resultado / Aprendizaje |
| :--- | :--- | :--- | :--- |
| 17/02/2026 | **Refactor de Nomenclatura** | "Refactoriza todo el proyecto de español a inglés. `cedula` -> `idCard`, `nombre` -> `fullName`, `turno` -> `appointment`." | Refactorización masiva en 20+ archivos. Se detectaron problemas en las interfaces de WebSocket que requirieron intervención manual (`shared types`). |
| 13/02/2026 | **Optimización del Scheduler** | "El scheduler crea un array innecesario en cada tick. Optimízalo moviendo la lógica al constructor." | Se redujo la presión sobre el Garbage Collector precalculando los consultorios libres al inicio del servicio. |
| 12/02/2026 | **Orquestación Docker & Healthchecks** | "Añade healthchecks reales en el backend y configura docker-compose para que los servicios esperen a que las dependencias estén LISTAS." | Implementación de `HealthController` y mejora de `docker-compose.yml`. Se corrigieron errores de conexión prematura. |
| 11/02/2026 | **Sincronización de Prioridad** | "La prioridad no se sincroniza correctamente entre el Front y el Back. Asegura que el enum coincida." | Sincronización de la lógica de negocio. Se añadió validación en el DTO del Producer. |

### 🛡️ Decisiones Críticas (Human in the Loop)

1. **Seguridad:** El Agente sugirió usar credenciales por defecto (`guest`). Se forzó el uso de `.env` para producción.
2. **Arquitectura:** Se decidió mantener `Producer/Consumer` desacoplados vía RabbitMQ a pesar de las alucinaciones de la IA sugiriendo una API directa en fases tempranas.
3. **Validación:** Se auditó manualmente el uso de `class-validator` ya que la IA olvidaba decorar campos opcionales.

