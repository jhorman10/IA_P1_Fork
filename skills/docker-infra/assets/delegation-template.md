# Template de delegacion: Docker e infraestructura

> **Skills requeridas:** `docker-infra`, `backend-api`, `testing-qa`

## Estructura de delegacion a sub-agente

```javascript
// 1. Cargar contextos y skills
const PROJECT_CONTEXT = await read_file(
  "docs/agent-context/PROJECT_CONTEXT.md",
);
const RULES = await read_file("docs/agent-context/RULES.md");
const dockerSkill = await read_file("skills/docker-infra/skill.md");
const backendSkill = await read_file("skills/backend-api/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegar a Sub-Agente con contexto completo
await runSubagent({
  description: "[Docker] Harden infrastructure for XYZ",
  prompt: `
# Contexto del Proyecto:
${PROJECT_CONTEXT}

# Reglas Arquitectonicas:
${RULES}

# Skills Cargadas:

## 1. Docker & Infrastructure:
${dockerSkill}

## 2. Backend API (context for service deps):
${backendSkill}

## 3. Testing & QA:
${testingSkill}

# Tarea: [Descripcion de la tarea de infraestructura]

## Objetivo:
- Aplicar cambios de infraestructura Docker/Compose
- Validar healthchecks, secretos, puertos y volumes
- Asegurar que credenciales usen variables de entorno
- Verificar depends_on con condition: service_healthy

## Restricciones:
- NUNCA hardcodear credenciales (usar \${VAR:-default} con .env)
- Todo servicio DEBE tener healthcheck
- Puertos de management (15672, 27017) marcados con // HUMAN CHECK
- Configs de desarrollo (volumes, start:dev) documentadas para remocion en produccion
- Usar redes nombradas (app-network) y volumes nombrados

## Entregables:
1. docker-compose.yml actualizado
2. .env.example actualizado (sin secretos reales)
3. Dockerfiles optimizados (si aplica)
4. Comentarios // HUMAN CHECK en configs sensibles
    `,
});
```

## Ejemplo de uso real

**Usuario solicita:** "Agregar healthcheck a MongoDB y mejorar seguridad de credenciales"

**AO ejecuta:**

```javascript
await runSubagent({
  description: "[Docker] Add MongoDB healthcheck and harden credentials",
  prompt: `
# Contexto del Proyecto: [PROJECT_CONTEXT cargado]
# Reglas Arquitectonicas: [RULES cargadas]
# Skills: docker-infra, backend-api, testing-qa

# Tarea:
1. Agregar healthcheck a servicio MongoDB en docker-compose.yml
2. Mover credenciales de MongoDB a variables de entorno
3. Actualizar .env.example con las variables nuevas
4. Agregar condition: service_healthy en depends_on de producer y consumer
5. Marcar puerto 27017 con // HUMAN CHECK: no exponer en produccion

# Entregables:
1. docker-compose.yml con healthcheck y variables
2. .env.example actualizado
3. // HUMAN CHECK en puertos sensibles
    `,
});
```

## Checklist post-delegacion

- [ ] Ninguna credencial hardcodeada en docker-compose.yml
- [ ] Todo servicio tiene healthcheck definido
- [ ] depends_on usa condition: service_healthy
- [ ] .env.example actualizado (sin secretos)
- [ ] Puertos de management marcados con // HUMAN CHECK
- [ ] docker compose config valida sin errores
- [ ] Commits con Conventional Commits
- [ ] Documentado en AI_WORKFLOW.md
- [ ] DEBT_REPORT.md actualizado (si aplica)
