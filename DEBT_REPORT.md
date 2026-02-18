# 📋 Feedback Tracker — IA_P1_Fork

> **Estado consolidado** de todos los ítems de feedback del proyecto.
> Actualizado por el Agente Orquestador después de cada resolución.

**Leyenda:** ⬜ Pendiente | 🔄 En progreso | ✅ Resuelto | ⏸️ Bloqueado

---

## Feedback: Alexis (Backend)

| ID | Category | Item | Skill | Status |
|----|----------|------|-------|--------|
| A-01 | Architecture | Falta de idempotencia en creación de turnos (riesgo de duplicados) | `backend-api` | ✅ |
| A-02 | Database | Falta de índices en MongoDB (rendimiento y consistencia) | `backend-api` | ✅ |
| A-03 | Messaging | Manejo incorrecto de ack/nack en Consumer (bloqueo con prefetch=1) | `backend-api` | ✅ |
| A-04 | Config | Scheduler inconsistente con documentación (1s vs 15s) | `backend-api` | ✅ |
| A-05 | Docker | Credenciales por defecto, puertos expuestos, sin healthchecks | `docker-infra` | ✅ |
| A-06 | Messaging | ValidationPipe global en microservicio RMQ | `backend-api` | ✅ |

---

## Feedback: Esteban Rodríguez

| ID | Category | Item | Skill | Status |
|----|----------|------|-------|--------|
| E-01 | Strategy | `AI_WORKFLOW.md` no registra prompts ni iteraciones | `skill-creator` | ✅ |
| E-02 | Code | Falta campo `priority` — incoherencia UI-Backend | `backend-api` | ✅ |
| E-03 | Code | Nomenclatura en español | `backend-api` | ✅ |
| E-04 | Transparency | No hay documentación real de errores de IA | `skill-creator` | ✅ |
| E-05 | Docker | Credenciales por defecto (`guest`, `admin123`), sin healthchecks | `docker-infra` | ✅ |
| E-06 | Git | Historial de commits caótico, sin estructura semántica | — | ✅ |
| E-07 | Performance | Scheduler procesa solo 1 paciente por tick (batch assignment sugerido) | `backend-api` | ✅ |

---

## Feedback: German Rojas (QA)

| ID | Category | Item | Skill | Status |
|----|----------|------|-------|--------|
| G-01 | Strategy | `AI_WORKFLOW.md` genérico, sin evidencia ni prompts reales | `skill-creator` | ✅ |
| G-02 | Code | 35 instancias de `HUMAN CHECK` — calidad excelente | — | ✅ |
| G-03 | Transparency | Sección "Lo que la IA hizo mal" existe pero con título incorrecto | `skill-creator` | ✅ |
| G-04 | Docker | Faltan healthchecks en producer y consumer | `docker-infra` | ✅ |
| G-05 | Git | Uso inconsistente de ramas feature/* | — | ⬜ |
| G-06 | Performance | `todosConsultorios` se recrea en cada tick del scheduler | `backend-api` | ✅ |
| G-07 | Testing | Falta tests unitarios para Consumer (Scheduler) y Frontend | `testing-qa` | ✅ |
| G-08 | Code | React Warning: setState synchronously within an effect in Dashboard | `frontend-ui` | ✅ |

---

## Resumen

| Status | Count |
|--------|-------|
| ✅ Resuelto | 20 |
| ⬜ Pendiente | 1 |
| 🔄 En progreso | 0 |
| ⏸️ Bloqueado | 0 |
