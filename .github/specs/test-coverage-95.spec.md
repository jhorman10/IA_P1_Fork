---
id: SPEC-025
status: DRAFT
feature: test-coverage-95
created: 2026-04-07
updated: 2026-04-07
author: spec-generator
version: "1.0"
related-specs: []
---

# Spec: Plan de Pruebas para Cobertura ≥ 95%

> **Estado:** `DRAFT` → aprobar con `status: APPROVED` antes de iniciar implementación.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Elevar la cobertura de tests unitarios y de integración al **≥ 95%** en backend (producer + consumer) y **≥ 90%** en frontend. Se prioriza lógica de negocio, adaptadores de infraestructura y componentes interactivos, dejando módulos NestJS declarativos y schemas Mongoose fuera del cálculo crítico.

### Requerimiento de Negocio
La pipeline de CI debe validar que toda funcionalidad nueva y existente esté cubierta por pruebas automatizadas antes de fusionar a `develop`. El umbral mínimo es 95% de cobertura de sentencias (statements) para backend y 90% para frontend.

### Historias de Usuario

#### HU-01: Cobertura backend/producer ≥ 95%

```
Como:        DevOps / Tech Lead
Quiero:      que backend/producer alcance ≥ 95% de cobertura de statements
Para:        garantizar que cambios futuros no introduzcan regresiones sin detectar

Prioridad:   Alta
Estimación:  L
Dependencias: Ninguna
Capa:        Backend
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: Cobertura producer alcanza 95%
  Dado que:  se ejecuta `npm run test:cov` en backend/producer
  Cuando:    se genera el reporte de cobertura
  Entonces:  el % Stmts global es ≥ 95%
```

**Error Path**
```gherkin
CRITERIO-1.2: CI falla si cobertura baja de 95%
  Dado que:  un PR modifica código en backend/producer
  Cuando:    la cobertura cae por debajo del 95%
  Entonces:  el job de CI falla con código de salida 1
```

#### HU-02: Cobertura backend/consumer ≥ 95%

```
Como:        DevOps / Tech Lead
Quiero:      que backend/consumer alcance ≥ 95% de cobertura de statements
Para:        garantizar que los handlers de mensajería estén cubiertos por pruebas

Prioridad:   Alta
Estimación:  XL
Dependencias: Ninguna
Capa:        Backend
```

#### Criterios de Aceptación — HU-02

```gherkin
CRITERIO-2.1: Cobertura consumer alcanza 95%
  Dado que:  se ejecuta `npm run test:cov` en backend/consumer
  Cuando:    se genera el reporte de cobertura
  Entonces:  el % Stmts global es ≥ 95%
```

#### HU-03: Cobertura frontend ≥ 90%

```
Como:        DevOps / Tech Lead
Quiero:      que el frontend alcance ≥ 90% de cobertura de statements
Para:        asegurar que componentes interactivos y hooks estén validados

Prioridad:   Alta
Estimación:  XL
Dependencias: Ninguna
Capa:        Frontend
```

#### Criterios de Aceptación — HU-03

```gherkin
CRITERIO-3.1: Cobertura frontend alcanza 90%
  Dado que:  se ejecuta `npx jest --coverage` en frontend/
  Cuando:    se genera el reporte de cobertura
  Entonces:  el % Stmts global es ≥ 90%
```

### Reglas de Negocio
1. Cada test es independiente — sin estado compartido entre tests.
2. Mockear SIEMPRE dependencias externas (DB, Firebase, RabbitMQ, APIs).
3. Estructura AAA obligatoria: GIVEN → WHEN → THEN.
4. Sin `console.log` permanentes, sin `sleep`, sin lógica condicional en tests.
5. Los módulos NestJS (`*.module.ts`) y schemas Mongoose (`*.schema.ts`) pueden excluirse del objetivo de cobertura si solo contienen configuración declarativa.

---

## 2. DISEÑO

### 2.1 Estado Actual de Cobertura

#### Backend Producer — 82.92% Stmts (CI run 2026-04-07)

| Categoría | Archivos | % Stmts Actual | Meta |
|-----------|----------|----------------|------|
| Use Cases | 8 | 75.17% | 95% |
| Controllers | 4 | ~98% | 95% ✅ |
| Guards | 5 | 99.21% | 95% ✅ |
| Interceptors | 1 | 98% | 95% ✅ |
| Events/Gateways | 4 | 97.43% | 95% ✅ |
| Infra Adapters | 12 | 45.71% | 80%+ |
| DTOs | 20 | 97.74% | 95% ✅ |
| Value Objects | 2 | 100% | 95% ✅ |
| Schemas | 8 | 98.82% | 95% ✅ |

**Archivos críticos (<50% cobertura):**

| Archivo | % Stmts | Líneas sin cubrir | Impacto |
|---------|---------|-------------------|---------|
| `doctor.service.impl.ts` | 13.95% | 33-115 | 🔴 Alto |
| `firebase-auth.adapter.ts` | 9.83% | 34-155 | 🔴 Alto |
| `mongoose-doctor.repository.ts` | 21.21% | 19-78 | 🔴 Alto |
| `mongoose-office.repository.ts` | 24.13% | 18-66 | 🔴 Alto |
| `mongoose-specialty.repository.ts` | 25.80% | 24-81 | 🔴 Alto |
| `rabbitmq-lifecycle-publisher.adapter.ts` | 22.72% | 13-47 | 🟡 Medio |
| `rabbitmq-doctor-publisher.adapter.ts` | 0% | 1-27 | 🟡 Medio |
| `office.service.impl.ts` | 50.94% | 50, 66-95, 113-192 | 🔴 Alto |

#### Backend Consumer — 66.70% Stmts (CI run 2026-04-07)

| Categoría | Archivos | % Stmts Actual | Meta |
|-----------|----------|----------------|------|
| Controller | 1 | 74.19% | 95% |
| Use Cases | 7 | 84.57% | 95% |
| Event Handlers | 2 | 27.45% | 95% |
| Persistence | 9 | 67.93% | 95% |
| Messaging | 3 | 100% | 95% ✅ |
| Domain Entities | 2 | 79.59% | 95% |
| Value Objects | 3 | 100% | 95% ✅ |
| Modules (declarativos) | 7 | 0% | Excluir |
| Schemas | 5 | 36.95% | Excluir |

**Archivos críticos (<50% cobertura):**

| Archivo | % Stmts | Líneas sin cubrir | Impacto |
|---------|---------|-------------------|---------|
| `auto-assign.handler.ts` | 0% | 1-79 | 🔴 Alto |
| `cancel-appointment.use-case.impl.ts` | 0% | 9-29 | 🔴 Alto |
| `complete-appointment.use-case.impl.ts` | 0% | 10-39 | 🔴 Alto |
| `mongoose-doctor.repository.ts` | 0% | 1-45 | 🟡 Medio |
| `mongoose-office.repository.ts` | 0% | 1-21 | 🟡 Medio |
| `mongoose-audit.adapter.ts` | 0% | 1-21 | 🟡 Medio |
| `doctor.mapper.ts` | 0% | 1-10 | 🟡 Medio |
| `doctor.entity.ts` | 58.82% | 24-40, 49 | 🟡 Medio |

#### Frontend — Cobertura por medir (~68 test files existentes)

**Archivos fuente (97 archivos .ts/.tsx en `src/`)** vs **Tests (68 specs en `test/` + 5 en `src/__tests__/`)**.

Cobertura estimada por análisis de archivo: ~70–75% (algunos componentes y hooks tienen tests completos, pero varias páginas y contextos tienen cobertura parcial).

**Archivos sin tests detectados:**

| Archivo fuente | Tipo | Test existente | Gap |
|----------------|------|----------------|-----|
| `src/context/ThemeProvider.tsx` | Context | ❌ No encontrado | 🔴 |
| `src/context/AuthProvider.tsx` | Context | Indirecto vía useAuth | 🟡 |
| `src/context/DependencyContext.tsx` | Context | `DependencyContext.mock.spec.tsx` | ✅ |
| `src/security/sanitize.ts` | Utility | ❌ No encontrado | 🔴 |
| `src/services/authService.ts` | Service | Indirecto vía useAuth | 🟡 |
| `src/services/profileService.ts` | Service | ❌ No encontrado | 🔴 |
| `src/services/specialtyService.ts` | Service | ❌ No encontrado | 🔴 |
| `src/app/waiting-room/page.tsx` | Page | ❌ No encontrado | 🔴 |
| `src/app/admin/layout.tsx` | Layout | Parcial en dep-layout spec | 🟡 |
| `src/app/doctor/layout.tsx` | Layout | ❌ No encontrado | 🔴 |
| `src/app/layout.tsx` | Layout | Parcial en dep-layout spec | 🟡 |
| `src/components/SpecialtyManager/SpecialtyManager.tsx` | Component | ❌ No encontrado | 🔴 |
| `src/components/DoctorStatusCard/OfficeSelector.tsx` | Component | Parcial en DoctorStatusCard.spec | 🟡 |
| `src/components/ProfileFormModal/DoctorSelectorField.tsx` | Component | Parcial en ProfileFormModal.spec | 🟡 |
| `src/proxi.ts` | Proxy config | `httpClient.proxi.coverage.spec.ts` | ✅ |
| `src/infrastructure/adapters/HttpAppointmentAdapter.ts` | Adapter | `adapters.coverage.spec.ts` | ✅ |
| `src/infrastructure/adapters/SocketIoAdapter.ts` | Adapter | `adapters.coverage.spec.ts` | ✅ |

### 2.2 Estrategia de Testing

```
Prioridad de tests (pirámide):
  1. Lógica de negocio (use cases, services)       → Mayor ROI
  2. Adaptadores de infraestructura (repos, guards) → Medio ROI
  3. Componentes interactivos (forms, modals)       → Medio ROI
  4. Módulos declarativos, schemas, layouts         → Bajo ROI (excluir/last)
```

### 2.3 Configuración de Coverage Thresholds

#### Backend Producer — `jest.config.js`
```js
coverageThreshold: {
  global: {
    statements: 95,
    branches: 80,
    functions: 85,
    lines: 95,
  },
},
```

#### Backend Consumer — `jest.config.js`
```js
coverageThreshold: {
  global: {
    statements: 95,
    branches: 80,
    functions: 85,
    lines: 95,
  },
},
collectCoverageFrom: [
  '<rootDir>/src/**/*.ts',
  '!<rootDir>/src/**/*.module.ts',
  '!<rootDir>/src/schemas/**/*.schema.ts',
  '!<rootDir>/src/schemas/**/*.schema.d.ts',
  '!<rootDir>/src/**/index.ts',
],
```

#### Frontend — `jest.config.ts`
```ts
coverageThreshold: {
  global: {
    statements: 90,
    branches: 75,
    functions: 80,
    lines: 90,
  },
},
```

### 2.4 Notas de Implementación

- **Firebase Auth Adapter:** Requiere mock completo de `firebase-admin`. Usar `jest.mock('firebase-admin/auth')`.
- **RabbitMQ Publishers:** Mock de `amqplib` channel. Pattern: `{ sendToQueue: jest.fn(), assertQueue: jest.fn() }`.
- **Mongoose Repositories:** Usar `mongoose-memory-server` si existe, o jest.mock del Model con `.find()`, `.findOne()`, `.create()` etc.
- **Frontend Contexts:** Testear como componentes wrapper; usar `renderHook` con providers.
- **Consumer Modules:** Excluir de cobertura con `collectCoverageFrom` en jest config, ya que son solo declaraciones `@Module({})`.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.

### Fase 0 — Configuración

- [ ] Actualizar `jest.config.js` en `backend/producer` con `coverageThreshold` (95% stmts)
- [ ] Actualizar `jest.config.js` en `backend/consumer` con `coverageThreshold` (95% stmts) y exclusiones de módulos/schemas
- [ ] Actualizar `jest.config.ts` en `frontend` con `coverageThreshold` (90% stmts)
- [ ] Ejecutar cobertura baseline en frontend: `npx jest --coverage --forceExit`

### Fase 1 — Backend Producer (82.92% → 95%) — Prioridad Alta

#### 1A. Use Cases (impacto +8%)
- [ ] `test/src/application/use-cases/doctor.service.impl.spec.ts` — Tests para: `getDoctors()`, `getDoctorById()`, `createDoctor()`, `updateDoctor()`, `deleteDoctor()`. Mock de `DoctorRepository`. Cubrir líneas 33-115.
- [ ] `test/src/application/use-cases/office.service.impl.spec.ts` — Ampliar tests existentes: `create()`, `update()`, `disable()`, `getByCriteria()`, `seedOffices()` (50 → 95%). Cubrir líneas 50, 66-95, 113, 129-192.

#### 1B. Infraestructura — Adaptadores (impacto +5%)
- [ ] `test/src/infrastructure/adapters/outbound/firebase-auth.adapter.spec.ts` — Mock `firebase-admin/auth`. Tests para: `verifyIdToken()` (happy path, token expirado, token malformado), `getUser()` (existente, no encontrado). Cubrir líneas 34-155.
- [ ] `test/src/infrastructure/adapters/outbound/mongoose-doctor.repository.spec.ts` — CRUD completo con mock de Mongoose Model. Cubrir líneas 19-78.
- [ ] `test/src/infrastructure/adapters/outbound/mongoose-office.repository.spec.ts` — CRUD completo. Cubrir líneas 18-66.
- [ ] `test/src/infrastructure/adapters/outbound/mongoose-specialty.repository.spec.ts` — CRUD completo. Cubrir líneas 24-81.
- [ ] `test/src/infrastructure/adapters/outbound/rabbitmq-lifecycle-publisher.adapter.spec.ts` — Mock de channel. Tests para: `publish()` (happy path, error de conexión). Cubrir líneas 13-47.
- [ ] `test/src/infrastructure/adapters/outbound/rabbitmq-doctor-publisher.adapter.spec.ts` — Mock de channel. Cubrir líneas 1-27.

#### 1C. Domain Commands (impacto +0.2%)
- [ ] `test/src/domain/commands/cancel-appointment.command.spec.ts` — Constructor y getters.
- [ ] `test/src/domain/commands/complete-appointment.command.spec.ts` — Constructor y getters.

#### 1D. Spots menores (impacto +1%)
- [ ] `test/src/specialties/specialties.controller.spec.ts` — Ampliar: tests para `getAll()`, `getById()`, `create()`, `update()`, `delete()`. Cubrir líneas 45, 54-55, 69-72, 90-91, 109-118.

### Fase 2 — Backend Consumer (66.70% → 95%) — Prioridad Alta

#### 2A. Controller + Use Cases (impacto +12%)
- [ ] `test/src/consumer.controller.spec.ts` — Ampliar: tests para `handleCompleteAppointment()` (happy path + error), `handleCancelAppointment()` (happy path + error). Cubrir líneas 82-114.
- [ ] `test/src/application/use-cases/cancel-appointment.use-case.impl.spec.ts` — Tests para: `execute()` happy path, appointment no encontrada, appointment ya cancelada. Cubrir líneas 9-29.
- [ ] `test/src/application/use-cases/complete-appointment.use-case.impl.spec.ts` — Tests para: `execute()` happy path, appointment no encontrada, appointment ya completada. Cubrir líneas 10-39.

#### 2B. Event Handlers (impacto +5%)
- [ ] `test/src/application/event-handlers/auto-assign.handler.spec.ts` — Tests para: lógica de auto-asignación cuando hay doctores disponibles, cuando no hay doctores, cuando no hay pacientes esperando. Cubrir líneas 1-79.

#### 2C. Domain (impacto +3%)
- [ ] `test/src/domain/entities/doctor.entity.spec.ts` — Ampliar: tests para constructor, `checkIn()`, `checkOut()`, `isAvailable()`. Cubrir líneas 24-40, 49.

#### 2D. Infraestructura Persistence (impacto +4%)
- [ ] `test/src/infrastructure/persistence/mongoose-doctor.repository.spec.ts` — CRUD con mock de Mongoose Model. Cubrir líneas 1-45.
- [ ] `test/src/infrastructure/persistence/mongoose-office.repository.spec.ts` — CRUD con mock. Cubrir líneas 1-21.
- [ ] `test/src/infrastructure/persistence/mongoose-audit.adapter.spec.ts` — Tests para `save()` y `findAll()`. Cubrir líneas 1-21.
- [ ] `test/src/infrastructure/persistence/doctor.mapper.spec.ts` — Tests para `toDomain()` y `toPersistence()`. Cubrir líneas 1-10.

#### 2E. Configuración de exclusiones
- [ ] Actualizar `jest.config.js` del consumer para excluir `*.module.ts`, `*.schema.ts`, `*.schema.d.ts` e `index.ts` de `collectCoverageFrom`.

### Fase 3 — Frontend (estimado 70% → 90%) — Prioridad Alta

#### 3A. Medición baseline
- [ ] Ejecutar `npx jest --coverage --forceExit` en frontend y documentar resultado exacto.

#### 3B. Services sin tests (impacto +3-5%)
- [ ] `test/services/profileService.spec.ts` — Tests para: `getProfile()`, `updateProfile()`, `createProfile()`. Mock de httpClient.
- [ ] `test/services/specialtyService.spec.ts` — Tests para: `getSpecialties()`, `createSpecialty()`, `updateSpecialty()`. Mock de httpClient.
- [ ] `test/services/authService.spec.ts` — Tests para: `signIn()`, `signUp()`, `getIdToken()`. Mock de Firebase Auth.

#### 3C. Contextos sin tests (impacto +2-3%)
- [ ] `test/components/ThemeProvider.spec.tsx` — Tests para: render con tema claro, toggle a oscuro, persistencia de preferencia.
- [ ] `test/components/AuthProvider.spec.tsx` — Tests para: render con usuario autenticado, render sin usuario, refresh de token.

#### 3D. Componentes sin tests (impacto +3-4%)
- [ ] `test/components/SpecialtyManager.spec.tsx` — Tests para: render lista, crear especialidad, editar, eliminar.
- [ ] `test/components/OfficeSelector.spec.tsx` — Tests para: render opciones, selección, estado disabled.
- [ ] `test/components/DoctorSelectorField.spec.tsx` — Tests para: render opciones de doctor, selección, loading state.

#### 3E. Páginas sin tests (impacto +2-3%)
- [ ] `test/app/waiting-room/page.spec.tsx` — Tests para: render con datos, render vacío, loading state, WebSocket connection.
- [ ] `test/app/doctor/layout.spec.tsx` — Tests para: render con auth, redirect sin auth.

#### 3F. Utilidades sin tests (impacto +1%)
- [ ] `test/lib/sanitize.spec.ts` — Tests para: sanitización de strings, prevención de XSS, edge cases (null, undefined, strings vacíos).

### Fase 4 — Verificación Final

- [ ] Ejecutar `npm run test:cov -- --forceExit` en `backend/producer` — verificar ≥ 95%
- [ ] Ejecutar `npm run test:cov -- --forceExit` en `backend/consumer` — verificar ≥ 95%
- [ ] Ejecutar `npx jest --coverage --forceExit` en `frontend` — verificar ≥ 90%
- [ ] Confirmar que CI pipeline pasa en verde  
- [ ] Sin regresiones en tests existentes (313 producer + 411 consumer + frontend)

### Resumen de Esfuerzo

| Fase | Área | Tests nuevos aprox. | Esfuerzo | Impacto |
|------|------|---------------------|----------|---------|
| 0 | Config | 0 | 30 min | Baseline + thresholds |
| 1 | Producer | ~60 tests | 6-8 hrs | 82.92% → 95%+ |
| 2 | Consumer | ~50 tests | 6-8 hrs | 66.70% → 95%+ |
| 3 | Frontend | ~40 tests | 6-8 hrs | ~70% → 90%+ |
| 4 | Verificación | 0 | 1 hr | Validación final |
| **Total** | | **~150 tests** | **20-25 hrs** | **95%+ backend, 90%+ frontend** |
