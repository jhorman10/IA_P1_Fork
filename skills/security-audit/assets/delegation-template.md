# Template de Delegación: Security Audit

> **Skills Requeridas:** `security-audit`, `refactor-arch`, `testing-qa`

## Estructura de Delegación a Sub-Agente

```javascript
// 1. Cargar contextos y skills
const PROJECT_CONTEXT = await read_file("docs/agent-context/PROJECT_CONTEXT.md");
const RULES = await read_file("docs/agent-context/RULES.md");
const securitySkill = await read_file("skills/security-audit/skill.md");
const refactorSkill = await read_file("skills/refactor-arch/skill.md");
const testingSkill = await read_file("skills/testing-qa/skill.md");

// 2. Delegar a Sub-Agente con contexto completo
await runSubagent({
    description: "[Security] Audit XYZ",
    prompt: `
# Contexto del Proyecto:
${PROJECT_CONTEXT}

# Reglas Arquitectónicas:
${RULES}

# Skills Cargadas:

## 1. Security Audit (OWASP Top 10):
${securitySkill}

## 2. Architecture Refactoring:
${refactorSkill}

## 3. Testing & QA:
${testingSkill}

# Tarea: [Descripción de la auditoría de seguridad]

## Objetivo:
- Ejecutar auditoría siguiendo OWASP Top 10
- Detectar vulnerabilidades (XSS, SQL Injection, CSRF, etc.)
- Proponer plan de remediación con priorización
- Implementar hardening (Helmet, Rate Limiting, Sanitization)

## Restricciones:
- No romper tests existentes
- Documentar cada hallazgo con severidad (⛔/🟠/🟡/🟢)
- Tests de casos maliciosos (>80% coverage en security)
- Seguir Conventional Commits

## Entregables:
1. SECURITY_AUDIT.md con hallazgos detallados
2. Plan de remediación priorizado
3. Código hardened (middlewares, guards, sanitizers)
4. Tests de seguridad (malicious inputs, edge cases)
5. DEBT_REPORT.md actualizado con hallazgos
    `
});
```

## Ejemplo de Uso Real

**Usuario solicita:** "Ejecuta auditoría de seguridad en endpoints de registro"

**AO ejecuta:**
```javascript
await runSubagent({
    description: "[Security] Audit Registration Endpoints",
    prompt: `
# Contexto del Proyecto: [PROJECT_CONTEXT cargado]
# Reglas Arquitectónicas: [RULES cargadas]
# Skills: security-audit, refactor-arch, testing-qa

# Tarea:
Auditoría de seguridad en endpoints de registro de citas:
1. Detectar vulnerabilidades OWASP Top 10 en \`/api/appointments\`
2. Verificar validación de inputs (XSS, SQL Injection, NoSQL Injection)
3. Verificar rate limiting y protección CSRF
4. Implementar sanitization middleware
5. Agregar validación de esquemas con Joi/Zod
6. Tests de casos maliciosos (payloads XSS, SQL injection)

# Entregables:
1. Lista de vulnerabilidades detectadas (H-XX con severidad)
2. Sanitization middleware implementado
3. Schema validation aplicado
4. 10+ tests de casos maliciosos
5. DEBT_REPORT.md actualizado con hallazgos
    `
});
```

## Checklist Post-Delegación

- [ ] SA ejecutó auditoría siguiendo OWASP Top 10
- [ ] Hallazgos documentados con severidad (⛔/🟠/🟡/🟢)
- [ ] Plan de remediación priorizado
- [ ] Security hardening implementado
- [ ] Tests de seguridad creados (>80% coverage)
- [ ] Commits con Conventional Commits
- [ ] SECURITY_AUDIT.md actualizado
- [ ] DEBT_REPORT.md actualizado con hallazgos H-XX
