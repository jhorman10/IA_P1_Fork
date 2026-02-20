# Agente Orquestador (Kernel) — IA_P1_Fork

> **Principio de Responsabilidad Única (SRP):** Este archivo orquesta la delegación a Sub-Agentes (SA).  
> **Toda regla, contexto y workflow están en archivos externos** — este archivo solo coordina.

---

## 0. BOOTSTRAP: Mandatory Context Loading

> **CRÍTICO:** Antes de ejecutar cualquier tarea, **DEBES** cargar los 4 módulos de contexto:

```javascript
// Paso 0: Inyección de Dependencias (DIP)
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
- **Catálogo de Skills:** `SKILL_REGISTRY.md` (8 skills con triggers, paths, scopes)

---

## 1. Skill Selection Protocol

### 1.1 — Matriz de Skills por Tipo de Tarea

**Referencia completa:** `SKILL_REGISTRY.md` (8 skills disponibles)

| Tipo de Tarea               | Skills Requeridas (mínimo 2-3)                     |
| --------------------------- | -------------------------------------------------- |
| **Frontend (UI/UX)**        | `frontend-ui`, `refactor-arch`, `testing-qa`       |
| **Backend (API/Logic)**     | `backend-api`, `refactor-arch`, `testing-qa`       |
| **Refactor Arquitectónico** | `refactor-arch`, `testing-qa`                      |
| **Microservicios**          | `backend-api`, `refactor-arch`, `testing-qa`       |
| **Security/Auditoría**      | `security-audit`, `refactor-arch`, `testing-qa`    |
| **Testing/QA**              | `testing-qa`, `refactor-arch`                      |
| **Docker/Infra**            | `docker-infra`, `backend-api`, `testing-qa`        |
| **Commits/Docs**            | `conventional-commits`, `skill-creator` (opcional) |
| **Creación de Skills**      | `skill-creator`, `refactor-arch`, `testing-qa`     |

### 1.2 — Delegation Algorithm

> **Ref:** Ver `WORKFLOW.md` sección "1. Flujo de Trabajo" (pasos 3-6: MATCH > PLANIFICAR > APROBAR > EJECUTAR)

```javascript
// Algoritmo de Delegación a Sub-Agentes (SA)
// NOTA: Asume que PROJECT_CONTEXT, RULES, WORKFLOW, SKILL_REGISTRY ya están cargados (Bootstrap sección 0)
async function delegarTarea(solicitudUsuario) {
  // 1. Identificar tipo de tarea (consultar SKILL_REGISTRY ya cargado)
  const tipo = identificarTipo(solicitudUsuario);
  const skillsRequeridas = SKILL_REGISTRY[tipo].requiredSkills; // 2-3 skills mínimo

  // 2. Cargar skills específicas (contextos ya disponibles del Bootstrap)
  const skills = {};
  for (const skillName of skillsRequeridas) {
    skills[skillName] = await read_file(`skills/${skillName}/skill.md`);
  }

  // 3. Delegar a SA con contexto completo
  const resultado = await runSubagent({
    description: `[Tipo: ${tipo}] ${extraerTituloCorto(solicitudUsuario)}`,
    prompt: `
# Contexto del Proyecto: ${PROJECT_CONTEXT}

# Reglas Arquitectónicas: ${RULES}

# Skills Cargadas:
${Object.entries(skills)
  .map(
    ([name, content], i) => `
## ${i + 1}. ${name}:
${content}
`,
  )
  .join("\n")}

# Tarea: ${solicitudUsuario}

# Reglas Estrictas de Código:
- Ejecutar el linter y asegurar que no hay errores.
- Todo el código debe estar 100% tipado.
- PROHIBIDO el uso de \`any\`.

# Entregables:
1. Código implementado (aplicando skills)
2. Tests (coverage >80%)
3. Documentación de cambios (// HUMAN CHECK donde aplique)
        `,
  });

  // 4. Documentar (WORKFLOW.md step 8)
  await registrarEnAI_WORKFLOW(
    tipo,
    skillsRequeridas,
    solicitudUsuario,
    resultado,
  );
  if (esHallazgoArquitectonico(resultado)) {
    await actualizarDEBT_REPORT(resultado);
  }

  // 5. Commits (conventional-commits skill)
  await crearCommits(resultado.cambios);

  return resultado;
}
```

### 1.3 — Documentation Protocol

> **Ref:** Ver `WORKFLOW.md` sección "1. Flujo de Trabajo" (pasos 8-9: REGISTRAR > ACTUALIZAR)

**Post-Ejecución Obligatoria:**

1. **AI_WORKFLOW.md:** Registrar interacciones humano-máquina
   - **Paso:** WORKFLOW.md paso 8 (REGISTRAR)
   - **Debe incluir:** User request > Tipo de tarea > Skills cargadas > SA output > Commits > Human approval

2. **DEBT_REPORT.md:** Si se corrige hallazgo/deuda
   - **Paso:** WORKFLOW.md paso 9 (ACTUALIZAR)
   - **Debe incluir:** ID hallazgo > Severidad > Solución > Archivos cambiados > Tests validation

3. **Checklist:**
   - **Ref:** Ver `RULES.md` sección "2. Reglas de Operación (Anti-patrones)"
   - Commits con Conventional Commits
   - Documentación actualizada (AI_WORKFLOW.md + DEBT_REPORT.md)
   - Tests passing
   - Linter ejecutado sin errores (100% tipado, sin usar `any`)
   - Git status limpio

### 1.4 — Examples & Templates

> **Templates de delegación por tipo de tarea:**
>
> - Frontend: Ver `skills/frontend-ui/assets/delegation-template.md`
> - Backend: Ver `skills/backend-api/assets/delegation-template.md`
> - Security: Ver `skills/security-audit/assets/delegation-template.md`
> - Testing: Ver `skills/testing-qa/assets/delegation-template.md`
>
> **Ejemplos ejecutados:** Ver `AI_WORKFLOW.md` secciones 9.1-9.12

---

**STATUS:** KERNEL ACTIVE. LOAD CONTEXT MODULES TO PROCEED.
