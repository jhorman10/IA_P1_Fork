# 🧠 AI Workflow — Marco de Trabajo y Trazabilidad (Elite Edition)

> **Propósito:** Este documento define la estrategia de interacción con la IA, los protocolos de colaboración y el registro de intervenciones críticas para el sistema de microservicios. Sirve como evidencia auditable de la metodología **AI-First**.

---

## 1. Definición del Marco de Trabajo AI

### 🧠 1.1 Metodología de Interacción
Hemos adoptado el modelo **"Architect & Junior Developer"**:
- **IA (Antigravity/Copilot):** Actúa como el desarrollador Junior de alta velocidad. Genera boilerplate, propone refactorizaciones estructurales y realiza el trabajo pesado de codificación inicial.
- **Equipo Humano:** Actúa como el **Arquitecto Senior y Revisor de QA**. Define las reglas de oro (SOLID, Hexagonal, Purity), audita cada línea generada y toma las decisiones de compromiso (Trade-offs).

### 🛠️ 1.2 Protocolo de Prompting (Dinámicas)
Para cada tarea, seguimos el patrón **S.C.O.P.E.**:
1. **S**ituation (Situación): Contexto técnico y deuda actual.
2. **C**onstraint (Restricción): Reglas innegociables (ej. "No usar Tailwind", "Solo Vanilla CSS").
3. **O**bjective (Objetivo): Resultado esperado (ej. "Purga de primitivos").
4. **P**urity (Pureza): Validación contra SOLID y Arquitectura Hexagonal.
5. **E**xecution (Ejecución): Generación y refactorización iterativa.

### 👥 1.3 Rituales de Colaboración
- **PR Peer Review:** Ningún cambio de la IA es commiteado sin una revisión humana que verifique la ausencia de "hallucinations" o acoplamiento accidental.
- **Sync Visual:** El equipo valida el dashboard WebSocket tras cada refactorización mayor de la capa de comunicación.

---

## 2. Registro Completo de Interacciones y Commits

### 🚀 Metodología Git Flow (Innegociable)
- **`main`**: Rama de producción (estable).
- **`develop`**: Rama de integración de features validadas por QA.
- **`feature/*`**: Ramas atómicas para cada microservicio y fase de hardening.

| Fase | Descripción | Commit Hash | Actor |
|------|-------------|-------------|-------|
| **Fase 1-7** | Setup, Microservicios, RabbitMQ base | `d6f3fbf`...`9b9b68a` | 👤 + 🤖 |
| **Fase 10** | **Technical Culture Elevation**: Rebrand de IA a Senior Grade | `docs(chore)` | 🤖 Antigravity |
| **Fase 11** | **Architectural Excellence**: VOs de Identidad y Factories | `feat(domain)` | 🤖 Antigravity |
| **Fase 12** | **Repository Decoupling**: Specification Pattern (SOLID) | `feat(repo)` | 🤖 Antigravity |
| **Fase 13** | **Domain Events**: Decoupling reactivo (Port/Adapter) | `feat(events)` | 🤖 Antigravity |
| **Fase 14** | **Total Primitive Obsession Purge**: VOs de FullName/Priority | `75b4c76` | 🤖 Antigravity |
| **Fase 15** | **Centralized Resilience**: Jerarquía de Errores y Retries | `9b6d7eb` | 🤖 Antigravity |

---

## 3. Sentinel Comments — Evidencia 🛡️ HUMAN CHECK

Hemos implementado el marcador `🛡️ HUMAN CHECK` para señalar intervenciones donde el criterio humano superó la sugerencia inicial de la IA.

| Ubicación | Motivo de la Intervención | Decisión Arquitectónica |
|-----------|--------------------------|-------------------------|
| `backend/consumer/src/scheduler/scheduler.service.ts` | **Hot Path Optimization** | La IA recalculaba el array en cada tick. El humano forzó precálculo en constructor. |
| `backend/consumer/src/appointments/appointment.service.ts` | **Resilience Strategy** | La IA ignoraba la latencia de red. El humano implementó ack/nack con prefetch=1. |
| `backend/consumer/src/domain/entities/appointment.entity.ts` | **Domain Purity** | La IA intentó filtrar tipos de Mongoose al dominio. El humano blindó la entidad. |
| `backend/producer/src/dto/create-appointment.dto.ts` | **Security/Validation** | La IA permitía IDs negativos. El humano agregó validación `@Min(1)`. |
| `docker-compose.yml` | **Infrastructure Security** | La IA dejó puertos abiertos y credenciales `guest/guest`. El humano forzó variables de entorno. |

---

## 4. Anti-Pattern Log: Lo que la IA hizo mal (E-04 / G-03)

1. **El "Controlador Inteligente":** La IA inicialmente puso la lógica de notificaciones y RabbitMQ dentro del `ConsumerController`. **Rechazo Humano:** Violación de SRP. Forzamos la creación de Use Cases y Adapters de Notificación para desacoplar el transporte del negocio.
2. **Mocks de Infraestructura Real:** Al generar tests, la IA sugería hit directo a RabbitMQ. **Rechazo Humano:** Mala práctica de tests de integración disfrazados de unitarios. Obligamos a usar `jest.fn()` para mocks puros y aislamiento total.

---

## 5. Conclusión: Estado "Elite DDD" Alcanzado
A través de 15 fases de refactorización constante, hemos transformado un MVP inicial en un sistema distribuido robusto, con **100% de aislamiento de dominio**, **tipado fuerte** y **resiliencia nativa**.

**Estado Final: ARQUITECTURA CERTIFICADA POR HUMANOS Y POTENCIADA POR IA.**
