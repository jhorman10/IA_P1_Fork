# Blueprint: sistema de orquestacion multi-agente

Guia universal para construir un sistema Orquestador + Sub-agentes (skills) en cualquier proyecto de software, independiente de lenguaje o framework.

## Indice

1. Vision general y principios
2. Requisitos previos
3. Estructura de carpetas
4. Modulos de contexto
5. Archivo orquestador
6. Creacion de skills (sub-agentes)
7. Technology Discovery Protocol
8. Guardrails dinamicos y quality gates
9. Rollback y manejo de fallos
10. Script de sincronizacion de skills
11. Documentacion y trazabilidad
12. Politica de seleccion de modelos
13. Plantillas reutilizables
14. Checklist de verificacion final

## 1. Vision general y principios

El sistema consta de **un agente orquestador (AO)** que delega tareas a **sub-agentes especializados (SA)** con contexto aislado. Cada SA recibe solo la informacion necesaria para su tarea, ejecuta con guardrails y reporta un resumen.

**Principios aplicados:**

- **SRP (Single Responsibility):** El orquestador solo coordina; las reglas, contexto y workflow viven en archivos externos.
- **OCP (Open/Closed):** Se agregan nuevas skills sin modificar el orquestador.
- **DIP (Dependency Inversion):** El orquestador depende de abstracciones (modulos de contexto, protocolo de descubrimiento), no de tecnologias concretas.
- **Fail-fast:** Si falta un modulo de contexto o una skill, se detiene antes de producir resultados incorrectos.
- **Context isolation:** Cada SA opera con contexto reducido para prevenir "Context Overflow" y "Lost in the Middle".

## 2. Requisitos previos

Antes de implementar el sistema, verificar:

- El proyecto tiene un repositorio Git inicializado.
- El entorno del agente (IDE, CLI o plataforma) soporta tool-use real (lectura/escritura de archivos, git, linter, test runner).
- Se define un idioma de salida para respuestas, documentacion y commits.
- Se conoce (o se puede descubrir) el stack tecnologico del proyecto.

## 3. Estructura de carpetas

Crear esta estructura en la raiz del repositorio:

```
<proyecto>/
  .github/
    copilot-instructions.md    <- Orquestador (GitHub Copilot)
  GEMINI.md                    <- Orquestador (Gemini / otros agentes)
  docs/
    agent-context/
      PROJECT_CONTEXT.md       <- Arquitectura, stack, estructura
      RULES.md                 <- Reglas, anti-patrones, convenciones
      WORKFLOW.md              <- Flujo de trabajo de N pasos
      SKILL_REGISTRY.md        <- Catalogo de skills (auto-generado)
    MD_STYLE_GUIDE.md          <- Estilo para documentacion Markdown
  skills/
    action-summary-template.md <- Plantilla de reporte del SA al AO
    <nombre-skill>/
      skill.md                 <- Definicion del sub-agente
      assets/                  <- Templates de codigo, documentacion
  scripts/
    sync.sh                    <- Sincronizador de skills
  AI_WORKFLOW.md               <- Registro de interacciones humano-maquina
  DEBT_REPORT.md               <- Estado de hallazgos y deuda tecnica
```

**Nota:** `copilot-instructions.md` y `GEMINI.md` son versiones gemelas del mismo orquestador, adaptadas a cada plataforma.

## 4. Modulos de contexto

Crear cuatro archivos en `docs/agent-context/`. Mantenerlos concisos (menos de 100 lineas cada uno).

### 4.1 PROJECT_CONTEXT.md

Describe el proyecto sin detalles de implementacion:

```markdown
# Context: Project and architecture

## 1. Project overview
[Descripcion breve del proyecto: que hace, para quien, flujo principal]

## 2. Architecture
- Pattern: [Event-Driven / Monolith / Microservices / Serverless / ...]
- Flow: [Diagrama textual del flujo principal]

## 3. Key folder structure
[Arbol de carpetas relevante]

## 4. Tech stack
| Layer      | Technology | Version | Notes           |
|------------|-----------|---------|-----------------|
| Backend    | [...]     | [...]   | [...]           |
| Frontend   | [...]     | [...]   | [...]           |
| Database   | [...]     | [...]   | [...]           |
| Testing    | [...]     | [...]   | [...]           |
| Infra      | [...]     | [...]   | [...]           |
```

### 4.2 RULES.md

Define convenciones, anti-patrones y directrices:

```markdown
# Context: Rules and directives

## 1. Cultural conventions
- Rol del agente (Senior Engineer / Lead)
- El humano es el arquitecto/revisor principal
- Cambios criticos incluyen `// HUMAN CHECK` con justificacion
- Cumplimiento estricto de SOLID, DRY, KISS

## 2. Operation rules (anti-patterns)
- Anti-pattern: Ejecutar cambios sin Plan de Accion aprobado
- Anti-pattern: Modificar archivos sin consultar la skill correspondiente
- Anti-pattern: Omitir registro en AI_WORKFLOW.md
- Anti-pattern: Omitir actualizacion de DEBT_REPORT.md
- [Agregar anti-patrones especificos del proyecto]

## 3. Naming conventions
[Idioma de nomenclatura, estilo de nombres, etc.]

## 4. Context hygiene
- Al concluir una tarea, purgar detalles de implementacion
- Nunca acumular contexto de multiples tareas en una sola sesion
```

### 4.3 WORKFLOW.md

Define el flujo de trabajo paso a paso:

```markdown
# Context: Workflow and traceability

## 1. Workflow (the algorithm)
1.  READ      -> DEBT_REPORT.md (estado actual)
2.  CHOOSE    -> Siguiente item pendiente
3.  MATCH     -> Identificar skill por trigger (SKILL_REGISTRY.md)
4.  PLAN      -> SA presenta Plan de Accion al humano
5.  APPROVE   -> Humano valida, corrige o rechaza
6.  EXECUTE   -> SA implementa los cambios aprobados
7.  RECEIVE   -> Resumen de accion del SA
8.  REGISTER  -> Actualizar AI_WORKFLOW.md
9.  UPDATE    -> Marcar item en DEBT_REPORT.md
10. COMMIT    -> Conventional Commits
11. PURGE     -> Descartar razonamiento intermedio, conservar resumen

## 2. Traceability
- Toda interaccion se registra en AI_WORKFLOW.md
- Todo commit se registra con hash, fecha, tipo, descripcion, actor

## 3. Mandatory delegation
- Cada tarea se delega a un Sub-Agente con contexto aislado
- Prohibido realizar ediciones masivas directamente
```

### 4.4 SKILL_REGISTRY.md

Catalogo auto-generado por `scripts/sync.sh`:

```markdown
# Context: Skill registry

> Auto-invocation: cuando el trigger de una skill coincide con la solicitud, cargar el skill.md.

<!-- BEGIN SKILL REFERENCES (auto-generated by scripts/sync.sh) -->

| Skill | Path | Trigger | Scope |
|-------|------|---------|-------|
| [auto-generado] | [auto-generado] | [auto-generado] | [auto-generado] |

<!-- END SKILL REFERENCES -->
```

## 5. Archivo orquestador

El orquestador es el "cerebro" del sistema. Se coloca en `.github/copilot-instructions.md` (Copilot) o en la raiz como `GEMINI.md` (otros agentes).

### 5.1 Protocolo PRE-RESPONSE (obligatorio en cada prompt)

```markdown
## PRE-RESPONSE PROTOCOL (mandatory on every prompt)

**Step A -- Verify working directory:**
The active working directory MUST be the repository root
(use `${workspaceRoot}` if available).

**Step A.1 -- Tooling availability:**
Verify tool-use is available (file read/write, git, linter, test runner).
If unavailable, abort with: `TOOLING ERROR: no tool-use available.`

**Step B -- Execute Bootstrap:**
Read and validate all context modules. Do not proceed if any fails to load.

**Step C -- Enforce workflow before execution:**
Never execute code changes without first presenting an Action Plan
and receiving explicit approval.

**Step D -- Output language enforcement:**
[Definir idioma de salida]

**Step E -- Context budget enforcement:**
Prefer selective loading of modules and skills to avoid overflow.

**Fallback:**
If the model skips this protocol, re-send prepending:
`BOOTSTRAP OBLIGATORIO: ejecuta el protocolo PRE-RESPONSE completo.`
```

### 5.2 Bootstrap (carga de contexto)

```javascript
// Pseudocode: Dependency Injection with fail-fast
const REQUIRED_MODULES = [
  "docs/agent-context/PROJECT_CONTEXT.md",
  "docs/agent-context/RULES.md",
  "docs/agent-context/WORKFLOW.md",
  "docs/agent-context/SKILL_REGISTRY.md",
];

for (const mod of REQUIRED_MODULES) {
  if (!(await file_exists(mod))) {
    STOP(`BOOTSTRAP FAILED: ${mod} not found. Do NOT proceed.`);
  }
}

const PROJECT_CONTEXT = await read_file("docs/agent-context/PROJECT_CONTEXT.md");
const RULES = await read_file("docs/agent-context/RULES.md");
const WORKFLOW = await read_file("docs/agent-context/WORKFLOW.md");
const SKILL_REGISTRY = await read_file("docs/agent-context/SKILL_REGISTRY.md");
```

### 5.3 Algoritmo de delegacion

```javascript
async function delegateTask(userRequest, retryCount = 0) {
  const MAX_RETRIES = 2;

  // 1. Identify task type from SKILL_REGISTRY
  const taskType = identifyType(userRequest);
  const requiredSkills = SKILL_REGISTRY[taskType].requiredSkills;

  // 2. Validate skills exist on disk
  for (const skillName of requiredSkills) {
    if (!(await file_exists(`skills/${skillName}/skill.md`))) {
      STOP(`Skill "${skillName}" not found. Use skill-creator first.`);
    }
  }

  // 3. Load skills in dependency order
  const orderedSkills = resolveDependencyOrder(requiredSkills);
  const skills = {};
  for (const skillName of orderedSkills) {
    skills[skillName] = await read_file(`skills/${skillName}/skill.md`);
  }

  // 4. Calculate allowed scope
  const allowedScope = mergeScopes(orderedSkills.map((s) => skills[s].scope));

  // 4.5. Technology Discovery -- detect stack before writing code
  const techProfile = await detectTechStack(allowedScope);

  // 5. Delegate to SA with context + guardrails + tech profile
  const result = await runSubagent({
    projectContext: PROJECT_CONTEXT,
    rules: RULES,
    skills: orderedSkills.map((name) => skills[name]),
    task: userRequest,
    techProfile: techProfile,
    allowedScope: allowedScope,
  });

  // 6. Scope enforcement
  if (result.filesChanged.some((f) => !isInScope(f, allowedScope))) {
    await rollback();
    ESCALATE("SA modified files outside allowed scope.");
  }

  // 7. Quality gates
  const testsPass = await runTests(result.filesChanged);
  const lintClean = await runLinter(result.filesChanged);

  if (!testsPass || !lintClean) {
    if (retryCount < MAX_RETRIES) {
      await rollback();
      return delegateTask(userRequest, retryCount + 1);
    }
    await rollback();
    ESCALATE(`Quality gates failed after ${MAX_RETRIES} retries.`);
  }

  // 8. Document and commit
  await registerInAI_WORKFLOW(taskType, requiredSkills, userRequest, result);
  await createCommits(result.changes);

  return result.actionSummary;
}
```

### 5.4 Matriz de seleccion de skills

Definir una tabla que mapee tipos de tarea a skills requeridas (minimo 2-3):

```markdown
| Task type              | Required skills (minimum 2-3)              |
|------------------------|--------------------------------------------|
| Frontend (UI/UX)       | `frontend-ui`, `refactor-arch`, `testing`  |
| Backend (API/Logic)    | `backend-api`, `refactor-arch`, `testing`  |
| Architectural refactor | `refactor-arch`, `testing`                 |
| Security/Audit         | `security-audit`, `refactor-arch`, `testing`|
| Testing/QA             | `testing`, `refactor-arch`                 |
| Infrastructure         | `infra`, `backend-api`, `testing`          |
| Commits/Docs           | `conventional-commits`                     |
```

### 5.5 Grafo de dependencia de skills

```
domain-skills ──┐
(backend, frontend, infra, refactor) ──┤── ejecutar primero
                                       │
security ──── validacion pre-deploy    │
testing ───── quality gate (valida TODO)
conventional-commits ── siempre ULTIMO
skill-creator ── meta: solo cuando no existe skill
```

### 5.6 Presupuesto de contexto

| Recurso                   | Limite       | Si se excede                              |
|---------------------------|--------------|-------------------------------------------|
| Archivos fuente en prompt | 5 max por SA | Dividir tarea en sub-tareas               |
| Skills cargadas           | 3 max por SA | Priorizar por grafo de dependencia        |
| Lineas totales de contexto| 500 max      | Resumir archivos, usar grep selectivo     |
| Reintentos por tarea      | 2 max        | Escalar a revision humana                 |

## 6. Creacion de skills (sub-agentes)

Cada skill se define en `skills/<nombre>/skill.md` con esta estructura:

### 6.1 Plantilla de skill

```markdown
---
name: "<nombre-de-la-skill>"
description: "<proposito en una linea>"
trigger: "<palabras clave que activan esta skill>"
scope: "<directorios/archivos permitidos, separados por coma>"
author: "<equipo o autor>"
version: "1.0.0"
license: "MIT"
autoinvoke: true
---

# Skill: <nombre>

## Context
[Descripcion del contexto especifico para esta skill.
Que parte del sistema atiende, que tecnologias usa.]

## Rules
1. [Regla especifica 1]
2. [Regla especifica 2]
3. Cada decision critica incluye `// HUMAN CHECK` con justificacion.
[Agregar reglas propias del dominio de la skill]

## Tools permitted
- Read/Write: archivos dentro de [scope]
- Terminal: [comandos permitidos, e.g. `npm run test`, `pytest`]
- Explore: grep/glob para localizar componentes afectados

## Workflow
1. Leer el item de feedback e identificar archivos afectados.
2. Usar grep para localizar componentes relacionados.
3. Consultar plantillas en `assets/` para el patron esperado.
4. Implementar el cambio siguiendo las reglas.
5. Agregar `// HUMAN CHECK` donde aplique.
6. Retornar un Action Summary conciso.

## Assets
- `assets/templates/[patron].ext` -- [descripcion]
- `assets/docs/[guia].md` -- [descripcion]
```

### 6.2 Carpeta de assets

Cada skill puede tener una carpeta `assets/` con:
- **Templates de codigo:** patrones de referencia que el SA debe seguir (e.g., `service-pattern.ts`, `component-pattern.tsx`).
- **Documentacion especializada:** guias de dominio (e.g., `ack-nack-strategy.md`, `css-conventions.md`).

### 6.3 Skills recomendadas para iniciar

Dependiendo del tipo de proyecto, crear al menos estas skills:

| Skill               | Proposito                                    |
|----------------------|----------------------------------------------|
| `backend-api`        | Logica de negocio, servicios, controladores |
| `frontend-ui`        | Componentes, paginas, estilos               |
| `testing-qa`         | Tests unitarios, mocking, cobertura         |
| `refactor-arch`      | Refactorizacion, SOLID, patrones de diseño  |
| `security-audit`     | Seguridad, vulnerabilidades, OWASP          |
| `infra` / `docker`   | Docker, CI/CD, variables de entorno         |
| `conventional-commits` | Historial semantico de Git                |
| `skill-creator`      | Meta-skill para crear nuevas skills         |

## 7. Technology Discovery Protocol

El SA no debe asumir ninguna tecnologia. Antes de escribir codigo, ejecuta estos pasos:

### 7.1 Pasos de descubrimiento

1. **Inspeccionar archivos de configuracion** dentro del scope:
   - `package.json`, `tsconfig.json`, `requirements.txt`, `pom.xml`,
     `build.gradle`, `pyproject.toml`, `Cargo.toml`, o equivalente.

2. **Identificar el perfil tecnologico:**
   - Lenguaje: determinar por extensiones (`.ts`, `.js`, `.py`, `.java`, `.rs`, etc.)
   - Framework: determinar por imports, decoradores, config
   - Gestor de paquetes: `npm`, `yarn`, `pnpm`, `pip`, `maven`, etc.
   - Test runner: `jest`, `vitest`, `pytest`, `junit`, etc.
   - Linter/formatter: `eslint`, `prettier`, `pylint`, `checkstyle`, etc.

3. **Adaptar la salida** al stack detectado:
   - Usar el estilo de imports, decoradores y patrones nativos del framework.
   - Seguir las convenciones de tipado del lenguaje.
   - Usar el test runner detectado para archivos de prueba.
   - Usar el linter detectado para validacion.

4. **Reportar stack detectado** al inicio del Action Summary:
   `Detected stack: [language] + [framework] | Tests: [runner] | Linter: [tool]`

### 7.2 Pseudocodigo

```javascript
async function detectTechStack(allowedScope) {
  const configFiles = await findConfigFiles(allowedScope);
  // configFiles: package.json, tsconfig.json, requirements.txt, pom.xml, etc.

  return {
    language:       inferLanguage(configFiles),       // "TypeScript" | "Python" | ...
    framework:      inferFramework(configFiles),      // "NestJS" | "FastAPI" | ...
    packageManager: inferPackageManager(configFiles), // "npm" | "pip" | ...
    testRunner:     inferTestRunner(configFiles),     // "jest" | "pytest" | ...
    linter:         inferLinter(configFiles),         // "eslint" | "pylint" | ...
    configFiles:    configFiles.map(f => f.path),
    typingEnforced: inferTypingEnforced(configFiles), // true | false
  };
}
```

## 8. Guardrails dinamicos y quality gates

Los guardrails se adaptan al stack detectado:

```markdown
# Strict Code Guardrails (adapted to detected stack):
- Run the detected linter and ensure there are no errors.
- If the language supports static typing: all code must be 100% typed.
- If TypeScript: FORBIDDEN use of `any`.
- If Python: use type hints on all function signatures.
- If Java/Kotlin: no raw types.
- Adapt guardrails to the detected language.
```

**Quality gates obligatorias antes de cerrar tarea:**
1. Tests pasan (comando del test runner detectado).
2. Linter sin errores (comando del linter detectado).
3. Scope enforcement: ningun archivo modificado fuera del scope permitido.

## 9. Rollback y manejo de fallos

| Escenario              | Accion                                        | Reintentos |
|------------------------|-----------------------------------------------|------------|
| Violacion de scope     | `git checkout -- .` + escalar a humano        | 0          |
| Tests fallidos         | `git checkout -- .` + reintentar con contexto | 2          |
| Linter con errores     | `git checkout -- .` + reintentar con contexto | 2          |
| SA no puede completar  | Registrar en AI_WORKFLOW.md + escalar          | 0          |
| Humano rechaza plan    | Re-planificar con nuevas restricciones        | 3          |

## 10. Script de sincronizacion de skills

Crear `scripts/sync.sh` que:

1. Parsee los YAML frontmatter de todos los `skills/*/skill.md`.
2. Extraiga `name`, `trigger`, `scope` de cada skill.
3. Regenere la tabla de Skill References en `docs/agent-context/SKILL_REGISTRY.md`.
4. Use comentarios sentinela para reemplazo idempotente.

### 10.1 Plantilla del script

```bash
#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_FILE="$REPO_ROOT/docs/agent-context/SKILL_REGISTRY.md"
SKILLS_DIR="$REPO_ROOT/skills"

# Verify files exist
[ -f "$AGENT_FILE" ] || { echo "Error: SKILL_REGISTRY.md not found"; exit 1; }
[ -d "$SKILLS_DIR" ] || { echo "Error: skills/ not found"; exit 1; }

# Build table from YAML frontmatter
TABLE_ROWS=""
for skill_dir in "$SKILLS_DIR"/*/; do
    skill_file="${skill_dir}skill.md"
    [ -f "$skill_file" ] || continue

    name=$(awk '/^---$/{n++; next} n==1 && /^name:/{sub(/^name: *"?/,""); sub(/"? *$/,""); print; exit}' "$skill_file")
    trigger=$(awk '/^---$/{n++; next} n==1 && /^trigger:/{sub(/^trigger: *"?/,""); sub(/"? *$/,""); print; exit}' "$skill_file")
    scope=$(awk '/^---$/{n++; next} n==1 && /^scope:/{sub(/^scope: *"?/,""); sub(/"? *$/,""); print; exit}' "$skill_file")
    rel_path="${skill_file#$REPO_ROOT/}"

    [ -n "$name" ] && TABLE_ROWS="${TABLE_ROWS}| \`${name}\` | \`${rel_path}\` | ${trigger} | \`${scope}\` |\n"
done

# Replace between sentinel comments
REPLACEMENT="| Skill | Path | Trigger | Scope |\n|-------|------|---------|-------|\n${TABLE_ROWS}"
sed -i "/<!-- BEGIN SKILL REFERENCES/,/<!-- END SKILL REFERENCES/c\\
<!-- BEGIN SKILL REFERENCES (auto-generated by scripts/sync.sh) -->\n\n${REPLACEMENT}\n<!-- END SKILL REFERENCES -->" "$AGENT_FILE"

echo "Sync complete."
```

**Ejecutar despues de crear o modificar skills:** `bash scripts/sync.sh`

## 11. Documentacion y trazabilidad

### 11.1 AI_WORKFLOW.md

Registra cada interaccion humano-maquina:
- Solicitud del usuario
- Tipo de tarea
- Skills cargadas
- Modelo AO y SA utilizado
- Resumen de accion del SA
- Commits generados
- Aprobacion humana

### 11.2 DEBT_REPORT.md

Tabla consolidada de hallazgos y deuda tecnica:

```markdown
| ID   | Severity | Description          | Status   | Resolved in |
|------|----------|----------------------|----------|-------------|
| A-01 | High     | [descripcion]        | Pending  |             |
| A-02 | Medium   | [descripcion]        | Done     | commit abc  |
```

### 11.3 Action Summary (reporte del SA al AO)

Cada SA reporta usando la plantilla `skills/action-summary-template.md`:

```markdown
## Action Summary
- **Item:** [ID del DEBT_REPORT]
- **Skill:** [skill usada]
- **AO Model:** [modelo del orquestador]
- **SA Model:** [modelo del sub-agente]
- **Files Changed:**
  - `path/to/file` -- [descripcion breve]
- **What Was Done:** [1-2 oraciones]
- **What to Validate:**
  - [ ] [comando de test o verificacion manual]
- **HUMAN CHECK Added:** [Si/No -- ubicaciones]
- **Breaking Changes:** [Si/No -- impacto]
```

## 12. Politica de seleccion de modelos

### 12.1 Umbrales minimos para SA

| Dimension       | Minimo          | Justificacion                              |
|-----------------|-----------------|--------------------------------------------|
| Ventana output  | >=32K tokens    | SA genera codigo + tests + resumen         |
| Ventana input   | >=100K tokens   | 4 modulos + 3 skills + tarea + codigo fuente|
| Razonamiento    | Tier medio+     | SOLID, DDD, tipado estricto                |
| Costo           | <=1x rutinario  | Delegaciones frecuentes a 3x no son sostenibles|

### 12.2 Regla rapida de seleccion

```
SI tarea == arquitectura compleja (refactor, DDD, security)
   -> Tier 1 (maximo razonamiento y output)
SI tarea == codigo rutinario (tests, bugfix, feature simple)
   -> Tier 2 (buen equilibrio calidad/costo)
SI tarea == mecanica simple (lint, rename, commit)
   -> Tier 3 aceptable (rapido, economico)
SI NO
   -> Tier 2 por defecto
```

### 12.3 Anti-patrones de seleccion

- Usar modelos con output menor a 32K para generacion multi-archivo.
- Usar Tier 3 para tareas que requieren razonamiento arquitectonico.
- Usar el modelo mas costoso para tareas rutinarias.
- Usar modelos Preview en produccion sin monitorear resultados.

## 13. Plantillas reutilizables

### 13.1 Plantilla de prompt reutilizable

```
BOOTSTRAP OBLIGATORIO: ejecuta el protocolo PRE-RESPONSE completo antes de responder.
- CWD: [ruta del proyecto]
- Leer y validar: docs/agent-context/PROJECT_CONTEXT.md, RULES.md, WORKFLOW.md, SKILL_REGISTRY.md
- Idioma de salida: [idioma]
- NO ejecutar cambios sin Plan de Accion aprobado por el humano

SOLICITUD:
[descripcion de la tarea]
```

### 13.2 Plantilla de orquestador resumida

Copiar los archivos `.github/copilot-instructions.md` o `GEMINI.md` del proyecto de referencia y adaptar:
1. Reemplazar nombre del proyecto.
2. Actualizar modulos de contexto segun el nuevo proyecto.
3. Ajustar la matriz de skills segun las necesidades.
4. Ejecutar `bash scripts/sync.sh` tras crear las skills.

## 14. Checklist de verificacion final

Antes de considerar el sistema operativo, verificar:

- [ ] Los 4 modulos de contexto existen y tienen contenido valido
- [ ] El archivo orquestador tiene el protocolo PRE-RESPONSE completo
- [ ] Al menos 3 skills estan creadas con YAML frontmatter correcto
- [ ] `scripts/sync.sh` ejecuta sin errores y genera SKILL_REGISTRY.md
- [ ] El agente carga los modulos al recibir un prompt y respeta el idioma configurado
- [ ] El agente presenta Plan de Accion antes de ejecutar cambios
- [ ] El agente respeta los limites de scope definidos en las skills
- [ ] El linter y los tests ejecutan correctamente dentro del scope
- [ ] AI_WORKFLOW.md existe para registrar interacciones
- [ ] DEBT_REPORT.md existe para rastrear hallazgos
- [ ] El Technology Discovery Protocol detecta el stack correctamente al intervenir codigo
