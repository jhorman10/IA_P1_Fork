---
name: "security-audit"
description: "Auditoría de seguridad ofensiva y defensiva, análisis de vulnerabilidades (OWASP), endurecimiento de infra y gestión de secretos."
trigger: "When feedback mentions security, vulnerabilities, audit, authentication, authorization, OWASP, secrets, certificates, encryption, or pen-testing."
scope: "backend/producer/src/, backend/consumer/src/, frontend/src/, docker-compose.yml, .env.example"
author: "IA_P1_Fork Team"
version: "1.0.0 (Elite Grade)"
license: "MIT"
autoinvoke: true
---

# Skill: Security Audit (Elite Grade)

## Context
Este proyecto maneja datos de pacientes y comunicación asíncrona. La seguridad es crítica para garantizar la privacidad y la integridad de los turnos médicos.

## Rules
1. **Zero Trust**: Nunca asumas que la red interna de Docker es segura.
2. **Secret Management**: Los secretos NUNCA deben estar en el código. Verifica `.env.example`.
3. **OWASP Top 10**: Valida contra inyección, autenticación rota y exposición de datos sensibles.
4. **Least Privilege**: Los contenedores y procesos deben correr con los permisos mínimos necesarios.
5. **Human Check**: Todo cambio de seguridad requiere `// 🛡️ HUMAN CHECK`.

## Tools Permitted
- **Explore**: `grep` para buscar hardcoded secrets o patrones inseguros.
- **Terminal**: `npm audit`, `snyk` (si está disponible), `docker scan`.

## Workflow
1. **Static Analysis**: Buscar secretos, CORS mal configurado, o headers de seguridad faltantes.
2. **Logic Audit**: Verificar que los Use Cases validen la propiedad de los datos y permisos.
3. **Infra Hardening**: Revisar puertos expuestos y privilegios de Docker.
4. **Report**: Generar un `SECURITY_AUDIT.md` usando el template en `assets/templates/`.

## Assets
- `assets/templates/security-audit-report.md` — Estructura profesional para hallazgos.
- `assets/docs/security-check-list.md` — Lista de verificación rápida de endurecimiento.
