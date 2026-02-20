---
name: refactor-arch (Senior Level)
description: Refactorización avanzada hacia Hexagonal Architecture, aplicando SOLID, patrones de diseño y análisis de trade-offs técnicos.
trigger: When feedback mentions architecture refactoring, hexagonal architecture, SOLID principles, design patterns, ports and adapters, domain isolation, coupling, decoupling, or dependency inversion.
scope: backend/producer/src/, backend/consumer/src/, frontend/src/
author: "IA_P1_Fork Team"
version: "2.0.0 (Senior Grade)"
license: "MIT"
autoinvoke: true
---

# Skill: Architecture Refactoring (Senior Grade)

## Context

Este proyecto exige una **arquitectura de grado empresarial**: desacoplada, testeable, mantenible y lista para escalar. No se aceptan soluciones "código spaghetti".

- **Arquitectura Hexagonal**: Puertos y Adaptadores estrictos.
- **SOLID**: El estándar mínimo aceptable.
- **Patrones de Diseño**: Uso consciente de patrones creacionales, estructurales y de comportamiento.

### Arquitectura objetivo

```
src/
├── domain/              ← Núcleo puro (sin imports de infraestructura)
│   ├── entities/        ← Entidades de dominio (Appointment, Office)
│   ├── value-objects/   ← Objetos de valor (IdCard, Priority)
│   ├── ports/           ← Interfaces (contratos)
│   │   ├── inbound/     ← Puertos de entrada (use cases)
│   │   └── outbound/    ← Puertos de salida (repositorios, messaging)
│   └── services/        ← Lógica de dominio pura
├── application/         ← Casos de uso (orquestación)
│   ├── use-cases/       ← Implementaciones de puertos inbound
│   └── dtos/            ← Data Transfer Objects
├── infrastructure/      ← Adaptadores concretos
│   ├── persistence/     ← Mongoose models, repositories
│   ├── messaging/       ← RabbitMQ adapters
│   ├── web/             ← Controllers, WebSocket Gateways
│   └── config/          ← NestJS modules, providers
```

## Rules

### Separación estricta de capas

1. **domain/** NO puede importar de `infrastructure/`, `@nestjs/*`, `mongoose`, `amqplib`, ni ninguna librería de infraestructura.
2. **application/** puede importar de `domain/` pero NO de `infrastructure/`.
3. **infrastructure/** implementa los puertos definidos en `domain/ports/`.
4. Toda dependencia fluye hacia adentro: `infra → app → domain`.

### Principios SOLID obligatorios

| Principio | Aplicación                                                                                |
| --------- | ----------------------------------------------------------------------------------------- |
| **SRP**   | Cada clase tiene una única responsabilidad. Separar lógica de negocio de orquestación.    |
| **OCP**   | Nuevas features se agregan creando nuevos adaptadores, no modificando el dominio.         |
| **LSP**   | Los adaptadores deben cumplir el contrato del puerto sin alterar comportamiento esperado. |
| **ISP**   | Interfaces de puertos pequeñas y específicas. No forzar implementaciones innecesarias.    |
| **DIP**   | El dominio define interfaces (puertos). La infraestructura las implementa (adaptadores).  |

### Patrones de diseño a aplicar

| Categoría          | Patrón                  | Uso en el proyecto                                           |
| ------------------ | ----------------------- | ------------------------------------------------------------ |
| **Creacional**     | Factory                 | Crear entidades de dominio con validación encapsulada        |
| **Creacional**     | Singleton               | NestJS `@Injectable()` — instancia única de servicios        |
| **Creacional**     | Builder                 | Construcción de queries complejos paso a paso                |
| **Estructural**    | Repository              | Abstraer persistencia detrás de un puerto de salida          |
| **Estructural**    | Adapter                 | Conectar infraestructura (Mongoose, RabbitMQ) a los puertos  |
| **Estructural**    | Facade                  | Use Cases simplifican la orquestación de múltiples servicios |
| **Estructural**    | Decorator               | DTOs con `class-validator` — validación declarativa          |
| **Estructural**    | Proxy                   | Logging/caching automático sobre repositorios                |
| **Comportamiento** | Observer                | Notificaciones WebSocket vía eventos de dominio              |
| **Comportamiento** | Strategy                | Estrategias de ack/nack en consumer según tipo de error      |
| **Comportamiento** | Command                 | Mensajes RabbitMQ como comandos serializados                 |
| **Comportamiento** | Chain of Responsibility | NestJS Pipeline (Guards → Pipes → Controllers)               |
| **Comportamiento** | State                   | Transiciones de `AppointmentStatus` con validación           |
| **Comportamiento** | Template Method         | Flujo base de procesamiento de mensajes                      |
| **Comportamiento** | Mediator                | NestJS Modules como coordinadores de dependencias            |

> **Referencia completa:** Ver `assets/docs/architecture-patterns-catalog.md` para definiciones, ejemplos de código y justificaciones técnicas de cada patrón.

### Convenciones

- Agregar `// HUMAN CHECK` en cada decisión de separación de capas.
- Documentar qué patrón se usa y por qué en cada archivo con un comentario `// Pattern: <nombre> — <justificación>`.
- Nombres de puertos descriptivos: `AppointmentRepository`, `MessagePublisher`, `NotificationGateway`.

## Tools Permitted

- **Read/Write:** Archivos dentro del scope definido en `backend/*/src/` y `frontend/src/`
- **Explore:** `grep`/`glob` para detectar imports prohibidos cruzando capas
- **Terminal:** `npm run build`, `npm run test`, `npm run lint`

## Workflow

### Paso 1 — Diagnóstico de acoplamiento

```bash
# Detectar imports de infraestructura en lógica de negocio
grep -rn "import.*mongoose\|import.*@nestjs\|import.*amqplib" backend/*/src/
```

### Paso 2 — Definir puertos (interfaces)

Crear las interfaces en `domain/ports/` antes de mover código:

```typescript
// domain/ports/outbound/appointment.repository.ts
export interface AppointmentRepository {
  save(appointment: Appointment): Promise<Appointment>;
  findByIdCard(idCard: number): Promise<Appointment | null>;
  findPending(): Promise<Appointment[]>;
}
```

### Paso 3 — Extraer entidades de dominio

Mover entidades de los schemas de Mongoose a clases puras en `domain/entities/`:

```typescript
// domain/entities/appointment.entity.ts
// Pattern: Entity — Clase de dominio sin dependencias de infraestructura
export class Appointment {
  constructor(
    public readonly idCard: number,
    public readonly fullName: string,
    public readonly priority: Priority,
    public status: AppointmentStatus = AppointmentStatus.PENDING,
  ) {}
}
```

### Paso 4 — Crear adaptadores

Implementar los puertos con las tecnologías concretas:

```typescript
// infrastructure/persistence/mongoose-appointment.repository.ts
// Pattern: Adapter + Repository — Implementa el puerto con Mongoose
@Injectable()
export class MongooseAppointmentRepository implements AppointmentRepository {
  constructor(
    @InjectModel("Appointment") private model: Model<AppointmentDocument>,
  ) {}

  async save(appointment: Appointment): Promise<Appointment> {
    const doc = await this.model.create(appointment);
    return this.toDomain(doc);
  }
}
```

### Paso 5 — Verificar aislamiento

```bash
# El dominio NO debe tener imports de infraestructura
grep -rn "import.*mongoose\|import.*@nestjs\|import.*amqplib" backend/*/src/domain/
# Resultado esperado: 0 matches
```

### Paso 6 — Tests unitarios puros

Los tests deben mockear los puertos de salida, no las implementaciones concretas.

### Paso 7 — Resumen de Acción

Entregar resumen usando `skills/action-summary-template.md`.

## Assets

- `assets/templates/hexagonal-structure.md` — Estructura de directorios de referencia
- `assets/docs/solid-checklist.md` — Checklist de verificación SOLID por componente
- `assets/docs/architecture-patterns-catalog.md` — Catálogo completo: 4 arquitecturas + 14 patrones de diseño con ejemplos
