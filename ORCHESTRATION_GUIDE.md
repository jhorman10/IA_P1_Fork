# 🏗️ Guía de Arquitectura del Sistema de Orquestación

## Visión General

El sistema está configurado con **1 Agente Orquestador** + **5 Sub-agentes (Skills)** delegados para tareas específicas. El objetivo es evitar el "Context Overflow" aislando cada tarea en un contexto reducido con instrucciones especializadas.

---

## 1. Agente Orquestador → `GEMINI.md`

Este es el **cerebro central** del sistema. Antigravity lo lee automáticamente al iniciar cada conversación (aparece como `<MEMORY[GEMINI.md]>` en las instrucciones del agente).

### Estructura del archivo

| Sección | Propósito |
|---------|-----------|
| **System Prompt** | 5 directrices obligatorias: aislamiento de tareas, fuente de verdad cultural, autoinvocación de skills, higiene de contexto, navegación jerárquica |
| **Project Overview** | Arquitectura del proyecto (Producer → RabbitMQ → Consumer), estructura de carpetas clave |
| **Tech Stack** | Versiones exactas de cada tecnología (NestJS ^10.x, Next.js ^15.x, MongoDB 7.x, etc.) |
| **Guidelines** | Convenciones culturales (AI-First) + flujo de trabajo de 8 pasos + anti-patrones |
| **Skill References** | Tabla auto-generada por `sync.sh` que mapea triggers → skills |

### Flujo de trabajo del Orquestador

```
1. LEER       → DEBT_REPORT.md (estado actual de todos los ítems)
2. ELEGIR     → Siguiente ítem pendiente (status: ⬜)
3. MATCH      → Identificar skill por trigger (ver tabla Skill References)
4. DELEGAR    → Crear Sub-agente con contexto: {ítem, skill.md, archivos en scope}
5. RECIBIR    → Resumen de Acción del Sub-agente
6. ACTUALIZAR → Marcar ítem como ✅ en DEBT_REPORT.md
7. PURGAR     → Descartar razonamiento intermedio del SA, conservar solo el resumen
8. REPETIR    → Siguiente ítem pendiente
```

### Directrices Obligatorias

1. **AISLAMIENTO DE TAREAS:** Prohibido realizar ediciones masivas directamente. Se delega en Sub-agentes con contexto independiente.
2. **FUENTE DE VERDAD CULTURAL:** Antes de cualquier acción, consultar `GEMINI.md` para alinear la ejecución.
3. **AUTOINVOCACIÓN DE SKILLS:** Identificar triggers en la solicitud y cargar la skill correspondiente.
4. **HIGIENE DE CONTEXTO:** Exigir "Resumen de Acción" al Sub-agente e integrar solo ese resumen.
5. **NAVEGACIÓN JERÁRQUICA:** Si falta información, navegar a archivos `agent.md` de subdirectorios.

---

## 2. Sub-agentes (Skills) → `skills/*/skill.md`

Cada skill define un **sub-agente especializado** con contexto aislado. Todas comparten la misma estructura:

```yaml
# YAML Frontmatter (metadata)
name: "<nombre>"
description: "<propósito>"
trigger: "<palabras clave de activación>"
scope: "<directorios/archivos permitidos>"
author: "IA_P1_Fork Team"
version: "1.0.0"
license: "MIT"
autoinvoke: true
```

Cada skill incluye secciones de: **Context**, **Rules**, **Tools Permitted**, **Workflow**, y **Assets**.

### 2.1 `backend-api` — NestJS Backend

- **Trigger:** services, controllers, DTOs, validation, RabbitMQ, ack/nack, business logic
- **Scope:** `backend/producer/src/`, `backend/consumer/src/`
- **Reglas clave:**
  - DTOs con `class-validator` y `ValidationPipe` global
  - Nomenclatura en inglés: `idCard`, `fullName`, `officeNumber`
  - Tipo compartido: `AppointmentEventPayload`
  - Estrategia explícita ack/nack (success → ack, validation error → nack sin requeue, transient error → nack con requeue)
- **Assets:**
  - `assets/templates/service-pattern.ts` — Servicio NestJS de referencia
  - `assets/docs/ack-nack-strategy.md` — Documentación detallada de ack/nack

### 2.2 `docker-infra` — Docker & Infraestructura

- **Trigger:** Docker, healthchecks, credentials, env vars, ports, deployment
- **Scope:** `docker-compose.yml`, `.env`, `.env.example`, `Dockerfile`s
- **Reglas clave:**
  - Nunca hardcodear credenciales, usar `${VAR:-default}` con `.env`
  - Todo servicio debe tener `healthcheck`
  - `depends_on` con `condition: service_healthy`
  - Puertos de management (15672, 27017) no exponer en producción
- **Assets:**
  - `assets/templates/healthcheck-pattern.yml` — Configuración de healthcheck de referencia
  - `assets/docs/production-hardening.md` — Checklist para deployment a producción

### 2.3 `frontend-ui` — Next.js & UI

- **Trigger:** UI components, WebSocket, CSS, pages, dashboard, frontend behavior
- **Scope:** `frontend/src/`
- **Reglas clave:**
  - Solo CSS Modules (`page.module.css`) — prohibido Tailwind, Bootstrap, etc.
  - `'use client'` para componentes con hooks o browser APIs
  - WebSocket con `NEXT_PUBLIC_WS_URL`
  - Tipos alineados con `AppointmentEventPayload`
- **Assets:**
  - `assets/templates/page-pattern.tsx` — Página Next.js de referencia
  - `assets/docs/css-modules-conventions.md` — Convenciones de CSS Modules

### 2.4 `testing-qa` — Tests & QA

- **Trigger:** tests, specs, unit testing, mocking, coverage, test failures, QA validation
- **Scope:** `backend/producer/test/`, `backend/*/src/**/*.spec.ts`
- **Reglas clave:**
  - Usar `Test.createTestingModule()` con mocks tipados
  - Mockear dependencias externas (MongoDB, RabbitMQ) — nunca hit a servicios reales
  - Testear paths de éxito Y error
  - Naming: `<service-name>.spec.ts`
- **Assets:**
  - `assets/templates/spec-pattern.ts` — Spec de referencia con mocking de Mongoose
  - `assets/docs/mocking-guide.md` — Patrones de mock factory para providers comunes

### 2.5 `skill-creator` — Meta-skill

- **Trigger:** cuando una tarea requiere capacidades no cubiertas por las skills existentes
- **Scope:** `skills/`, `.agent/workflows/`
- **Propósito:** Crear nuevas skills siguiendo el template estándar con YAML frontmatter + todas las secciones requeridas
- **Post-creación:** ejecutar `bash scripts/sync.sh` para registrar la nueva skill

---

## 3. Protocolo de Comunicación → `skills/action-summary-template.md`

Todo Sub-agente **debe** reportar al Orquestador usando este formato estandarizado:

```markdown
## Action Summary

- **Item:** `[ID del DEBT_REPORT, ej: A-01]`
- **Skill:** `[skill utilizada, ej: backend-api]`
- **Files Changed:**
  - `path/to/file1.ts` — [descripción breve del cambio]
  - `path/to/file2.ts` — [descripción breve del cambio]
- **What Was Done:** [1-2 oraciones describiendo la acción]
- **What to Validate:**
  - [ ] [Comando o verificación manual]
- **HUMAN CHECK Added:** [Sí/No — si sí, listar ubicaciones]
- **Breaking Changes:** [Sí/No — si sí, describir impacto]
```

---

## 4. Automatización → `scripts/sync.sh`

Script que sincroniza las skills registradas con el orquestador:

1. Parsea los **YAML frontmatter** de todos los `skills/*/skill.md`
2. Extrae `name`, `trigger`, `scope` de cada skill
3. Regenera la tabla de **Skill References** en `GEMINI.md`
4. Usa comentarios sentinela para reemplazo idempotente:
   ```
   <!-- BEGIN SKILL REFERENCES (auto-generated by scripts/sync.sh) -->
   ...tabla...
   <!-- END SKILL REFERENCES -->
   ```

**Uso:** `bash scripts/sync.sh` (ejecutar después de crear/modificar skills)

---

## 5. Archivos de Soporte

| Archivo | Propósito |
|---------|-----------|
| `DEBT_REPORT.md` | Tabla consolidada con todos los ítems de feedback, deuda técnica, skill asignada, y estado (⬜/🔄/✅/⏸️) |
| `AI_WORKFLOW.md` | Documentación de la metodología AI-First para humanos (incluye Prompt Traceability Log) |
| `README.md` | Documentación general del proyecto |

---

## 6. Limitación Actual

El sistema está diseñado para que **Antigravity haga de orquestador Y de sub-agente** en la misma conversación. Los "sub-agentes" no son procesos separados — son **contextos aislados** que se cargan leyendo la skill correspondiente antes de ejecutar cada tarea. La delegación ocurre conceptualmente:

```
Orquestador (yo) → cargo skill.md → ejecuto con scope limitado → reporto resumen → purgo contexto
```

Esto previene el "Context Overflow" al no acumular contexto técnico de múltiples tareas en una sola sesión.
