# Agente Orquestador — IA_P1_Fork

> **Principio de Responsabilidad Unica (SRP):** Este archivo orquesta la delegacion a Sub-Agentes (SA).
> **Toda regla, contexto y workflow estan en archivos externos** — este archivo solo coordina.

---

## 0. BOOTSTRAP: Mandatory context loading

> **CRITICO:** Antes de ejecutar cualquier tarea, **DEBES** cargar los 4 modulos de contexto **CON VALIDACION**.

```javascript
// Paso 0: Inyeccion de Dependencias (DIP) — CON FAIL-FAST
const REQUIRED_MODULES = [
  "docs/agent-context/PROJECT_CONTEXT.md",
  "docs/agent-context/RULES.md",
  "docs/agent-context/WORKFLOW.md",
  "docs/agent-context/SKILL_REGISTRY.md",
];

// FAIL-FAST: Validar existencia ANTES de cargar
for (const mod of REQUIRED_MODULES) {
  if (!(await file_exists(mod))) {
    STOP(`BOOTSTRAP FAILED: ${mod} not found. Do NOT proceed.`);
  }
}

const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const WORKFLOW = await read_file("docs/agent-context/WORKFLOW.md");
const SKILL_REGISTRY = await read_file("docs/agent-context/SKILL_REGISTRY.md");
```

**Single Source of Truth:**

- **Arquitectura/Stack:** `PROJECT_CONTEXT.md` (NestJS, Next.js, MongoDB, RabbitMQ)
- **Reglas/Anti-patrones:** `RULES.md` (SOLID, DRY, KISS, nomenclatura, // HUMAN CHECK)
- **Workflow de 11 pasos:** `WORKFLOW.md` (Leer > Elegir > Match > Planificar > Aprobar > Ejecutar...)
- **Catalogo de Skills:** `SKILL_REGISTRY.md` (8 skills con triggers, paths, scopes)
- **Estilo Markdown:** `docs/MD_STYLE_GUIDE.md` (sin emoji en headings/tablas, sentence case, vocabulario de estado estandarizado)

## 1. Skill selection protocol

### 1.1 — Matriz de skills por tipo de tarea

**Referencia completa:** `SKILL_REGISTRY.md` (8 skills disponibles)

| Tipo de tarea           | Skills requeridas (minimo 2-3)                     |
| ----------------------- | -------------------------------------------------- |
| Frontend (UI/UX)        | `frontend-ui`, `refactor-arch`, `testing-qa`       |
| Backend (API/Logic)     | `backend-api`, `refactor-arch`, `testing-qa`       |
| Refactor arquitectonico | `refactor-arch`, `testing-qa`                      |
| Microservicios          | `backend-api`, `refactor-arch`, `testing-qa`       |
| Security/Auditoria      | `security-audit`, `refactor-arch`, `testing-qa`    |
| Testing/QA              | `testing-qa`, `refactor-arch`                      |
| Docker/Infra            | `docker-infra`, `backend-api`, `testing-qa`        |
| Commits/Docs            | `conventional-commits`, `skill-creator` (opcional) |
| Creacion de skills      | `skill-creator`, `refactor-arch`, `testing-qa`     |

### 1.2 — Skill dependency graph

> **Orden de ejecucion:** Las skills de dominio se ejecutan primero, testing valida, commits cierra.

```plaintext
refactor-arch ─┐
backend-api  ──┤── (domain skills: execute first)
frontend-ui  ──┤
docker-infra ──┘
security-audit ──── (pre-deploy validation, after domain changes)
testing-qa ──────── (quality gate: validates ALL changes from domain skills)
conventional-commits ── (post-execution: always LAST)
skill-creator ─────── (meta: only when no existing skill covers the task)
```

**Regla:** Si una tarea requiere output de una skill como input de otra (ej: `refactor-arch` produce interfaces que `backend-api` implementa), el SA debe ejecutarlas en el orden del grafo y pasar el contexto entre pasos.

### 1.3 — Delegation algorithm

> **Ref:** Ver `WORKFLOW.md` seccion "1. Flujo de Trabajo" (pasos 3-6: MATCH > PLANIFICAR > APROBAR > EJECUTAR)

```javascript
// Algoritmo de Delegacion a Sub-Agentes (SA) — CON GUARDRAILS
// NOTA: Asume que PROJECT_CONTEXT, RULES, WORKFLOW, SKILL_REGISTRY
//       ya estan cargados y validados (Bootstrap seccion 0)

async function delegarTarea(solicitudUsuario, retryCount = 0) {
  const MAX_RETRIES = 2;

  // 1. Identificar tipo de tarea (consultar SKILL_REGISTRY ya cargado)
  const tipo = identificarTipo(solicitudUsuario);
  const skillsRequeridas = SKILL_REGISTRY[tipo].requiredSkills; // 2-3 skills minimo

  // 2. FAIL-FAST: Validar que TODAS las skills existen en disco
  for (const skillName of skillsRequeridas) {
    if (!(await file_exists(`skills/${skillName}/skill.md`))) {
      STOP(`Skill "${skillName}" not found on disk. Use skill-creator first.`);
    }
  }

  // 3. Cargar skills en orden de dependencia
  const orderedSkills = resolveDependencyOrder(skillsRequeridas);
  const skills = {};
  for (const skillName of orderedSkills) {
    skills[skillName] = await read_file(`skills/${skillName}/skill.md`);
  }

  // 4. Calcular scope permitido (union de scopes de todas las skills)
  const allowedScope = mergeScopes(orderedSkills.map((s) => skills[s].scope));

  // 5. Delegar a SA con contexto completo + guardrails
  const resultado = await runSubagent({
    description: `[Tipo: ${tipo}] ${extraerTituloCorto(solicitudUsuario)}`,
    prompt: `
# Contexto del Proyecto: ${PROJECT_CONTEXT}

# Reglas Arquitectonicas: ${RULES}

# Skills Cargadas (en orden de ejecucion):
${orderedSkills
  .map(
    (name, i) => `
## ${i + 1}. ${name}:
${skills[name]}
`,
  )
  .join("\n")}

# Tarea: ${solicitudUsuario}

# Reglas Estrictas de Codigo:
- Ejecutar el linter y asegurar que no hay errores.
- Todo el codigo debe estar 100% tipado.
- PROHIBIDO el uso de \`any\`.

# SCOPE LIMIT (guardrail):
- Solo modificar archivos dentro de: ${allowedScope.join(", ")}
- Si necesitas modificar archivos FUERA del scope → DETENTE y reporta al orquestador.
- Max 5 archivos fuente + skill.md + RULES.md por contexto de SA.

# Entregables:
1. Codigo implementado (aplicando skills en orden)
2. Tests (coverage >80%)
3. Documentacion de cambios (// HUMAN CHECK donde aplique)
4. Action Summary (formato: skills/action-summary-template.md)
        `,
  });

  // 6. SCOPE ENFORCEMENT: Validar que el SA no modifico fuera de scope
  if (resultado.filesChanged.some((f) => !isInScope(f, allowedScope))) {
    await rollback(); // git checkout -- .
    await registrarFallo("SCOPE_VIOLATION", resultado);
    ESCALATE("SA modified files outside allowed scope. Human review required.");
  }

  // 7. QUALITY GATES: Validar tests y linter
  const testsPass = await runTests(resultado.filesChanged);
  const lintClean = await runLinter(resultado.filesChanged);

  if (!testsPass || !lintClean) {
    if (retryCount < MAX_RETRIES) {
      await rollback();
      return delegarTarea(solicitudUsuario, retryCount + 1);
    }
    await rollback();
    ESCALATE(
      `Quality gates failed after ${MAX_RETRIES} retries. Human review required.`,
    );
  }

  // 8. Documentar (WORKFLOW.md steps 8-9)
  await registrarEnAI_WORKFLOW(
    tipo,
    skillsRequeridas,
    solicitudUsuario,
    resultado,
  );
  if (esHallazgoArquitectonico(resultado)) {
    await actualizarDEBT_REPORT(resultado);
  }

  // 9. Commits (conventional-commits skill — siempre ULTIMO)
  await crearCommits(resultado.cambios);

  // 10. Purgar contexto del SA, conservar solo Action Summary
  return resultado.actionSummary;
}
```

### 1.4 — Rollback strategy

> **Ref:** Si el SA produce errores, esta estrategia protege el codebase.

| Escenario             | Accion                                                      | Max reintentos      |
| --------------------- | ----------------------------------------------------------- | ------------------- |
| Scope violation       | `git checkout -- .` + escalar a humano                      | 0 (fallo inmediato) |
| Tests fallidos        | `git checkout -- .` + reintentar con contexto de error      | 2                   |
| Linter con errores    | `git checkout -- .` + reintentar con contexto de error      | 2                   |
| SA no puede completar | Registrar en AI_WORKFLOW.md + escalar a humano              | 0                   |
| Humano rechaza plan   | Re-planificar con restricciones nuevas (WORKFLOW.md paso 5) | 3                   |

### 1.5 — Context budget

> **Ref:** Previene Context Overflow en sub-agentes.

| Recurso                   | Limite       | Si se excede                                  |
| ------------------------- | ------------ | --------------------------------------------- |
| Archivos fuente en prompt | 5 max por SA | Dividir tarea en sub-tareas                   |
| Skills cargadas           | 3 max por SA | Priorizar por dependency graph                |
| Lineas de contexto total  | 500 max      | Resumir archivos grandes, usar grep selectivo |
| Reintentos por tarea      | 2 max        | Escalar a revision humana                     |

### 1.6 — Documentation protocol

> **Ref:** Ver `WORKFLOW.md` seccion "1. Flujo de Trabajo" (pasos 8-9: REGISTRAR > ACTUALIZAR)

**Post-ejecucion obligatoria:**

1. **AI_WORKFLOW.md:** Registrar interacciones humano-maquina
   - **Paso:** WORKFLOW.md paso 8 (REGISTRAR)
   - **Debe incluir:** User request > Tipo de tarea > Skills cargadas > SA output > Commits > Human approval

2. **DEBT_REPORT.md:** Si se corrige hallazgo/deuda
   - **Paso:** WORKFLOW.md paso 9 (ACTUALIZAR)
   - **Debe incluir:** ID hallazgo > Severidad > Solucion > Archivos cambiados > Tests validation

3. **Checklist post-ejecucion:**
   - **Ref:** Ver `RULES.md` seccion "2. Reglas de Operacion (Anti-patrones)"
   - Commits con Conventional Commits
   - Documentacion actualizada (AI_WORKFLOW.md + DEBT_REPORT.md)
   - Tests passing
   - Linter ejecutado sin errores (100% tipado, sin usar `any`)
   - Git status limpio
   - Scope enforcement validado (ningun archivo fuera de scope)

### 1.7 — Rejection handling

> **Ref:** Ver `WORKFLOW.md` paso 5 (APROBAR)

Si el humano rechaza el plan:

1. Registrar razon de rechazo en `AI_WORKFLOW.md`
2. Solicitar clarificacion especifica al humano
3. Re-planificar con nuevas restricciones (volver a paso 4: PLANIFICAR)
4. Max rechazos: 3 — despues cambiar de enfoque completamente o escalar

### 1.8 — Examples and templates

> **Templates de delegacion por tipo de tarea:**
>
> - Frontend: Ver `skills/frontend-ui/assets/delegation-template.md`
> - Backend: Ver `skills/backend-api/assets/delegation-template.md`
> - Security: Ver `skills/security-audit/assets/delegation-template.md`
> - Testing: Ver `skills/testing-qa/assets/delegation-template.md`
>
> **Action Summary template:** Ver `skills/action-summary-template.md`
>
> **Ejemplos ejecutados:** Ver `AI_WORKFLOW.md` secciones 9.1-9.12

**STATUS:** COPILOT ADAPTER ACTIVE. LOAD CONTEXT MODULES TO PROCEED.
