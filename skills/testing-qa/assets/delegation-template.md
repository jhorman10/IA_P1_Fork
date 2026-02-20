# Template de Delegación: Testing & QA

> **Skills Requeridas:** `testing-qa`, `refactor-arch`, `solid-principles`

## Estructura de Delegación a Sub-Agente

```javascript
// 1. Cargar contextos y skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const solidSkill = await read_file("skills/solid-principles/skill.md");

// 2. Delegar a Sub-Agente con contexto completo
await runSubagent({
  description: "[Testing] QA for Feature XYZ",
  prompt: `
# Contexto del Proyecto:
${PROJECT_CONTEXT}

# Reglas Arquitectónicas:
${RULES}

# Skills Cargadas:

## 1. Testing & QA (Jest/Playwright):
${testingSkill}

## 2. Architecture Refactoring:
${refactorSkill}

## 3. SOLID Principles:
${solidSkill}

# Tarea: [Descripción de la tarea de testing/QA]

## Objetivo:
- Crear tests unitarios (coverage >80%)
- Crear tests de integración (flujos críticos)
- Aplicar AAA pattern (Arrange-Act-Assert)
- Aplicar Test-Driven Development (TDD) cuando aplique
- Validar edge cases y casos maliciosos

## Restricciones:
- Tests deben ser independientes (no dependencias entre tests)
- Usar mocks/stubs para dependencias externas (MongoDB, RabbitMQ)
- Tests deterministicos (no flaky tests)
- Cobertura >80% obligatoria
- Seguir Conventional Commits

## Entregables:
1. Tests unitarios (unit tests)
2. Tests de integración (integration tests)
3. Tests de edge cases
4. Coverage report (>80%)
5. Documentación de escenarios testeados
    `,
});
```

## Ejemplo de Uso Real

**Usuario solicita:** "Necesito tests completos para el scheduler de consultorios"

**AO ejecuta:**

```javascript
await runSubagent({
  description: "[Testing] Complete Test Suite for Office Scheduler",
  prompt: `
# Contexto del Proyecto: [PROJECT_CONTEXT cargado]
# Reglas Arquitectónicas: [RULES cargadas]
# Skills: testing-qa, refactor-arch, solid-principles

# Tarea:
Crear suite completa de tests para \`AssignAvailableOfficesUseCase\`:
1. Tests unitarios:
   - Happy path: 4 consultorios, 4 citas → 1 cita por consultorio
   - Edge case: 4 consultorios, 10 citas → distribución equitativa
   - Edge case: 3 consultorios disponibles, 12 citas → uso de modulo
   - Error case: 0 consultorios disponibles → throw error
2. Tests de integración:
   - Mock de ConsultationPolicy (isAvailable)
   - Verificar actualización de estado en repositorio
   - Validar transacciones (rollback en caso de error)
3. Tests de casos límite:
   - Citas con horarios conflictivos
   - ConsultationPolicy rechaza todos los consultorios

# Entregables:
1. 15+ tests unitarios (coverage >90%)
2. 5+ tests de integración
3. Coverage report
    `,
});
```

## Checklist Post-Delegación

- [ ] SA creó tests unitarios (>80% coverage)
- [ ] SA creó tests de integración (flujos críticos)
- [ ] SA aplicó AAA pattern (Arrange-Act-Assert)
- [ ] Tests son independientes (no interdependencias)
- [ ] Tests son deterministicos (no flaky)
- [ ] Edge cases cubiertos
- [ ] Commits con Conventional Commits
- [ ] Documentado en AI_WORKFLOW.md
- [ ] DEBT_REPORT.md actualizado (si se corrigió deuda)
