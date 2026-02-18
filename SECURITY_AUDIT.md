# 🛡️ Security Audit Report — Medical Appointment System

## Executive Summary
- **Overall Risk Level**: **HIGH**
- **Total Hallazgos**: 5

## Hallazgos (Vulnerabilidades)

### S-01 Permissive CORS Policy
- **Severidad**: Medium
- **CWE/OWASP**: OWASP A01:2021-Broken Access Control
- **Ubicación**: `backend/producer/src/main.ts:15`, `backend/producer/src/events/appointments.gateway.ts:15`
- **Descripción**: La política de CORS permite cualquier origen (`*`).
- **Impacto**: Un sitio malicioso ejecutado en el navegador del usuario podría realizar peticiones a la API o conectar al WebSocket si no hay otros mecanismos de protección.
- **Recomendación**: Restringir `origin` a dominios específicos (ej. la URL del frontend).

### S-02 Missing WebSocket Authentication
- **Severidad**: **CRITICAL**
- **CWE/OWASP**: OWASP A01:2021-Broken Access Control
- **Ubicación**: `backend/producer/src/events/appointments.gateway.ts`
- **Descripción**: El gateway de WebSockets no requiere autenticación para conectar. Al conectar, envía inmediatamente un `APPOINTMENTS_SNAPSHOT` con datos sensibles de pacientes (nombres, idCard).
- **Impacto**: Exposición masiva de datos personales de pacientes a cualquier persona con acceso a la red.
- **Recomendación**: Implementar JWT Guards o validación de tokens en `handleConnection`.

### S-03 Lack of Security Headers (Helmet)
- **Severidad**: Low
- **CWE/OWASP**: OWASP A05:2021-Security Misconfiguration
- **Ubicación**: `backend/producer/src/main.ts`
- **Descripción**: No se utilizan middlewares para configurar headers de seguridad básicos (X-Powered-By, X-Frame-Options, CSP, etc.).
- **Impacto**: Mayor superficie de ataque para clickjacking, sniffing de MIME y divulgación de información del servidor.
- **Recomendación**: Integrar `@nestjs/helmet` en el bootstrap de la aplicación.

### S-04 Weak Default Credentials
- **Severidad**: High
- **CWE/OWASP**: OWASP A07:2021-Identification and Authentication Failures
- **Ubicación**: `.env.example`, `docker-compose.yml`
- **Descripción**: Se utilizan credenciales por defecto (`guest/guest`, `admin/admin123`).
- **Impacto**: En caso de exposición del puerto 15672 (RabbitMQ) o 27017 (MongoDB), un atacante tendría control total.
- **Recomendación**: Forzar el cambio de credenciales en el primer despliegue y usar secretos de Docker.

### S-05 Unprotected Public API (No Rate Limiting)
- **Severidad**: Medium
- **CWE/OWASP**: OWASP A04:2021-Insecure Design / DoS
- **Ubicación**: `backend/producer/src/main.ts`
- **Descripción**: No hay protección contra ráfagas de peticiones o ataques DoS.
- **Impacto**: Agotamiento de recursos del sistema o saturación de la cola de RabbitMQ por parte de un solo cliente malicioso.
- **Recomendación**: Implementar `@nestjs/throttler`.

---
## Recomendaciones de Endurecimiento (Hardening)
1. [ ] Implementar `Helmet` en el Producer.
2. [ ] Configurar `Throttler` para endpoints públicos.
3. [ ] Asegurar el WebSocket Namespace con un Guard de prueba.
4. [ ] Restringir CORS al dominio del frontend.

---
**Auditado por SA Security (Elite Grade)**
