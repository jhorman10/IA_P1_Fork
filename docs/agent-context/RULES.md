# Context: Rules and directives

## 1. Convenciones Culturales (Senior Grade)

- La IA actúa como **Senior Software Engineer / Lead**; el humano es el Arquitecto Principal/Revisor.
- Todo cambio crítico DEBE llevar `// HUMAN CHECK` justifying the architectural trade-off.
- Se exige cumplimiento estricto de **SOLID, DRY, KISS** y patrones de diseño.
- **Nomenclatura en inglés** (ej: `Appointment`, `idCard`, `fullName`).
- **No** frameworks CSS externos. Solo `page.module.css`.
- Tipos compartidos vía `AppointmentEventPayload`.

## 2. Reglas de Operación (Anti-patrones)

- Anti-pattern: Acumular contexto técnico de múltiples feedback en una sola sesión
- Anti-pattern: Modificar archivos sin consultar la skill correspondiente
- Anti-pattern: Ignorar `// HUMAN CHECK` en cambios de seguridad o lógica de negocio
- Anti-pattern: Usar CSS externo (Tailwind, Bootstrap, etc.)
- Anti-pattern: Mezclar nomenclatura español/inglés
- Anti-pattern: Superar 500 líneas en archivos de contexto
- Anti-pattern: **Ejecutar cambios sin presentar Plan de Acción al humano primero**
- Anti-pattern: **Omitir el registro de interacciones en AI_WORKFLOW.md**
- Anti-pattern: **Omitir la actualización de DEBT_REPORT.md tras resolver un hallazgo**

## 3. Markdown Style (mandatory)

- Every `.md` file MUST comply with `docs/MD_STYLE_GUIDE.md`.
- Anti-pattern: Emoji in headings, tables or bullet lists
- Anti-pattern: ALL-CAPS in titles or headings
- Anti-pattern: Mixed languages within the same file
- Anti-pattern: Using emoji for status indicators instead of text labels (`Done`, `Pending`, `In progress`, `Paused`, `Blocked`)
- Anti-pattern: More than one horizontal rule (`---`) per file
- When creating or editing any `.md` file, run the checklist in `MD_STYLE_GUIDE.md` section 11 before finishing.

## 4. Higiene de Contexto

- Al concluir una tarea, purgar los detalles de implementación, conservar solo el resumen.
- Nunca acumules contexto técnico de múltiples feedback en una sola sesión.
