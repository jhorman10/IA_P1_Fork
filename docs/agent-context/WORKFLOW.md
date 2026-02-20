# 🔄 Context: Workflow & Traceability

## 1. Flujo de Trabajo (The Algorithm)

1.  **LEER** → `DEBT_REPORT.md` (estado actual)
2.  **ELEGIR** → Siguiente ítem pendiente (status: ⬜)
3.  **MATCH** → Identificar skill por trigger (ver `SKILL_REGISTRY.md`)
4.  **PLANIFICAR** → SA presenta Plan de Acción al humano:
    - Archivos a modificar
    - Cambios propuestos (qué y por qué)
    - Patrones/principios aplicados
    - Riesgos o breaking changes
5.  **APROBAR** → El humano valida, corrige o rechaza el plan:
    - ✅ Aprobado → SA procede a ejecutar
    - ✏️ Corregido → SA ajusta plan y vuelve a paso 5
    - ❌ Rechazado → SA descarta y vuelve a paso 2
6.  **EJECUTAR** → SA implementa los cambios aprobados
7.  **RECIBIR** → Resumen de Acción del SA
8.  **REGISTRAR** → Actualizar `AI_WORKFLOW.md` con la interacción y commits
9.  **ACTUALIZAR** → Marcar ítem como ✅ en `DEBT_REPORT.md`
10. **PURGAR** → Descartar razonamiento intermedio del SA, conservar solo el resumen
11. **REPETIR** → Siguiente ítem

## 2. Trazabilidad (AI_WORKFLOW.md)

- **Cada interacción** (pregunta, corrección, generación de código) se registra.
- **Cada commit** se registra con: hash, fecha, tipo, descripción, actor (👤 Humano / 🤖 IA).
- **Cada decisión humana crítica** se documenta con contexto y justificación.
- Este archivo es la **evidencia auditable** de la colaboración Humano-IA.

## 3. Delegación Obligatoria

- Por cada ítem de feedback, instancia un **Sub-agente (SA)**.
- ❌ Prohibido realizar cambios extensos tú mismo.
- ✅ Cada SA recibe: ítem específico, skill aplicable, archivos en scope.
