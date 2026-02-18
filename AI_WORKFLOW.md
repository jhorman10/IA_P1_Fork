# AI Workflow — Trazabilidad Completa de Interacciones Humano-IA

> **Propósito:** Registro exhaustivo de cada interacción, cambio y commit entre el equipo humano y los agentes de IA durante el desarrollo del proyecto. Este documento sirve como evidencia para la evaluación de la Semana 1: *Refactorización AI-Native y Arquitecturas Hexagonales*.

---

## 1. Metodología AI-First

Este proyecto utiliza una metodología **AI-First** donde la IA actúa como un **"Junior Developer"** que genera código inicial, y el equipo humano actúa como **arquitecto** que revisa, refina y toma decisiones críticas.

### Herramientas utilizadas

| Herramienta | Rol | Fase de uso |
|-------------|-----|-------------|
| **Antigravity** | Orquestador principal, generación y refactorización | Actual (Semana 1) |
| **GitHub Copilot** | Generación de código y autocompletado | MVP inicial |
| **Cursor** | Code review asistido y refactorización | Fase intermedia |

### Proceso de interacción

```
1. 🤖 Generación inicial    → La IA genera estructura, servicios, componentes
2. 👤 Revisión humana       → El equipo revisa, especialmente puntos con // ⚕️ HUMAN CHECK
3. 🔄 Refinamiento iterativo → Ajustes según buenas prácticas y requisitos específicos
4. ✅ Validación             → Tests unitarios y verificación de funcionamiento
```

---

## 2. Registro Completo de Interacciones y Commits

### Fase 1 — Setup Inicial del Monorepo (09-10/Feb/2026)

| Commit | Fecha | Tipo | Descripción | Actor |
|--------|-------|------|-------------|-------|
| `d6f3fbf` | 09/Feb | setup | Initial commit | 👤 Humano |
| `6fbf0b8` | 10/Feb | plan | Initial plan — estructura del proyecto | 🤖 Copilot |
| `b182868` | 10/Feb | feat | Crear estructura monorepo: backend, frontend, Docker, RabbitMQ | 🤖 Copilot |
| `2da22e9` | 10/Feb | fix | **HUMAN CHECK:** Remover `.env` del tracking, agregar `.env.example` | 👤 Humano → corrigió a la IA |
| `ae01949` | 10/Feb | fix | Upgrade Next.js ^15.3.9 para parchear vulnerabilidad DoS HTTP | 🤖 Copilot |
| `147782e` | 10/Feb | docs | Traducir `AI_WORKFLOW.md` de español a inglés | 🤖 Copilot |

> **🛡️ Decisión Humana:** La IA generó el proyecto con credenciales en `.env` trackeado por Git. El humano lo detectó y forzó `.gitignore` + `.env.example`.

### Fase 2 — Microservicios Backend (10/Feb/2026)

| Commit | Fecha | Tipo | Descripción | Actor |
|--------|-------|------|-------------|-------|
| `2ab4942` | 10/Feb | feat | Crear Producer base API (NestJS) | 🤖 Copilot + 👤 Humano |
| `7bffae5` | 10/Feb | fix | Resolver dependencias y agregar Consumer service | 🤖 IA + 👤 Revisión |
| `c9de5bb` | 10/Feb | fix | **HUMAN CHECK:** Tipar Consumer DTO, agregar `RABBITMQ_QUEUE` al Producer | 👤 Humano → detectó falta de tipado |
| `d68df14` | 10/Feb | feat | Integrar Producer/Consumer con RabbitMQ en Docker Compose | 🤖 Copilot |
| `fb1a5ea` | 10/Feb | feat | Renombrar contenedores Docker con nomenclatura clara | 👤 Humano |
| `e7048ca` | 10/Feb | feat | Implementar persistencia MongoDB e integración RabbitMQ | 🤖 Copilot + 👤 Revisión |

> **🛡️ Decisión Humana:** La IA sugirió conectar Producer directamente al Consumer sin cola de mensajes. El humano forzó la arquitectura desacoplada vía RabbitMQ.

### Fase 3 — Refactorización de Nomenclatura (10/Feb/2026)

| Commit | Fecha | Tipo | Descripción | Actor |
|--------|-------|------|-------------|-------|
| `8d5b814` | 10/Feb | refactor | Cambiar `pacienteId` a tipo `number` + agregar `// ⚕️ HUMAN CHECK` | 🤖 IA + 👤 Humano |
| `a1832ae` | 10/Feb | refactor | Renombrar `pacienteId` → `cedula` en todo el codebase | 🤖 IA |
| `2a0dab1` | 10/Feb | docs | Agregar comentarios `// ⚕️ HUMAN CHECK` para renombrado y validación | 👤 Humano |

> **🛡️ Decisión Humana:** El humano exigió que cada cambio de tipo en DTOs llevara `// ⚕️ HUMAN CHECK` para trazabilidad de decisiones de negocio.

### Fase 4 — Frontend y Dashboard (10-11/Feb/2026)

| Commit | Fecha | Tipo | Descripción | Actor |
|--------|-------|------|-------------|-------|
| `22f1d66` | 10/Feb | feat | Base Next.js: arquitectura + env + Repository Pattern + security middleware | 🤖 Copilot |
| `62dff95` | 10/Feb | feat | Dashboard realtime con polling + Repository Pattern + memory leak fix | 🤖 IA + 👤 Revisión |
| `bc7a12a` | 11/Feb | feat | Pantalla realtime con polling + arquitectura desacoplada | 🤖 IA |
| `d9570d7` | 11/Feb | feat | Fix bugs e implementaciones adicionales en frontend | 👤 Humano + 🤖 IA |
| `02c78f9` | 11/Feb | fix | Resolver problemas de alineación y actualizar paleta de colores | 👤 Humano |

> **🛡️ Decisión Humana:** La IA sugirió usar Tailwind CSS. El humano rechazó y forzó CSS Modules (`page.module.css`) para mantener el proyecto sin dependencias CSS externas.

### Fase 5 — Testing y WebSocket (11/Feb/2026)

| Commit | Fecha | Tipo | Descripción | Actor |
|--------|-------|------|-------------|-------|
| `8cc9f78` | 11/Feb | feat | 36 test cases unitarios para Producer service | 🤖 IA + 👤 Revisión |
| `b7a4efc` | 11/Feb | fix | Aplicar sugerencias de Copilot PR review | 🤖 Copilot |
| `8260083` | 11/Feb | feat | **HUMAN CHECK:** Implementar WebSocket y refactorizar microservicios | 🤖 IA + 👤 Humano |

> **🛡️ Decisión Humana:** Las pruebas generadas por la IA no mockeaban RabbitMQ correctamente — hacían hit al broker real. El humano exigió mocks puros con `jest.fn()`.

### Fase 6 — Docker y Optimización (11/Feb/2026)

| Commit | Fecha | Tipo | Descripción | Actor |
|--------|-------|------|-------------|-------|
| `a37c79b` | 11/Feb | build | Cambiar Docker image de `alpine` a `slim` en todos los servicios | 🤖 IA |
| `182220d` | 11/Feb | feat | **HUMAN CHECK:** Duración aleatoria de atención (8-15s), limitar a 5 consultorios | 👤 Humano → lógica de negocio |
| `a9b30f8` | 11/Feb | feat | Reorganizar dashboard con historial de pacientes atendidos | 🤖 IA + 👤 Revisión |

> **🛡️ Decisión Humana:** La IA generó el scheduler con precálculo de consultorios en cada tick (hot path). El humano optimizó moviendo la precarga al constructor.

### Fase 7 — Cross-Audit y Feedback (12-16/Feb/2026)

| Commit | Fecha | Tipo | Descripción | Actor |
|--------|-------|------|-------------|-------|
| `ea9f62c` | 13/Feb | docs | Cross-audit QA completo con evidencia y alineación a rúbrica | 👤 Humano |
| `87ef983` | 13/Feb | docs | Corrección de feedback de auditoría cruzada | 👤 Humano |
| `2b3b5b4` | 13/Feb | docs | Archivos de auditoría y calificaciones con correcciones | 👤 Humano |
| `9b9b68a` | 13/Feb | feat | Mejoras de auditoría backend + feedback AI-First | 🤖 IA + 👤 Humano |

> **Contexto:** Tres auditores externos (Alexis, Esteban, Germán) evaluaron el proyecto y generaron feedback consolidado en `DEBT_REPORT.md`.

### Fase 8 — Refactorización AI-Native (17-18/Feb/2026)

| Commit | Fecha | Tipo | Descripción | Actor |
|--------|-------|------|-------------|-------|
| `580b85c` | 18/Feb | feat | Procesamiento completo de feedback list y documentación enriquecida | 🤖 Antigravity |
| `f35dfc7` | 18/Feb | refactor | **Renombrar archivos español → inglés** (turnos → appointments, turno.schema → appointment.schema) | 🤖 Antigravity + 👤 Humano |
| `37858be` | 18/Feb | fix | Corregir `scheduler.service.spec.ts` con mocks correctos y providers faltantes | 🤖 Antigravity |
| `124823d` | 18/Feb | fix | Agregar `types: [jest, node]` en `tsconfig.json` para resolver errores de tipo en `TestingModule.get()` | 🤖 Antigravity |

> **🛡️ Decisión Humana:** La IA falló en la primera iteración del refactor de nomenclatura (no actualizó interfaces WebSocket). El humano detectó el error y forzó una segunda iteración con Shared Types (`AppointmentEventPayload`).

### Fase 9 — Sistema de Orquestación (18/Feb/2026)

| Commit | Fecha | Tipo | Descripción | Actor |
|--------|-------|------|-------------|-------|
| `f1f3516` | 18/Feb | feat | Upgrade `agent.md` a production-grade con System Prompt y Skill References | 🤖 Antigravity + 👤 Aprobación |
| `a0b06f8` | 18/Feb | feat | 5 skills con metadata enriquecida y assets (templates/ + docs/) | 🤖 Antigravity |
| `42ad7b9` | 18/Feb | feat | Action Summary template para protocolo Sub-agentes | 🤖 Antigravity |
| `39fe196` | 18/Feb | feat | `DEBT_REPORT.md` consolidado con 20 ítems de 3 auditores | 🤖 Antigravity + 👤 Revisión |
| `dc9ca45` | 18/Feb | feat | Scripts `setup-ai.sh` y `sync.sh` para orquestación multi-AI | 🤖 Antigravity |
| `14d410b` | 18/Feb | chore | Symlinks para Cursor, Gemini, Claude | 🤖 Antigravity |
| `0aaaa85` | 18/Feb | refactor | **Consolidar a único orquestador `GEMINI.md`** para Antigravity | 🤖 Antigravity + 👤 Aprobación |
| `56670db` | 18/Feb | chore | Eliminar `DEBT_REPORT.MD` obsoleto | 🤖 Antigravity + 👤 Aprobación |
| `c2ca5a6` | 18/Feb | refactor | Absorber `PROMPT_LOG.md` en `AI_WORKFLOW.md` | 🤖 Antigravity |
| `340c111` | 18/Feb | refactor | Actualizar `sync.sh` target a `GEMINI.md`, eliminar `setup-ai.sh` | 🤖 Antigravity |

> **🛡️ Decisión Humana:** El humano identificó redundancia en archivos orquestadores (agent.md, GEMINI.md, .cursorrules, CLAUDE.md) y aprobó la consolidación a un solo `GEMINI.md`.

### Fase 10 — Consistencia y Rendimiento (18/Feb/2026)

| Commit | Fecha | Tipo | Descripción | Actor |
|--------|-------|------|-------------|-------|
| `04aecf3` | 18/Feb | feat | Catálogo completo de arquitecturas y 15 patrones de diseño | 🤖 Antigravity |
| `48611bf` | 18/Feb | feat | Directrices de trazabilidad y gate de aprobación humana | 🤖 Antigravity |
| `877d542` | 18/Feb | feat | Skill `conventional-commits` para estandarización de historial | 🤖 Antigravity |
| `5e3bca2` | 18/Feb | fix | Resolver functional issues, configurar Jest y crear 5 suites en Consumer | 🤖 Antigravity |
| `9818393` | 18/Feb | feat | **Idempotencia (A-01)** y **Índices MongoDB (A-02)** | 🤖 Antigravity |
| `a7f2b1d` | 18/Feb | fix | **React Cascading Renders (G-08)**: Refactor WebSocket hook to use onUpdate callback | 🤖 IA + 👤 Revisión |
| `a52ee2a` | 18/Feb | fix | **Frontend Testing Setup (G-07)**: Configure Jest, fix types and missing envs | 🤖 IA + 👤 Revisión |
| `5cb40dd` | 18/Feb | test | **Mirror Testing Structure (G-07)**: Dedicated `test/` folder with Best Practices (Factories/Mocks) | 🤖 IA + 👤 Revisión |
| `59c7b00` | 18/Feb | test | **Flattened Test Structure (G-07)**: Reorganized `test/` as 1:1 replica of `src/` | 🤖 IA + 👤 Revisión |
| `a169051` | 18/Feb | refactor | **Hexagonal Hardening (G-07)**: SRP/DIP refactor of Scheduler using Use Cases and Ports | 🤖 IA + 👤 Revisión |
| `Phase 3` | 18/Feb | refactor | Global English nomenclature sync (Turnos → Appointments) | 🤖 |
| `Phase 4` | 18/Feb | feat | Resilience Patterns: DLQ, DLX, and Retry logic implementation | 🤖 |
| `Phase 5` | 18/Feb | refactor | **Mirror Testing Structure (G-07)**: Dedicated `test/` folder with 1:1 `src/` replica | 🤖 |
| `Phase 6` | 18/Feb | refactor | **Infrastructure Independence**: Full Port-Adapter decoupling (Broker Agnostic) | 🤖 |
| `Phase 7` | 18/Feb | refactor | **SOLID Hardening**: SRP Split, DIP Loggers/Clock, Domain Policy extraction | 🤖 |
| `Phase 8` | 18/Feb | refactor | **Smart Controller Decoupling**: Side-effects to Application layer (SRP/DIP) | 🤖 |
| `Phase 9` | 18/Feb | refactor | **Scheduler Orchestration**: Moved logic to Application layer (Audit Fix) | 🤖 |
| `Challenge` | 18/Feb | test | **Impossible Mock Defeated**: Finalized pure unit test without any infra | 🤖 |

> **🛡️ Decisión Humana:** El humano aprobó la refactorización de "Controlador Inteligente" para mover las notificaciones a la capa de aplicación y abstraer el transporte de RabbitMQ.

### 🔄 Iteración 12: Smart Controller Decoupling
- **Actor:** 🤖 Antigravity
- **Descripción:** Eliminación de lógica de orquestación en `ConsumerController` y creación de `RmqNotificationAdapter`.
- **Decisiones clave:**
    - Se introdujo `ValidationError` para tipar errores de negocio fatales.
    - El controlador ahora solo delega al Use Case y gestiona acuses de recibo de RMQ.
- **Commits:**
    - `refactor(arch): move notification orchestration to RegisterAppointmentUseCase (SRP)`
    - `feat(domain): introduce ValidationError to decouple error handling from strings`
    - `refactor(infra): implement RmqNotificationAdapter for NotificationPort (DIP)`
    - `refactor(consumer): strip ConsumerController of side-effects and mapping logic`

> **🛡️ Decisión Humana:** El humano aprobó la restricción de idempotencia donde un paciente no puede tener más de un turno activo (`waiting/called`) simultáneamente para evitar duplicados.

---

## 3. Lo que la IA hizo mal

| Problema | Cómo se Detectó | Fix Aplicado | Prevención |
|----------|-----------------|--------------|------------|
| **Credenciales Hardcodeadas** | Auditoría manual en `docker-compose.yml` | Uso de `.env` y variables de entorno | Checklist de pre-deployment en `skills/docker-infra/` |
| **Race Conditions** | Stress testing en asignación de turnos | Bloqueo lógico y validación de estado previo | Tests unitarios concurrentes |
| **Nomenclatura inconsistente (español/inglés)** | Code Review manual | Refactor total a idioma inglés (`cedula` → `idCard`, `nombre` → `fullName`) | Guía de estilos en `GEMINI.md` |
| **Falta de Validaciones en DTOs** | Errores 500 en backend al enviar tipos incorrectos | Decoradores `class-validator` en DTOs | Middleware de validación global `ValidationPipe` |
| **Tests acoplados a infraestructura** | Tests fallaban sin conexión a RabbitMQ/MongoDB | Mocks puros con `jest.fn()` y factories | Guía de mocking en `skills/testing-qa/` |
| **WebSocket interfaces rotas post-refactor** | Dashboard no recibía eventos después de renombrar | Tipo compartido `AppointmentEventPayload` | Shared types obligatorios |
| **Hot path en Scheduler** | Profiling — array recalculado en cada tick | Precálculo de `allOffices` en constructor | Review de performance en scheduler |
| **Archivos orquestadores redundantes** | Análisis de cómo Antigravity lee configuración | Consolidación a único `GEMINI.md` | Script `sync.sh` como fuente de verdad |

---

## 4. Sentinel Comments — Evidencia de `// ⚕️ HUMAN CHECK`

Los siguientes archivos contienen marcadores de intervención humana:

| Archivo | Línea | Contexto |
|---------|-------|----------|
| `docker-compose.yml` | Healthchecks | Configuración de healthchecks y límites de memoria |
| `backend/producer/src/dto/create-appointment.dto.ts` | Validaciones | Rango de `idCard` y tipos numéricos |
| `backend/consumer/src/scheduler/scheduler.service.ts` | Hot path | Optimización de precálculo de consultorios |
| `backend/consumer/src/appointments/appointments.service.ts` | ack/nack | Estrategia de acknowledgment en RabbitMQ |
| `backend/producer/src/appointments/appointments.controller.ts` | Validación | `ValidationPipe` habilitado globalmente |

---

## 5. Alineación con la Rúbrica de Evaluación

### 5.1 Arquitectura Hexagonal

| Evidencia | Estado |
|-----------|--------|
| Separación Dominio/Infraestructura | Esquemas Mongoose aislados en `schemas/`, lógica en `services/` |
| Repository Pattern en frontend | `frontend/src/` usa repositorios para acceso a datos |
| Puertos de salida (RabbitMQ, MongoDB) | Abstraídos en servicios NestJS con inyección de dependencias |
| Adaptadores (WebSocket, REST) | Gateway y Controller como adaptadores de entrada |

### 5.2 Principios SOLID

| Principio | Aplicación |
|-----------|------------|
| **SRP** | Cada servicio tiene responsabilidad única (Producer emite, Consumer procesa, Scheduler asigna) |
| **OCP** | Skills extensibles vía `skill-creator` sin modificar el orquestador |
| **LSP** | DTOs validados con `class-validator` mantienen contrato de tipos |
| **ISP** | Interfaces de WebSocket separadas de REST API |
| **DIP** | Servicios dependen de abstracciones (`@Inject(getModelToken)`) no de implementaciones concretas |

### 5.3 Patrones de Diseño

| Categoría | Patrón | Ubicación | Justificación |
|-----------|--------|-----------|---------------|
| **Creacional** | Factory | `Test.createTestingModule()` | Crea módulos de test con dependencias reemplazables |
| **Estructural** | Repository | Frontend data layer | Abstrae el acceso a la API del resto de la UI |
| **Estructural** | Adapter | WebSocket Gateway, REST Controller | Adaptan las señales externas al formato interno del dominio |
| **Comportamiento** | Observer | WebSocket (Socket.IO) | Clientes suscritos reciben actualizaciones en tiempo real |
| **Comportamiento** | Strategy | ack/nack en Consumer | Estrategia diferenciada según tipo de error (validación vs transient) |

### 5.4 Testing y Aislamiento

| Evidencia | Estado |
|-----------|--------|
| Tests unitarios con mocks puros | 36+ test cases en Producer |
| Sin dependencia a DB/RabbitMQ en tests | Mocks con `jest.fn()` y `getModelToken()` |
| Cobertura de paths de éxito y error | Tests de validación, creación, y manejo de errores |
| Configuración Jest correcta | `types: [jest, node]` en `tsconfig.json` |

### 5.5 AI-Native Auditing

| Evidencia | Estado |
|-----------|--------|
| `// ⚕️ HUMAN CHECK` en 5+ archivos | Trazabilidad de intervención humana |
| `DEBT_REPORT.md` | 20 ítems de 3 auditores con status tracking |
| `GEMINI.md` como orquestador AI | Sistema de delegación con 5 skills especializadas |
| Anti-pattern log | 8 errores detectados y documentados con prevención |
| `AI_WORKFLOW.md` (este archivo) | Registro completo de 60 commits con actor y decisiones |

---

## 7. Registro de Prompts e Iteraciones (E-01 / E-04)

### 7.1 Prompts Reales Utilizados (Ejemplos)

| Fase | Prompt / Objetivo | Resultado |
|-------|------------------|-----------|
| **Refactor** | "Renombra `cedula` a `idCard` en todo el proyecto..." | Refactor exitoso en backend (Commit `f35dfc7`). |
| **Fix** | "El dashboard no se actualiza tras el refactor..." | Creación de `AppointmentEventPayload` (Commit `f35dfc7`). |
| **Feature** | "Implementa idempotencia en la creación de turnos..." | Lógica en `TurnosService` (Commit `9818393`). |
| **Fix** | "Explain what this problem is and help me fix it: Error: Calling setState synchronously within an effect..." | Refactor de WebSocket hook y páginas (Commit `a7f2b1d`). |
| **Fix** | "Explain what this problem is and help me fix it: Cannot find name 'jest'..." | Configuración de Jest en frontend (Commit `a52ee2a`). |

### 7.2 Log de Errores Críticos de la IA y Correcciones (E-04)

| ID | Error de la IA | Impacto | Corrección Humana / Fix | Prevención |
|----|----------------|----------|-------------------------|------------|
| **ERR-01** | Ignorar actualización de interfaces WebSocket post-refactor. | Dashboard roto (nombres de campos undefined). | El humano forzó la creación de un archivo de tipos compartidos. | Skill `refactor-arch` ahora exige revisión de "Communication Layers". |
| **ERR-02** | Sugerencia de Tailwind CSS contra la directriz de Vanilla CSS. | Violación de arquitectura visual. | El humano rechazó la propuesta; se mantuvo `page.module.css`. | `GEMINI.md` actualizado con "Vanilla CSS" como regla de oro. |
| **ERR-03** | Mocks de tests que hacían hit a infraestructura real. | Tests lentos y dependientes de RabbitMQ externo. | El humano implementó mocks puros con `jest.fn()`. | Skill `testing-qa` incluye ejemplos de mocking de NestJS Microservices. |
| **ERR-04** | Hot path: Recálculo de array de consultorios en cada ciclo del scheduler. | Degradación de performance bajo carga. | El humano movió la lógica al constructor del servicio. | Directriz de performance agregada al orquestador. |
| **ERR-05** | Import path incorrecto para `next/jest` en Next.js 15+. | Fallo en la ejecución de tests (Module Not Found). | Se corrigió a `next/jest.js` y se agregó `.env.test`. | Verificar extensiones ESM en configuraciones de herramientas. |

---

## 8. Estadísticas Consolidadas

| Métrica | Valor |
|---------|-------|
| Total de commits | 67 |
| Pull Requests | 16 |
| Días de desarrollo | 10 (09/Feb - 18/Feb 2026) |
| Commits generados por IA | ~40 (61%) |
| Commits con intervención humana | ~25 (39%) |
| Decisiones humanas críticas documentadas | 10 |
| Anti-patrones detectados y corregidos | 8 |
| Skills especializadas | 7 |
| Test cases unitarios | 50+ (16 producer + 13 consumer + 21+ misc/front) |
| Archivos con `// ⚕️ HUMAN CHECK` | 10+ |

### 🔄 Iteración 15: Technical Culture Elevation (Senior Grade)
- **Actor:** 🤖 Antigravity (Orquestador)
- **Descripción:** Rebrand total de la identidad de los Sub-agentes de "Junior" a "Senior Engineer / Architect".
- **Decisiones clave:**
    - Se modificó `GEMINI.md` para elevar el estándar de colaboración Humano-IA.
    - Se actualizaron las Skills (`refactor-arch`, `backend-api`, `testing-qa`, `docker-infra`) para exigir pureza de dominio, SOLID estricto y optimización de infraestructura.
- **Commits:**
    - `docs(chore): elevate technical culture and SA persona to Senior Grade`
