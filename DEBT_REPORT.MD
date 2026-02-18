# DEBT REPORT - Feedback List

Este documento lista la deuda técnica y el feedback de auditoría a ser procesado por el Agente Orquestador.

## 🔴 Críticos (Prioridad Alta)
- [x] **Seguridad - Credenciales Hardcodeadas:** Mover valores de `docker-compose.yml` a `.env`. (Completado: .env creado y docker-compose actualizado)
- [x] **Sincronización UI/Backend:** Añadir campo `priority` en `AppointmentRegistrationForm.tsx`. (Completado: select de prioridad añadido y enviado al backend)

## 🟠 Funcionales & Performance (Prioridad Media)
- [x] **Optimización Batch (Consumer):** Implementar asignación en lote en `scheduler.service.ts` para múltiples consultorios libres. (Completado: Bucle de asignación implementado)
- [x] **Optimización Hot Path (Consumer):** Precalculate `allOffices` en el constructor de `scheduler.service.ts`. (Completado: Array precalculado en constructor)
- [x] **Orquestación Docker:** Añadir `healthchecks` en `producer` y `consumer`. (Completado: HealthControllers añadidos y docker-compose actualizado con healthchecks y hybrid mode)
- [x] **Mantenibilidad:** Refactorizar nomenclatura de español a inglés (ej. `cedula` -> `idCard`, `nombre` -> `fullName`). (Completado: Refactor total en backend, frontend, tests y documentacion)

## 🟢 Documentación & Transparencia (Prioridad Baja)
- [x] **Trazabilidad de IA:** Crear `PROMPT_LOG.md` con las últimas interacciones significativas. (Completado: Archivo creado con traza de decisiones críticas)
- [x] **AI Workflow:** Actualizar `AI_WORKFLOW.md` con ejemplos reales de errores y correcciones ("Lo que la IA hizo mal"). (Completado: Enriquecido con tabla de anti-patrones y evidencia de sentinel comments)
- [x] **Tests:** Mover y configurar archivos `.spec` y `.test` desde `refactor/fix/docs` a sus rutas destino. (Completado: Migrados y configurados con nomenclatura en inglés)
