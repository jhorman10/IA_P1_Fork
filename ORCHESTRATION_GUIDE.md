# Guia de arquitectura del sistema de orquestacion

## Vision general

El sistema esta configurado con **1 Agente Orquestador** + **8 Sub-agentes (Skills)** delegados para tareas especificas. El objetivo es evitar el "Context Overflow" aislando cada tarea en un contexto reducido con instrucciones especializadas.

---

## 1. Agente Orquestador

Dos archivos gemelos actuan como orquestador, uno por plataforma de agente:

| Archivo                           | Plataforma             | Status tag               |
| --------------------------------- | ---------------------- | ------------------------ |
| `.github/copilot-instructions.md` | GitHub Copilot         | `COPILOT ADAPTER ACTIVE` |
| `GEMINI.md`                       | Gemini / otros agentes | `KERNEL ACTIVE`          |

Ambos comparten estructura identica (Bootstrap, Skill Selection Protocol, Delegation Algorithm, Rollback, Context Budget, Documentation Protocol, Rejection Handling).

### Bootstrap: carga obligatoria de contexto

Antes de ejecutar cualquier tarea, el orquestador **DEBE** cargar estos 4 modulos con validacion fail-fast:

| Modulo            | Ruta                                    | Contenido                                             |
| ----------------- | --------------------------------------- | ----------------------------------------------------- |
| `PROJECT_CONTEXT` | `docs/agent-context/PROJECT_CONTEXT.md` | Arquitectura, stack, estructura del proyecto          |
| `RULES`           | `docs/agent-context/RULES.md`           | Reglas, anti-patrones, nomenclatura, `// HUMAN CHECK` |
| `WORKFLOW`        | `docs/agent-context/WORKFLOW.md`        | Workflow de 11 pasos                                  |
| `SKILL_REGISTRY`  | `docs/agent-context/SKILL_REGISTRY.md`  | Catalogo de 8 skills con triggers, paths, scopes      |

**Archivo adicional obligatorio:** `docs/MD_STYLE_GUIDE.md` (sin emoji en headings/tablas, sentence case, vocabulario de estado estandarizado).

### Flujo de trabajo del orquestador (11 pasos)

> **Referencia completa:** `docs/agent-context/WORKFLOW.md`

```
 1. LEER        -> DEBT_REPORT.md (estado actual de todos los items)
 2. ELEGIR      -> Siguiente item pendiente (status: Pending)
 3. MATCH       -> Identificar skills por trigger (consultar SKILL_REGISTRY.md)
 4. PLANIFICAR  -> Determinar 2-3 skills minimas segun matriz de seleccion
 5. APROBAR     -> Presentar plan al usuario antes de ejecutar
 6. EJECUTAR    -> Crear sub-agente con contexto: {item, skills.md, archivos en scope}
 7. RECIBIR     -> Resumen de accion del sub-agente
 8. REGISTRAR   -> Documentar en AI_WORKFLOW.md (interaccion humano-maquina)
 9. ACTUALIZAR  -> Marcar item en DEBT_REPORT.md con estado correcto
10. COMMIT      -> Crear commits con Conventional Commits (skill: conventional-commits)
11. PURGAR      -> Descartar razonamiento intermedio del SA, conservar solo el resumen
```

### Directrices obligatorias

1. **AISLAMIENTO DE TAREAS:** Prohibido realizar ediciones masivas directamente. Se delega en Sub-agentes con contexto independiente.
2. **FUENTE DE VERDAD:** Antes de cualquier accion, consultar el archivo orquestador y los modulos de contexto.
3. **AUTOINVOCACION DE SKILLS:** Identificar triggers en la solicitud y cargar la skill correspondiente.
4. **HIGIENE DE CONTEXTO:** Exigir "Resumen de Accion" al Sub-agente e integrar solo ese resumen.
5. **NAVEGACION JERARQUICA:** Si falta informacion, navegar a archivos de subdirectorios.
6. **REGLAS EXTERNAS:** Consultar `docs/agent-context/RULES.md` para reglas de codigo y anti-patrones.
7. **TIPADO ESTRICTO:** Todo codigo debe estar 100% tipado. Prohibido el uso de `any`.
8. **LINTER OBLIGATORIO:** Ejecutar linter y asegurar 0 errores antes de reportar.
9. **ESTILO MARKDOWN:** Seguir `docs/MD_STYLE_GUIDE.md` en toda documentacion generada.

## 2. Sub-agentes (Skills)

Cada skill define un **sub-agente especializado** con contexto aislado. Todas comparten la misma estructura:

```yaml
# YAML Frontmatter (metadata)
name: "<nombre>"
description: "<proposito>"
trigger: "<palabras clave de activacion>"
scope: "<directorios/archivos permitidos>"
author: "IA_P1_Fork Team"
version: "X.0.0"
license: "MIT"
autoinvoke: true
```

Cada skill incluye secciones de: **Context**, **Rules**, **Tools Permitted**, **Workflow**, y **Assets**.

### 2.1 `backend-api` — NestJS Backend

- **Trigger:** services, controllers, DTOs, validation, RabbitMQ, ack/nack, business logic
- **Scope:** `backend/producer/src/`, `backend/consumer/src/`
- **Assets:** `service-pattern.ts`, `ack-nack-strategy.md`

### 2.2 `docker-infra` — Docker e infraestructura

- **Trigger:** Docker, healthchecks, credentials, env vars, ports, deployment
- **Scope:** `docker-compose.yml`, `.env`, `.env.example`, `Dockerfile`s
- **Assets:** `healthcheck-pattern.yml`, `production-hardening.md`

### 2.3 `frontend-ui` — Next.js e interfaz

- **Trigger:** UI components, WebSocket, CSS, pages, dashboard, frontend behavior
- **Scope:** `frontend/src/`
- **Assets:** `page-pattern.tsx`, `css-modules-conventions.md`

### 2.4 `testing-qa` — Tests y QA

- **Trigger:** tests, specs, unit testing, mocking, coverage, test failures, QA validation
- **Scope:** `backend/producer/test/`, `backend/consumer/test/`, `backend/*/src/**/*.spec.ts`
- **Assets:** `spec-pattern.ts`, `mocking-guide.md`

### 2.5 `refactor-arch` — Arquitectura hexagonal

- **Trigger:** architecture refactoring, hexagonal, SOLID, design patterns, ports and adapters, coupling
- **Scope:** `backend/producer/src/`, `backend/consumer/src/`, `frontend/src/`
- **Assets:** `hexagonal-structure.md`, `architecture-patterns-catalog.md`, `solid-checklist.md`

### 2.6 `security-audit` — Auditoria de seguridad

- **Trigger:** security, vulnerabilities, audit, authentication, OWASP, secrets, encryption
- **Scope:** `backend/*/src/`, `frontend/src/`, `docker-compose.yml`, `.env.example`
- **Assets:** `security-audit-report.md`, `security-check-list.md`

### 2.7 `conventional-commits` — Historial semantico

- **Trigger:** commits, pushing code, git history, commit hygiene, semantic versioning
- **Scope:** `.git/`, `scripts/`
- **Assets:** Reglas autocontenidas en la skill

### 2.8 `skill-creator` — Meta-skill

- **Trigger:** cuando una tarea requiere capacidades no cubiertas por las skills existentes
- **Scope:** `skills/`, `.agent/workflows/`
- **Post-creacion:** ejecutar `bash scripts/sync.sh`

### Matriz de seleccion de skills

> **Fuente:** `.github/copilot-instructions.md` seccion 1.1

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

## 3. Protocolo de comunicacion

Todo Sub-agente **debe** reportar al Orquestador usando el formato en `skills/action-summary-template.md`.

## 4. Automatizacion

`scripts/sync.sh` sincroniza las skills registradas:

1. Parsea los **YAML frontmatter** de todos los `skills/*/skill.md`
2. Extrae `name`, `trigger`, `scope` de cada skill
3. Regenera la tabla de **Skill References** en `docs/agent-context/SKILL_REGISTRY.md`
4. Usa comentarios sentinela para reemplazo idempotente

**Uso:** `bash scripts/sync.sh` (ejecutar despues de crear/modificar skills)

## 5. Archivos de soporte

| Archivo                                 | Proposito                                             |
| --------------------------------------- | ----------------------------------------------------- |
| `docs/agent-context/PROJECT_CONTEXT.md` | Arquitectura, stack tecnico, estructura del proyecto  |
| `docs/agent-context/RULES.md`           | Reglas de codigo, anti-patrones, nomenclatura         |
| `docs/agent-context/WORKFLOW.md`        | Workflow de 11 pasos del orquestador                  |
| `docs/agent-context/SKILL_REGISTRY.md`  | Catalogo de 8 skills con triggers, paths, scopes      |
| `docs/MD_STYLE_GUIDE.md`                | Estilo Markdown: sin emoji en headings, sentence case |
| `.github/copilot-instructions.md`       | Orquestador para Copilot                              |
| `GEMINI.md`                             | Orquestador para Gemini/otros agentes                 |
| `DEBT_REPORT.md`                        | Tabla consolidada de hallazgos y deuda tecnica        |
| `AI_WORKFLOW.md`                        | Registro de interacciones humano-maquina              |

## 6. Limitacion actual

El sistema esta disenado para que **el agente actue como orquestador Y como sub-agente** en la misma conversacion. Los "sub-agentes" no son procesos separados, son **contextos aislados** que se cargan leyendo la skill correspondiente antes de ejecutar cada tarea. La delegacion ocurre conceptualmente:

```
Orquestador (agente) -> carga modulos de contexto -> carga skill.md -> ejecuta con scope limitado -> reporta resumen -> purga contexto
```

Esto previene el "Context Overflow" al no acumular contexto tecnico de multiples tareas en una sola sesion.
