# Plan de Cobertura de Pruebas — Objetivo 95%

**Fecha:** 7 de abril de 2026  
**Estado actual:** Backend Producer 82.92% | Backend Consumer 66.7%  
**Meta global:** 95% de cobertura

---

## Resumen Ejecutivo

| Área | Cobertura Actual | Delta para 95% | Prioridad | ETA |
|------|-----------------|----------------|-----------|-----|
| Backend Producer | 82.92% | +12.08% | 🔴 Alta | 4–6 hrs |
| Backend Consumer | 66.7% | +28.3% | 🔴 Crítica | 8–12 hrs |
| Frontend | Por medir | TBD | 🟡 Media | 6–8 hrs |
| **Global** | ~75% | **+20%** | 🔴 **Crítica** | **20–30 hrs** |

---

## 1. Backend Producer — Gaps Críticos (82.92% → 95%)

### 1.1 Archivos sin cobertura (0% — Impacto Media)

| Archivo | Líneas | Razón | Tests Necesarios |
|---------|--------|-------|-----------------|
| `src/domain/commands/cancel-appointment.command.ts` | 5 | No testeado | Crear mapper/constructor |
| `src/domain/commands/complete-appointment.command.ts` | 5 | No testeado | Crear mapper/constructor |

**Esfuerzo:** 30 min | **Impacto:** ~0.2%

### 1.2 Baja cobertura (<50% — Impacto Alto)

| Archivo | % Actual | Líneas sin cobertura | Tests Faltantes |
|---------|----------|----------------------|-----------------|
| `src/application/use-cases/doctor.service.impl.ts` | 13.95% | 33-115 | Cobertura de métodos públicos: `getDoctors`, `assignDoctor`, `fireDoctor` |
| `src/application/use-cases/office.service.impl.ts` | 50.94% | 50, 66-95, 113, 129-192 | Tests para: `create`, `update`, `disable`, `getByCriteria`, `seedOffices` |
| `src/infrastructure/adapters/firebase-auth.adapter.ts` | 9.83% | 34-155 | Mock Firebase; tests para verificación de token, gestión de UID |
| `src/infrastructure/adapters/mongoose-doctor.repository.ts` | 21.21% | 19-78 | CRUD completo: `findAll`, `findById`, `create`, `update` |
| `src/infrastructure/adapters/mongoose-office.repository.ts` | 24.13% | 18-66 | CRUD completo: `findAll`, `findById`, `create`, `update` |
| `src/infrastructure/adapters/mongoose-specialty.repository.ts` | 25.8% | 24-81 | CRUD completo: `findAll`, `create`, `update` |

**Esfuerzo:** 6–8 hrs | **Impacto:** ~+10–15%

### 1.3 Cobertura Media (50–80% — Impacto Bajo)

| Archivo | % Actual | Rutas faltantes |
|---------|----------|-----------------|
| `src/dto/audit-log-query.dto.ts` | 50% | Validate para casos edge |
| `src/auth/guards/firebase-token-only.guard.ts` | 95.45% | Ruta de error (line 66) |

**Esfuerzo:** 1–2 hrs | **Impacto:** ~+1%

### **Actions para Producer**

```markdown
1. [CORE] DoctorService — cobertura métodos CRUD
   - Setup: jest.mock de MongoDB
   - Tests: `getDoctors()`, `assignDoctor()`, `fireDoctor()`
   - Archivo: test/src/application/use-cases/doctor.service.impl.spec.ts
   - Esfuerzo: 2 hrs

2. [CORE] OfficeService — cobertura métodos CRUD
   - Tests: `create()`, `update()`, `disable()`, `getByCriteria()`, `seedOffices()`
   - Archivo: test/src/application/use-cases/office.service.impl.spec.ts
   - Esfuerzo: 2 hrs

3. [INFRA] Firebase Auth Adapter
   - Mock de credenciales reales
   - Tests para verificación de idToken, manejo de expiración
   - Archivo: test/src/infrastructure/adapters/firebase-auth.adapter.spec.ts
   - Esfuerzo: 2 hrs

4. [INFRA] Repository CRUD
   - Mongoose Doctor, Office, Specialty repositories
   - Tests para findAll, findById, create, update
   - Archivos: test/src/infrastructure/adapters/mongoose-*.repository.spec.ts
   - Esfuerzo: 2 hrs (paralelo)

5. [MINOR] Commands
   - Constructor y mappers para CancelAppointment/CompleteAppointment
   - Archivo: test/src/domain/commands/*.command.spec.ts
   - Esfuerzo: 30 min
```

---

## 2. Backend Consumer — Gaps Críticos (66.7% → 95%)

### 2.1 Archivos sin cobertura (0% — Impacto Alto)

| Archivo | Líneas | Razón | Tests Necesarios |
|---------|--------|-------|-----------------|
| `src/consumer.controller.ts` | 141 | Métodos solo para handlers | Cobertura de `handleCompleteAppointment`, `handleCancelAppointment` |
| `src/application/event-handlers/auto-assign.handler.ts` | 79 | No invocado en tests | Tests para lógica de auto-asignación |
| `src/appointments/use-cases/use-cases.module.ts` | 137 | No testeado (módulo) | Inyección de dependencias |
| `src/appointments/repositories/repositories.module.ts` | 131 | No testeado (módulo) | Inyección de dependencias |
| `src/appointments/infrastructure/infrastructure.module.ts` | 56 | No testeado (módulo) | Inyección de dependencias |
| `src/appointments/policies/policies.module.ts` | 35 | No testeado (módulo) | Inyección de dependencias |
| `src/domain/ports/inbound/office-service.port.ts` | 38 | Puerto (interfaz) | Tests de implementación; considerar como indirecto |
| `src/appointments/use-cases/cancel-appointment.use-case.impl.ts` | 29 | Lógica no invocada | Tests para cancelación |
| `src/appointments/use-cases/complete-appointment.use-case.impl.ts` | 39 | Lógica no invocada | Tests para finalización |
| `src/infrastructure/adapters/rabbitmq-doctor-publisher.adapter.ts` | 27 | No implementado/invocado | Tests o excluir del objetivo |
| `src/infrastructure/adapters/rabbitmq-lifecycle-publisher.adapter.ts` | 47 | Bajo uso | Tests para publicación de lifecycle |
| `src/infrastructure/persistence/mongoose-doctor.repository.ts` | 45 | No usado | Tests CRUD doctor o excluir |
| `src/infrastructure/persistence/mongoose-office.repository.ts` | 21 | No usado | Tests CRUD office o excluir |
| `src/infrastructure/persistence/doctor.mapper.ts` | 10 | No usado/mapeador | Tests mapper |
| `src/notifications/notifications.module.ts` | 32 | No testeado (módulo) | Inyección de dependencias |
| `src/schemas/audit-log.schema.ts` | 64 | Schema Mongoose | Tests de validación de schema o excluir |
| `src/schemas/doctor.schema.ts` | 37 | Schema Mongoose | Tests de validación de schema o excluir |
| `src/schemas/office.schema.ts` | 20 | Schema Mongoose | Tests de validación de schema o excluir |

**Subtotal 0%:** ~1350 líneas. Impacto: **+20%** si se cubren todos.

### 2.2 Baja cobertura (<50% — Impacto Alto)

| Archivo | % Actual | Líneas sin cobertura | Tests Faltantes |
|---------|----------|----------------------|-----------------|
| `src/application/event-handlers/auto-assign.handler.ts` | 0% | 1-79 | Tests para lógica de asignación reactiva |
| `src/applications/use-cases/cancel-appointment.use-case.impl.ts` | 0% | 9-29 | Tests para cancelación |
| `src/applications/use-cases/complete-appointment.use-case.impl.ts` | 0% | 10-39 | Tests para finalización |
| `src/specialties/specialties.controller.ts` | 61.53% | 45, 54-55, 69-72, 90-91 | Tests para métodos de get/post/patch |
| `src/domain/entities/doctor.entity.ts` | 58.82% | 24-40, 49 | Constructor y métodos de doctor |

**Esfuerzo:** 4–6 hrs | **Impacto:** ~+12–18%

### 2.3 Decisión: Módulos + Schemas

**Opción A (Estricto):** Cobrir módulos y schemas (~200 líneas adicionales)  
- Esfuerzo: 2 hrs  
- Impacto: ~+2%

**Opción B (Pragmático):** Excluir modules y schemas generados del objetivo (recommended)  
- Esfuerzo: Actualizar `jest.config.js` para omitir cobertura  
- Impacto: Permite enfocarse en lógica crítica

### **Actions para Consumer**

```markdown
1. [CORE] ConsumerController — handleCompleteAppointment + handleCancelAppointment
   - Tests para ambos handlers
   - Archivo: test/src/consumer.controller.spec.ts (ampliar)
   - Esfuerzo: 1 hr

2. [CORE] Appointment Use Cases — Cancelación y Finalización
   - Tests para cancel-appointment.use-case.impl.ts
   - Tests para complete-appointment.use-case.impl.ts
   - Archivos: test/src/appointments/use-cases/cancel-appointment.use-case.impl.spec.ts
   - Esfuerzo: 2 hrs

3. [CORE] Auto-Assign Handler
   - Tests para lógica de asignación reactiva
   - Archivo: test/src/application/event-handlers/auto-assign.handler.spec.ts
   - Esfuerzo: 2 hrs

4. [DOMAIN] Doctor Entity
   - Tests para constructor y métodos
   - Archivo: test/src/domain/entities/doctor.entity.spec.ts
   - Esfuerzo: 1 hr

5. [INFRA] Adapters — Lifecycle/Doctor Publishers
   - Tests para rabbitmq-lifecycle-publisher, rabbitmq-doctor-publisher
   - Esfuerzo: 1.5 hrs

6. [CONTROLLER] SpecialtiesController
   - Tests para métodos faltantes (get, post, patch)
   - Archivo: test/src/specialties/specialties.controller.spec.ts
   - Esfuerzo: 1 hr

7. [CONFIG] Excluir módulos + schemas de cobertura
   - Actualizar jest.config.js: `collectCoverageFrom` excluyendo **/*.module.ts y **/*.schema.ts
   - Esfuerzo: 15 min
```

---

## 3. Frontend — Medición e Intervenciones (Por completar)

**Pasos:**
1. Ejecutar `npm run test:cov` en frontend/
2. Analizar el reporte en `coverage/` y extraer archivos con <50%
3. Priorizar componentes interactivos (Forms, Dialogs, Lists) sobre utilities puras

**Placeholder cálculo:**
- Asumiendo ~60% actual → +35% para llegar a 95%
- Esfuerzo estimado: 6–8 hrs

---

## 4. Road Map Priorizado — 24–30 horas totales

### Fase 1 (Día 1 — 8 hrs) — **Producer + Consumer Core**

| Tarea | Duración | Prioridad | Archivo/Caso |
|-------|----------|-----------|-------------|
| ConsumerController handlers | 1 hr | 🔴 | handleCompleteAppointment, handleCancelAppointment |
| Appointment Cancel/Complete Use Cases | 2 hrs | 🔴 | cancel-appointment, complete-appointment |
| Auto-Assign Handler | 2 hrs | 🔴 | auto-assign.handler |
| DoctorService CRUD | 2 hrs | 🔴 | doctor.service.impl |
| OfficeService CRUD | 1.5 hrs | 🔴 | office.service.impl |

**Resultado esperado:** Producer ~90%, Consumer ~85% | **Global: ~88%**

### Fase 2 (Día 2 — 8 hrs) — **Producer Infra + Commands**

| Tarea | Duración | Prioridad | Archivo/Caso |
|-------|----------|-----------|-------------|
| Firebase Auth Adapter | 2 hrs | 🔴 | firebase-auth.adapter |
| Repository CRUD (Doctor/Office/Specialty) | 2 hrs | 🔴 | mongoose-*.repository |
| Commands (Cancel/Complete) | 0.5 hr | 🟡 | domain/commands |
| SpecialtiesController | 1 hr | 🟡 | specialties.controller |
| Doctor Entity | 1 hr | 🟡 | doctor.entity |
| Configuration (exclude modules/schemas) | 0.5 hr | 🔴 | jest.config.js |

**Resultado esperado:** Producer ~94%, Consumer ~92% | **Global: ~93%**

### Fase 3 (Día 3 — 8 hrs) — **Consumer Infra + Frontend**

| Tarea | Duración | Prioridad | Archivo/Caso |
|-------|----------|-----------|-------------|
| RabbitMQ Adapters (Lifecycle/Doctor) | 1.5 hrs | 🟡 | rabbitmq-*-publisher |
| Mongoose Persistence (Doctor/Office) | 1 hr | 🟡 | mongoose-doctor/office.repository |
| Doctor Mapper | 0.5 hr | 🟡 | doctor.mapper |
| Frontend Investigation + High-Impact Tests | 4 hrs | 🔴 | frontend/src (Forms, Dialogs, Lists) |
| Final verification + integration tests | 1 hr | 🔴 | CI pipeline |

**Resultado esperado:** Producer ~95%+, Consumer ~95%+, Frontend ~??% | **Global: 95%+**

---

## 5. Criterios de Aceptación

- ✅ Producer ≥ 95%
- ✅ Consumer ≥ 95%
- ✅ Frontend ≥ 90% (línea base por completar)
- ✅ Sin regresiones en tests existentes
- ✅ Coverage report generado y verificado en CI

---

## 6. Comandos de Referencia

### Backend Producer
```bash
cd backend/producer
npm run test:cov -- --forceExit
# Revisar coverage/index.html
```

### Backend Consumer
```bash
cd backend/consumer
npm run test:cov -- --forceExit
# Revisar coverage/index.html
```

### Frontend
```bash
cd frontend
npm run test:cov
# Revisar coverage/index.html o console output
```

### Ejecutar suite completa localmente
```bash
npm run test:cov -w backend/producer && \
npm run test:cov -w backend/consumer && \
npm run test:cov -w frontend
```

---

## 7. Notas y Consideraciones

1. **Módulos NestJS:** Opcionar excluir `*.module.ts` de cobertura; son fundamentalmente inyección de dependencias.
2. **Schemas Mongoose:** Generados/auto-documentados; considerar excluir de coverage.
3. **Firebase Auth:** Requiere mock estratégico; usar `jest.mock()` o inyección de dependencias.
4. **RabbitMQ:** Publishers requieren mock de conexión; verificar si ya existen en test setup.
5. **Paralelización:** Fase 1 y 2 pueden correr en paralelo (producer + consumer independientes).

---

**Próximos pasos:**
1. Equipo selecciona Fase 1 para arrancar
2. Revisa y aprueba Opciones A vs B para Consumer (módulos + schemas)
3. Medir frontend y ajustar plan
4. Iniciar Sprint de tests

