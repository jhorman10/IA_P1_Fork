# Template de delegacion: Refactor arquitectonico

> **Skills requeridas:** `refactor-arch`, `testing-qa`

## Estructura de delegacion a sub-agente

```javascript
// 1. Cargar contextos y skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegar a Sub-Agente con contexto completo
await runSubagent({
  description: "[Refactor] Apply Hexagonal Architecture to XYZ",
  prompt: `
# Contexto del Proyecto:
${PROJECT_CONTEXT}

# Reglas Arquitectonicas:
${RULES}

# Skills Cargadas:

## 1. Architecture Refactoring (Hexagonal/DDD):
${refactorSkill}

## 2. Testing & QA:
${testingSkill}

# Tarea: [Descripcion de la tarea de refactoring]

## Objetivo:
- Separar capas: domain -> application -> infrastructure
- Crear puertos (interfaces) en domain/ports/
- Crear adaptadores en infrastructure/
- Aplicar SOLID estrictamente (SRP, OCP, LSP, ISP, DIP)
- Documentar patrones usados con // Pattern: <nombre> - <justificacion>
- Mantener tests existentes pasando + crear nuevos

## Restricciones:
- domain/ NO puede importar de infrastructure/, @nestjs/*, mongoose, amqplib
- application/ puede importar de domain/ pero NO de infrastructure/
- Toda dependencia fluye hacia adentro: infra -> app -> domain
- Cobertura de tests >80%
- Agregar // HUMAN CHECK en decisiones de separacion de capas

## Entregables:
1. Puertos (interfaces) en domain/ports/
2. Entidades de dominio puras en domain/entities/
3. Adaptadores en infrastructure/
4. Tests actualizados y nuevos
5. Comentarios // HUMAN CHECK donde aplique
    `,
});
```

## Ejemplo de uso real

**Usuario solicita:** "Extraer logica de asignacion de oficinas a una entidad de dominio pura"

**AO ejecuta:**

```javascript
await runSubagent({
  description: "[Refactor] Extract Office Assignment to Domain Entity",
  prompt: `
# Contexto del Proyecto: [PROJECT_CONTEXT cargado]
# Reglas Arquitectonicas: [RULES cargadas]
# Skills: refactor-arch, testing-qa

# Tarea:
Extraer logica de asignacion de oficinas del servicio de infraestructura a entidad de dominio:
1. Crear \`OfficeAssignment\` entity en domain/entities/
2. Crear \`OfficeAssignmentPort\` en domain/ports/outbound/
3. Mover logica de asignacion al dominio (sin imports de Mongoose)
4. Crear adaptador \`MongooseOfficeAssignmentAdapter\` en infrastructure/
5. Actualizar wiring en NestJS Module
6. Tests unitarios de la entidad de dominio
7. Tests de integracion del adaptador

# Entregables:
1. OfficeAssignment entity (dominio puro)
2. OfficeAssignmentPort (interface)
3. MongooseOfficeAssignmentAdapter (implementacion)
4. Tests >80% coverage
    `,
});
```

## Checklist post-delegacion

- [ ] domain/ no importa de infrastructure/ ni de frameworks
- [ ] application/ no importa de infrastructure/
- [ ] Flujo de dependencia: infra -> app -> domain (DIP validado)
- [ ] Patrones documentados con // Pattern: <nombre>
- [ ] Tests creados y pasando (>80% coverage)
- [ ] // HUMAN CHECK presente en decisiones de capas
- [ ] Commits con Conventional Commits
- [ ] Documentado en AI_WORKFLOW.md
- [ ] DEBT_REPORT.md actualizado (si aplica)
