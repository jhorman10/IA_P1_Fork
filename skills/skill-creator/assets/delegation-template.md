# Template de delegacion: Creacion de skills

> **Skills requeridas:** `skill-creator`, `refactor-arch`, `testing-qa`

## Estructura de delegacion a sub-agente

```javascript
// 1. Cargar contextos y skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const creatorSkill = await read_file("skills/skill-creator/skill.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegar a Sub-Agente con contexto completo
await runSubagent({
  description: "[Skill] Create new skill for XYZ",
  prompt: `
# Contexto del Proyecto:
${PROJECT_CONTEXT}

# Reglas Arquitectonicas:
${RULES}

# Skills Cargadas:

## 1. Skill Creator (meta-skill):
${creatorSkill}

## 2. Architecture Patterns (para estructura):
${refactorSkill}

## 3. Testing & QA (para calidad):
${testingSkill}

# Tarea: [Descripcion de la nueva skill a crear]

## Objetivo:
- Identificar gap: que tipo de tarea no esta cubierta
- Verificar que no existe skill con overlap (grep triggers en skills/)
- Crear directorio skills/<nombre>/
- Crear skill.md con YAML frontmatter + Context/Rules/Tools/Workflow/Assets
- Crear assets/templates/ con al menos un ejemplo
- Crear assets/docs/ con documentacion relevante

## Restricciones:
- YAML frontmatter obligatorio (name, description, trigger, scope, author, version, license, autoinvoke)
- Secciones obligatorias: Context, Rules, Tools Permitted, Workflow, Assets
- No crear skills que se solapen con las 8 existentes
- Incluir delegation-template.md en assets/
- Ejecutar bash scripts/sync.sh despues de crear

## Entregables:
1. skills/<nombre>/skill.md (completo)
2. skills/<nombre>/assets/templates/<ejemplo> (minimo 1)
3. skills/<nombre>/assets/docs/<doc> (minimo 1)
4. skills/<nombre>/assets/delegation-template.md
5. SKILL_REGISTRY.md actualizado (via sync.sh)
    `,
});
```

## Ejemplo de uso real

**Usuario solicita:** "Necesito una skill para gestionar migraciones de base de datos"

**AO ejecuta:**

```javascript
await runSubagent({
  description: "[Skill] Create database-migrations skill",
  prompt: `
# Contexto del Proyecto: [PROJECT_CONTEXT cargado]
# Reglas Arquitectonicas: [RULES cargadas]
# Skills: skill-creator, refactor-arch, testing-qa

# Tarea:
Crear nueva skill 'database-migrations' que cubra:
1. Trigger: migrations, schema changes, database versioning, data seeding
2. Scope: backend/*/src/infrastructure/persistence/, scripts/
3. Rules: versionado de schemas, rollback de migraciones, seed data separado
4. Templates: migracion de referencia, script de rollback
5. Docs: guia de migraciones, checklist de validacion

# Verificacion previa:
- grep -r "migration" skills/*/skill.md (confirmar no overlap)

# Post-creacion:
- bash scripts/sync.sh
    `,
});
```

## Checklist post-delegacion

- [ ] YAML frontmatter completo y valido
- [ ] Todas las secciones presentes (Context, Rules, Tools, Workflow, Assets)
- [ ] No hay overlap con skills existentes (triggers unicos)
- [ ] assets/templates/ tiene al menos 1 ejemplo
- [ ] assets/docs/ tiene al menos 1 documento
- [ ] assets/delegation-template.md creado
- [ ] bash scripts/sync.sh ejecutado exitosamente
- [ ] SKILL_REGISTRY.md refleja la nueva skill
- [ ] Commits con Conventional Commits
- [ ] Documentado en AI_WORKFLOW.md
