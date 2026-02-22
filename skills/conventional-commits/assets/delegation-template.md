# Template de delegacion: Conventional Commits

> **Skills requeridas:** `conventional-commits`, `skill-creator` (opcional)

## Estructura de delegacion a sub-agente

```javascript
// 1. Cargar contextos y skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const commitsSkill = await read_file("skills/conventional-commits/skill.md");

// 2. Delegar a Sub-Agente con contexto completo
await runSubagent({
  description: "[Commits] Format and create commits for XYZ",
  prompt: `
# Contexto del Proyecto:
${PROJECT_CONTEXT}

# Reglas Arquitectonicas:
${RULES}

# Skills Cargadas:

## 1. Conventional Commits:
${commitsSkill}

# Tarea: [Descripcion de los commits a crear]

## Objetivo:
- Crear commits atomicos siguiendo Conventional Commits 1.0.0
- Un tipo por commit (no mezclar feat + fix + refactor)
- Scope correcto segun tabla de scopes del proyecto
- Descripcion en minusculas, imperativo presente, max 72 chars, sin punto final

## Restricciones:
- Formato: <tipo>(<scope>): <descripcion>
- Tipos permitidos: feat, fix, refactor, docs, test, chore, build, ci, perf, style, revert
- Breaking changes con ! o BREAKING CHANGE: en footer
- Prohibido: WIP, update files, fix stuff, mensajes vagos

## Entregables:
1. Commits formateados y ejecutados
2. Breaking changes documentados (si aplica)
    `,
});
```

## Ejemplo de uso real

**Usuario solicita:** "Crea los commits para los cambios de refactoring de la entidad Appointment"

**AO ejecuta:**

```javascript
await runSubagent({
  description: "[Commits] Create atomic commits for Appointment refactor",
  prompt: `
# Contexto del Proyecto: [PROJECT_CONTEXT cargado]
# Reglas Arquitectonicas: [RULES cargadas]
# Skills: conventional-commits

# Tarea:
Crear commits atomicos para los siguientes cambios:
1. Nueva entidad de dominio Appointment (domain/entities/)
2. Nuevo puerto AppointmentRepository (domain/ports/)
3. Adaptador MongooseAppointmentRepository (infrastructure/)
4. Tests unitarios de la entidad
5. Documentacion actualizada

# Commits esperados:
- refactor(consumer): extract appointment entity to domain layer
- refactor(consumer): create appointment repository port
- refactor(consumer): implement mongoose appointment adapter
- test(consumer): add unit tests for appointment entity
- docs(traceability): update AI_WORKFLOW.md with refactor entry
    `,
});
```

## Checklist post-delegacion

- [ ] Cada commit tiene tipo y scope validos
- [ ] Descripcion en minusculas, imperativo, sin punto final
- [ ] Max 72 caracteres en primera linea
- [ ] Un tipo por commit (atomico)
- [ ] Breaking changes documentados con ! o BREAKING CHANGE:
- [ ] git log --oneline muestra formato correcto
- [ ] Documentado en AI_WORKFLOW.md
