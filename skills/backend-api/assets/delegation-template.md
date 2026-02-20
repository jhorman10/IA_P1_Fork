# Template de Delegación: Backend (API/Logic)

> **Skills Requeridas:** `backend-api`, `refactor-arch`, `testing-qa`

## Estructura de Delegación a Sub-Agente

```javascript
// 1. Cargar contextos y skills
const PROJECT_CONTEXT = await read_file("docs/agent-context/PROJECT_CONTEXT.md");
const RULES = await read_file("docs/agent-context/RULES.md");
const backendSkill = await read_file("skills/backend-api/skill.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegar a Sub-Agente con contexto completo
await runSubagent({
    description: "[Backend] Implement Use Case XYZ",
    prompt: `
# Contexto del Proyecto:
${PROJECT_CONTEXT}

# Reglas Arquitectónicas:
${RULES}

# Skills Cargadas:

## 1. Backend API Best Practices:
${backendSkill}

## 2. Architecture Patterns (Hexagonal/DDD):
${refactorSkill}

## 3. Testing & QA:
${testingSkill}

# Tarea: [Descripción de la tarea de backend]

## Objetivo:
- Implementar lógica de negocio siguiendo DDD (Entities, Value Objects, Aggregates)
- Aplicar Hexagonal Architecture (Ports & Adapters)
- Respetar DIP (Domain no depende de frameworks)
- Crear tests unitarios y de integración

## Restricciones:
- Seguir estructura: domain → application → infrastructure
- DIP estricto: domain no conoce MongoDB/NestJS/RabbitMQ
- Configuración via environment variables
- Cobertura de tests >85%
- Seguir Conventional Commits

## Entregables:
1. Ports (interfaces) en domain/
2. Adapters en infrastructure/
3. Use Cases en application/
4. Tests (unit + integration)
5. Comentarios // ⚕️ HUMAN CHECK donde aplique
    `
});
```

## Ejemplo de Uso Real

**Usuario solicita:** "Implementa retry policy con exponential backoff en RabbitMQ"

**AO ejecuta:**
```javascript
await runSubagent({
    description: "[Backend] Implement Retry Policy with Exponential Backoff",
    prompt: `
# Contexto del Proyecto: [PROJECT_CONTEXT cargado]
# Reglas Arquitectónicas: [RULES cargadas]
# Skills: backend-api, refactor-arch, testing-qa

# Tarea:
Implementar retry policy con exponential backoff para RabbitMQ:
1. Crear \`RetryPolicyPort\` en domain/ports/outbound/
2. Implementar \`ExponentialBackoffRetryAdapter\` en infrastructure/
3. Integrar en \`RabbitMQPublisher\` con configuración (max retries, base delay)
4. Agregar logging de reintentos vía LoggerPort
5. Tests unitarios de estrategia de backoff
6. Tests de integración con RabbitMQ mock

# Entregables:
1. RetryPolicyPort (interface)
2. ExponentialBackoffRetryAdapter (implementación)
3. Integración en Publisher
4. Tests >85% coverage
    `
});
```

## Checklist Post-Delegación

- [ ] SA aplicó DDD (Entities, VOs, Aggregates correctamente ubicados)
- [ ] SA aplicó Hexagonal Architecture (Ports & Adapters)
- [ ] Domain no depende de frameworks (DIP validado)
- [ ] Tests creados (>85% coverage)
- [ ] Commits con Conventional Commits
- [ ] Documentado en AI_WORKFLOW.md
- [ ] DEBT_REPORT.md actualizado (si aplica)
