# PROMPT LOG - IA Interaction Traceability

Este log registra las interacciones más significativas con la IA durante el desarrollo del proyecto, proporcionando visibilidad sobre el proceso de toma de decisiones y refinamiento.

| Fecha | Contexto / Tarea | Resumen del Prompt | Resultado / Aprendizaje |
| :--- | :--- | :--- | :--- |
| 17/02/2026 | **Refactor de Nomenclatura** | "Refactoriza todo el proyecto de español a inglés. `cedula` -> `idCard`, `nombre` -> `fullName`, `turno` -> `appointment`." | Refactorización masiva en 20+ archivos. Se detectaron problemas en las interfaces de WebSocket que requirieron intervención manual (`shared types`). |
| 13/02/2026 | **Optimización del Scheduler** | "El scheduler crea un array innecesario en cada tick. Optimízalo moviendo la lógica al constructor." | Se redujo la presión sobre el Garbage Collector precalculando los consultorios libres al inicio del servicio. |
| 12/02/2026 | **Orquestación Docker & Healthchecks** | "Añade healthchecks reales en el backend y configura docker-compose para que los servicios esperen a que las dependencias estén LISTAS." | Implementación de `HealthController` y mejora de `docker-compose.yml`. Se corrigieron errores de conexión prematura. |
| 11/02/2026 | **Sincronización de Prioridad** | "La prioridad no se sincroniza correctamente entre el Front y el Back. Asegura que el enum coincida." | Sincronización de la lógica de negocio. Se añadió validación en el DTO del Producer. |

## 🛡️ Decisiones Críticas (Human in the Loop)

1. **Seguridad:** El Agente sugirió usar credenciales por defecto (`guest`). Se forzó el uso de `.env` para producción.
2. **Arquitectura:** Se decidió mantener `Producer/Consumer` desacoplados vía RabbitMQ a pesar de las alucinaciones de la IA sugiriendo una API directa en fases tempranas.
3. **Validación:** Se auditó manualmente el uso de `class-validator` ya que la IA olvidaba decorar campos opcionales.
