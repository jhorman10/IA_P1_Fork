# Action Summary Template

> **Instrucción:** Todo Sub-agente (SA) DEBE entregar este resumen al Orquestador al finalizar su tarea. El Orquestador integrará SOLO este resumen en su historial, descartando el razonamiento intermedio.

---

## Action Summary

- **Item:** `[DEBT_REPORT ID, ej: A-01]`
- **Skill:** `[skill utilizada, ej: backend-api]`
- **Files Changed:**
  - `path/to/file1.ts` — [descripción breve del cambio]
  - `path/to/file2.ts` — [descripción breve del cambio]
- **What Was Done:** [1-2 oraciones describiendo la acción realizada]
- **What to Validate:**
  - [ ] [Comando de test o verificación manual]
  - [ ] [Segunda verificación si aplica]
- **HUMAN CHECK Added:** [Sí/No — si sí, listar ubicaciones]
- **Breaking Changes:** [Sí/No — si sí, describir impacto]

---

## Ejemplo Completado

- **Item:** `A-01`
- **Skill:** `backend-api`
- **Files Changed:**
  - `backend/consumer/src/appointments/turnos.service.ts` — Added idempotency check using `findOne` before `create`
  - `backend/consumer/src/schemas/appointment.schema.ts` — Added unique compound index on `{ idCard, createdAt }`
- **What Was Done:** Implemented idempotency guard in appointment creation to prevent duplicates during RabbitMQ message redelivery.
- **What to Validate:**
  - [ ] `cd backend/consumer && npm run test`
  - [ ] Send duplicate message via RabbitMQ management UI → verify no duplicate entry
- **HUMAN CHECK Added:** Sí — `turnos.service.ts:45` (idempotency window logic)
- **Breaking Changes:** No
