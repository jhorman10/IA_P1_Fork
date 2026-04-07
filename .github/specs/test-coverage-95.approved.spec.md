---
id: SPEC-025
status: APPROVED
feature: test-coverage-95
created: 2026-04-07
updated: 2026-04-07
author: spec-generator
version: "1.0"
related-specs: []
---

# Spec: Plan de Pruebas para Cobertura ≥ 95%

> **Estado:** `APPROVED` → iniciar implementación según flujo ASDD.
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

| Categoria | Archivos | % Stmts Actual | Meta |
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
| `src/services/profileService.ts` | Service | ❌ No encontrado | 🔴 |
| `src/services/specialtyService.ts` | Service | ❌ No encontrado | 🔴 |
| `src/app/waiting-room/page.tsx` | Page | ❌ No encontrado | 🔴 |
| `src/app/admin/layout.tsx` | Layout | Parcial en dep-layout spec | 🟡 |
| `src/app/doctor/layout.tsx` | Layout | ❌ No encontrado | 🔴 |
| `src/app/layout.tsx` | Layout | Parcial in dep-layout spec | 🟡 |
| `src/components/SpecialtyManager/SpecialtyManager.tsx` | Component | ❌ No encontrado | 🔴 |
| `src/components/DoctorStatusCard/OfficeSelector.tsx` | Component | Parcial in DoctorStatusCard.spec | 🟡 |
| `src/components/ProfileFormModal/DoctorSelectorField.tsx` | Component | Parcial in ProfileFormModal.spec | 🟡 |
| `src/proxi.ts` | Proxy config | `httpClient.proxi.coverage.spec.ts` | ✅ |
| `src/infrastructure/adapters/HttpAppointmentAdapter.ts` | Adapter | `adapters.coverage.spec.ts` | ✅ |
| `src/infrastructure/adapters/SocketIoAdapter.ts` | Adapter | `adapters.coverage.spec.ts` | ✅ |

### 2.2 Estrategia de Testing

... (truncated for brevity)
