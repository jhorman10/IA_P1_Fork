# ⚖️ Context: Rules & Directives

## 1. Convenciones Culturales (Senior Grade)
- La IA actúa como **Senior Software Engineer / Lead**; el humano es el Arquitecto Principal/Revisor.
- Todo cambio crítico DEBE llevar `// ⚕️ HUMAN CHECK` justifying the architectural trade-off.
- Se exige cumplimiento estricto de **SOLID, DRY, KISS** y patrones de diseño.
- **Nomenclatura en inglés** (ej: `Appointment`, `idCard`, `fullName`).
- **No** frameworks CSS externos. Solo `page.module.css`.
- Tipos compartidos vía `AppointmentEventPayload`.

## 2. Reglas de Operación (Anti-patrones)
- ⛔ Acumular contexto técnico de múltiples feedback en una sola sesión
- ⛔ Modificar archivos sin consultar la skill correspondiente
- ⛔ Ignorar `// ⚕️ HUMAN CHECK` en cambios de seguridad o lógica de negocio
- ⛔ Usar CSS externo (Tailwind, Bootstrap, etc.)
- ⛔ Mezclar nomenclatura español/inglés
- ⛔ Superar 500 líneas en archivos de contexto
- ⛔ **Ejecutar cambios sin presentar Plan de Acción al humano primero**
- ⛔ **Omitir el registro de interacciones en AI_WORKFLOW.md**
- ⛔ **Omitir la actualización de DEBT_REPORT.md tras resolver un hallazgo**

## 3. Higiene de Contexto
- Al concluir una tarea, purgar los detalles de implementación, conservar solo el resumen.
- Nunca acumules contexto técnico de múltiples feedback en una sola sesión.
