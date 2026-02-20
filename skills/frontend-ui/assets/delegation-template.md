# Template de Delegación: Frontend (UI/UX)

> **Skills Requeridas:** `frontend-ui`, `refactor-arch`, `testing-qa`

## Estructura de Delegación a Sub-Agente

```javascript
// 1. Cargar contextos y skills
const PROJECT_CONTEXT = await read_file("docs/agent-context/PROJECT_CONTEXT.md");
const RULES = await read_file("docs/agent-context/RULES.md");
const frontendSkill = await read_file("skills/frontend-ui/skill.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegar a Sub-Agente con contexto completo
await runSubagent({
    description: "[Frontend] Refactor Component XYZ",
    prompt: `
# Contexto del Proyecto:
${PROJECT_CONTEXT}

# Reglas Arquitectónicas:
${RULES}

# Skills Cargadas:

## 1. Frontend UI (Vercel React Best Practices):
${frontendSkill}

## 2. Architecture Refactoring:
${refactorSkill}

## 3. Testing & QA:
${testingSkill}

# Tarea: [Descripción de la tarea de frontend]

## Objetivo:
- Refactorizar componentes aplicando React patterns (hooks, composition, memoization)
- Aplicar Clean Architecture (SRP, DIP) en capa de presentación
- Crear tests unitarios y de integración

## Restricciones:
- No usar class components (usar functional components)
- TypeScript strict mode
- Cobertura de tests >80%
- Seguir Conventional Commits

## Entregables:
1. Código refactorizado
2. Tests (unit + integration)
3. Comentarios // ⚕️ HUMAN CHECK donde aplique
4. Documentación de cambios
    `
});
```

## Ejemplo de Uso Real

**Usuario solicita:** "Refactoriza el componente AppointmentCard aplicando SRP"

**AO ejecuta:**
```javascript
await runSubagent({
    description: "[Frontend] Refactor AppointmentCard (SRP)",
    prompt: `
# Contexto del Proyecto: [PROJECT_CONTEXT cargado]
# Reglas Arquitectónicas: [RULES cargadas]
# Skills: frontend-ui, refactor-arch, testing-qa

# Tarea: 
Refactorizar \`AppointmentCard.tsx\` separando responsabilidades:
- Extraer sub-componentes (AppointmentStatus, AppointmentInfo, AppointmentActions)
- Crear custom hooks (useAppointmentActions, useAppointmentData)
- Modularizar estilos en CSS Modules separados
- Agregar tests unitarios de cada sub-componente
- Tests de integración del flujo completo

# Entregables:
1. AppointmentCard refactorizado (SRP aplicado)
2. 3+ sub-componentes
3. 2+ custom hooks
4. Tests >85% coverage
    `
});
```

## Checklist Post-Delegación

- [ ] SA aplicó principios React (hooks, composition, memoization)
- [ ] SA aplicó Clean Architecture (SRP, DIP)
- [ ] Tests creados (>80% coverage)
- [ ] Commits con Conventional Commits
- [ ] Documentado en AI_WORKFLOW.md
- [ ] DEBT_REPORT.md actualizado (si aplica)
