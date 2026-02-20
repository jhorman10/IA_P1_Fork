# Auditoria hostil MVP — Reporte completo

**Auditor:** Staff Engineer / Principal Architect (Senior Hostil)
**Fecha:** 2026-02-20
**Veredicto Final:** **MVP CONDICIONAL** (62/100)
**Blocker Crítico:** Token WebSocket hardcodeado — REQUIERE REMEDIACIÓN INMEDIATA

---

## 1. Scorecard por area

| Área                 | Puntuación | Peso | Evaluación                                                       | Status              |
| -------------------- | :--------: | :--: | ---------------------------------------------------------------- | ------------------- |
| **Arquitectura**     |   88/100   | 25%  | Hexagonal Architecture clara, SRP bien aplicado, sin God Objects | BIEN                |
| **SOLID Principles** |   85/100   | 25%  | DIP perfecto, OCP bajo switch/case, LSP respetado, ISP segregado | BIEN                |
| **Testing Coverage** |   42/100   | 20%  | Backend 23 specs (bueno), Frontend 0 specs (crítico)             | CRITICAL            |
| **Infraestructura**  |   65/100   | 15%  | 4 healthchecks OK, pero 1 blocker crítico de seguridad           | WARNING             |
| **UX/UI Experience** |   70/100   | 15%  | CSS Modules OK, error handling OK, loading states 6% cobertura   | WARNING             |
| **TOTAL MVP SCORE**  | **62/100** |  —   | **MVP CONDICIONAL**                                              | ACEPTAR CON RIESGOS |

---

## 2. Hallazgos Críticos & Altos

### 2.1 H-S1: Token WebSocket hardcodeado (BLOCKER CRITICAL)

**Archivo:** `backend/producer/src/common/guards/ws-auth.guard.ts:27`

**Código Ofensivo:**

```typescript
const validToken =
  this.configService.get<string>("WS_AUTH_TOKEN") || "elite-hardened-token";
```

**Impacto:**

- Cualquiera puede conectarse conociendo el token: `'elite-hardened-token'`
- Permite acceso no autorizado a actualizaciones de turnos en tiempo real
- Incumple estándares mínimos de seguridad
- **SEVERITY:** CRITICAL — Falla de seguridad perimetral

**Solución Inmediata (5 minutos):**

```typescript
const validToken = this.configService.getOrThrow<string>("WS_AUTH_TOKEN");
// Si WS_AUTH_TOKEN no existe, falla en startup → Docker health check lo detecta
```

**Verificación:** `grep -rn "elite-hardened-token" backend/` → Reemplazar por variable `.env` obligatoria.

---

### 2.2 H-T1: Testing Frontend = 0% (HIGH)

**Métrica:** 0 archivos `.spec.ts` en `frontend/src/`

**Archivos en Riesgo (0 tests cada uno):**

- `frontend/src/app/dashboard/page.tsx` (137 líneas)
- `frontend/src/app/page.tsx` (117 líneas)
- `frontend/src/hooks/useAppointmentRegistration.ts` (107 líneas)
- `frontend/src/hooks/useAppointmentsRealtime.ts` (124 líneas)
- `frontend/src/hooks/useAppointmentsWebSocket.ts` (98 líneas)
- 15+ componentes sin cobertura

**Impacto:**

- Cambios en frontend sin validación automática
- Regressions no detectadas
- Hooks complejos sin unit tests

**Remediación:** Crear 15-20 archivos `.spec.ts` con Jest (estimado 12 horas)

---

### 2.3 H-U1: Loading states incompletos (HIGH)

**Métrica:** 3 instancias de loading states vs ~50 async points

**Coverage:** 3/50 = **6%**

**Locations de Async sin feedback:**

- WebSocket reconnection (useAppointmentsWebSocket.ts)
- Dashboard appointments fetch (dashboard/page.tsx)
- Form submissions (AppointmentRegistrationForm)
- Real-time updates (useAppointmentsRealtime.ts)

**Impacto:** UX pobre, usuarios no saben si aplicación está procesando

**Quick Win:** Agregar `isLoading && <Spinner />` en 10+ componentes (2-3 horas)

---

### 2.4 H-A1: Appointment Module monolitico (HIGH)

**Archivo:** `backend/consumer/src/appointments/appointment.module.ts` (113 líneas)

**Problema:** Módulo carga 8+ providers y configura directamente MongoDB

**Propuesta:** Dividir en sub-módulos:

- `policies.module.ts` (ConsultationPolicy)
- `repositories.module.ts` (Mongoose adapters)
- `use-cases.module.ts` (Application)

**Impacto:** Mejora testability, reduce acoplamiento

---

## 3. Validaciones Ejecutadas

### 3.1 Domain purity (DIP validado)

**Comando:** `grep -rn "import.*@nestjs|import.*mongoose" backend/*/src/domain/`
**Resultado:** 0 matches
**Conclusión:** Domain completamente puro, sin dependencias de frameworks.

---

### 3.2 SOLID compliance

| Principio | Validación                 | Resultado                   |
| --------- | -------------------------- | --------------------------- |
| **S**RP   | grep -rn "extends" domain/ | Solo 4 base classes legales |
| **O**CP   | grep -rn "switch\|case:"   | 2 instancias (bajo)         |
| **L**SP   | grep -rn "extends" domain/ | Herencia correcta           |
| **I**SP   | Interfaces segregadas      | Port/Adapter pattern        |
| **D**IP   | Constructor @Inject        | 0 `new` en domain           |

**Conclusión:** SOLID 85/100.

---

### 3.3 Arquitectura hexagonal

**Capas Validadas:**

- Domain: Policies, Value Objects, Entities, Events (SRP perfecto)
- Application: Use Cases, DTOs, Mappers (Clean)
- Infrastructure: Repositories, External Services, Persistence (Desacoplado)

**Separación:** Producer (REST API) ≠ Consumer (Workers/Queue).

---

### 3.4 Testing metrics

**Backend (Excelente):**

- 23 archivos `.spec.ts` encontrados
- Covers: Policies, Value Objects, Use Cases, Integration (MongoDB)
- Archivo más completo: `mongoose-appointment.repository.integration.spec.ts` (798 líneas)

**Frontend (Crítico):**

- 0 archivos `.spec.ts`
- 0 component tests
- 0 hook tests
- 0 integration tests

**Cobertura Total:** 42/100

---

### 3.5 Security check

**Comando:** `grep -rn "password|secret|apikey|token" backend/*/src | grep -v ".env"`

**Hallazgos:**

- Token hardcodeado en ws-auth.guard.ts:27 (**H-S1 BLOCKER**)
- Otros archivos usando `configService.get()` correctamente

---

### 3.6 Infrastructure

**Healthchecks (4/4 servicios):**

- Producer API
- Consumer Worker
- MongoDB
- RabbitMQ

**Negativos encontrados:**

- Rate limiting ausente
- Helmet security headers no detectados
- Logs no JSON-estructurados

---

## 4. Veredicto & Recomendaciones

### Verdict: MVP CONDICIONAL

**Aceptable si se remedian:**

1. **BLOCKER CRITICAL (H-S1):** Token hardcodeado → Fix inmediato (5 min)
2. **BLOCKER HIGH (H-T1):** Frontend sin tests → Planning 2 sprints (H-T2)
3. **BLOCKER HIGH (H-U1):** Loading states → Quick wins (H-U2)

**Timeline estimado:** 6-8 horas para blockers + 20 horas para deuda aceptada

---

### Top 3 Acciones Inmediatas

1. **FIX TOKEN (5 min):** `configService.getOrThrow('WS_AUTH_TOKEN')`
2. **ADD LOADING STATES (2-3 hrs):** Spinners en 10+ componentes
3. **PLAN FRONTEND TESTS (3-4 sprints):** 15+ tests para pages/hooks

---

## 5. Conclusión

MVP entrega arquitectura sólida (Hexagonal, SOLID, Event-Driven) pero con vulnerabilidad crítica de seguridad y testing desigual. Recomendación: **Aceptar con mitigaciones**, escalar H-S1 a team líder inmediatamente.

**Auditor:** Staff Engineer Hostil. 2. **Validación de Entorno:** - **Evidencia:** `src/config/env.ts` lanza errores explícitos si faltan variables `NEXT_PUBLIC_*`, evitando fallos silenciosos en el navegador.

---

## 4. Plan de Mejora Escalonado

### 1. Estrategia de IA & Transparencia

- **De 1 → 3:** Crear un archivo `PROMPT_LOG.md` donde se registren al menos las últimas 5 interacciones significativas con la IA.
- **De 3 → 5:** Implementar una sección en `AI_WORKFLOW.md` que detalle errores específicos de lógica resueltos (ej. "IA generó bucle infinito en useEffect, corregido con useRef").

### 2. Arquitectura & Docker

- **De 1 → 3:** Eliminar todos los valores por defecto de credenciales en el `yaml`.
- **De 3 → 5:** Implementar un Reverse Proxy (Nginx) y definir redes internas separadas para DB/Queue y App.

### 3. Calidad del codigo

- **De 1 → 3:** Sincronizar el formulario con el DTO del backend y aplicar diseño básico responsive (CSS Media Queries).
- **De 3 → 5:** Implementar Unit Tests para el hook `useTurnosWebSocket` y el servicio de sanitización.

---

**Veredicto Final:** El proyecto funciona pero es **FRÁGIL** y **OPACO** en su proceso de desarrollo. Requiere intervención inmediata en seguridad y trazabilidad.
