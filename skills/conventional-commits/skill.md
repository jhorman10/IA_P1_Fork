---
name: conventional-commits (Senior Level)
description: Gestión de historial semántico, alineación con CI/CD y automatización de versionado.
trigger: When creating commits, pushing code, formatting commit messages, or when feedback mentions git history, commit hygiene, or semantic versioning.
scope: .git/, scripts/
author: "IA_P1_Fork Team"
version: "2.0.0 (Senior Grade)"
license: "MIT"
autoinvoke: true
---

# Skill: Conventional Commits (Senior Grade)

## Context

Todos los commits de este proyecto DEBEN seguir la especificación [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). Esto garantiza un historial legible, trazable y compatible con semantic versioning.

## Rules

### Formato obligatorio

```
<tipo>(<scope>): <descripción>

[cuerpo opcional]

[footer opcional]
```

### Tipos permitidos

| Tipo       | Cuándo usar                                         | Ejemplo                                                           |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| `feat`     | Nueva funcionalidad visible al usuario              | `feat(consumer): implement randomized attention duration`         |
| `fix`      | Corrección de bugs                                  | `fix(producer): resolve validation pipe not catching DTO errors`  |
| `refactor` | Cambio de código sin alterar comportamiento externo | `refactor(orchestrator): consolidate to single GEMINI.md`         |
| `docs`     | Cambios solo en documentación                       | `docs(traceability): rewrite AI_WORKFLOW.md with interaction log` |
| `test`     | Agregar o corregir tests                            | `test(producer): add 36 unit tests for appointments service`      |
| `chore`    | Tareas de mantenimiento (deps, configs, cleanup)    | `chore(cleanup): remove obsolete DEBT_REPORT.MD`                  |
| `build`    | Cambios en sistema de build o dependencias          | `build(docker): update Node.js image from alpine to slim`         |
| `ci`       | Cambios en CI/CD pipelines                          | `ci(github): add lint workflow on pull requests`                  |
| `perf`     | Mejoras de rendimiento                              | `perf(scheduler): precalculate office array in constructor`       |
| `style`    | Cambios de formato (espacios, semicolons, etc.)     | `style(frontend): fix indentation in page.module.css`             |
| `revert`   | Revierte un commit anterior                         | `revert: feat(consumer): implement randomized attention`          |

### Scopes del proyecto

| Scope          | Aplica a                                                                |
| -------------- | ----------------------------------------------------------------------- |
| `producer`     | `backend/producer/src/`                                                 |
| `consumer`     | `backend/consumer/src/`                                                 |
| `frontend`     | `frontend/src/`                                                         |
| `docker`       | `docker-compose.yml`, `Dockerfile`s                                     |
| `orchestrator` | `.github/copilot-instructions.md`, `GEMINI.md`, sistema de orquestación |
| `skills`       | `skills/*/`                                                             |
| `scripts`      | `scripts/`                                                              |
| `docs`         | `AI_WORKFLOW.md`, `DEBT_REPORT.md`, `README.md`, etc.                   |
| `arch`         | Cambios de arquitectura hexagonal, puertos y adaptadores                |
| `deps`         | package.json, dependencias                                              |

### Reglas de formato

1. **Descripción en minúsculas** — No iniciar con mayúscula tras el `:`.
   - `feat(producer): add validation pipe`
   - `feat(producer): Add validation pipe`

2. **Sin punto final** — No terminar la descripción con `.`
   - `fix(consumer): resolve ack/nack race condition`
   - `fix(consumer): resolve ack/nack race condition.`

3. **Imperativo presente** — Usar verbo en imperativo.
   - `add`, `fix`, `remove`, `update`, `implement`, `refactor`
   - `added`, `fixed`, `removing`, `updates`

4. **Máximo 72 caracteres** en la primera línea.

5. **Breaking changes** — Usar `!` después del scope o `BREAKING CHANGE:` en el footer.

   ```
   feat(producer)!: rename cedula to idCard across all DTOs

   BREAKING CHANGE: All API consumers must update field names
   from 'cedula' to 'idCard' and 'nombre' to 'fullName'.
   ```

6. **Múltiples cambios** — Si un commit abarca múltiples archivos, usar cuerpo con `-` para listar:

   ```
   refactor(arch): extract domain entities from mongoose schemas

   - Create domain/entities/appointment.entity.ts (pure class)
   - Create domain/ports/outbound/appointment.repository.ts (interface)
   - Move validation logic from schema to entity factory
   - Add // HUMAN CHECK for layer separation decisions
   ```

7. **Actor attribution** — En el cuerpo, indicar actor si es relevante:

   ```
   fix(consumer): resolve race condition in office assignment

   Co-authored-by: IA Agent
   Reviewed-by: Human
   ```

### Commits NO permitidos

- `update files` — Sin tipo ni scope
- `WIP` — Commits temporales
- `fix stuff` — Descripción vaga
- `feat: implement everything` — Demasiado amplio, dividir en commits atómicos
- Commits que mezclen feat + fix + refactor — Un tipo por commit

## Workflow

### Antes de commitear

1. Ejecutar `git diff --staged` para revisar cambios
2. Clasificar el tipo de cambio (feat, fix, refactor, etc.)
3. Identificar el scope correcto
4. Redactar mensaje siguiendo el formato
5. Si hay breaking changes, documentar con `!` o `BREAKING CHANGE:`

### Validación pre-push

```bash
# Verificar que los últimos N commits siguen el formato
git log --oneline -5

# Patrón esperado:
# <hash> <tipo>(<scope>): <descripción en minúsculas sin punto>
```

### Commits atómicos

Cada commit debe representar **una unidad lógica de cambio**:

- Un commit por feature/fix/refactor
- Un commit gigante con múltiples tipos de cambios mezclados

Si un cambio toca múltiples archivos pero es la MISMA unidad lógica, es un solo commit.
Si son cambios INDEPENDIENTES, separar en commits individuales.

## Tools Permitted

- **Read:** `git log`, `git diff`, `git status`
- **Write:** `git add`, `git commit`
- **Validate:** Revisar formato antes de ejecutar

## Assets

- Esta skill no requiere assets adicionales — las reglas están autocontenidas.
