# Matriz de Riesgos ASD - operational-access-foundation-v2

## 1. Resumen

Contexto del analisis:

- SPEC-006 toca autenticacion, autorizacion, datos operativos de Usuario y controles de seguridad sobre Perfiles.
- La evidencia revisada confirma implementacion de auto-init, `profile_audit_logs`, throttling, `useClientSideConfig` y `AuthHydrationBoundary`.
- La sesion reporta backend focalizado 49/49 verde, frontend focalizado 12/12 verde y ausencia de errores en `get_errors`.

Riesgos abiertos: 4 | Alto (A): 0 | Medio (S): 3 | Bajo (D): 1

Leyenda ASD:

- A = testing obligatorio, bloquea cierre QA si sigue abierto.
- S = testing recomendado, debe documentarse si se difiere.
- D = control deseable o de gobierno, sin bloqueo inmediato.

## 2. Riesgos altos cerrados en esta revision

### R-006-A1 - Usuario autenticado sin Perfil queda bloqueado sin via de salida

Estado actual: Cerrado.

Evidencia de cierre:

- `POST /profiles/self/initialize` esta implementado con guard especifico para token valido sin Perfil previo.
- La suite `profile-auto-init.spec.ts` cubre creacion exitosa, conflicto por duplicado, 401, 403, 400, rol por defecto y rol doctor.

### R-006-A2 - Enumeracion o abuso de endpoints sensibles de Perfiles

Estado actual: Cerrado.

Evidencia de cierre:

- `GET /profiles` y `PATCH /profiles/:uid` estan decorados con `@Throttle`.
- La suite `profiles.rate-limit.spec.ts` demuestra 429 despues de superar 20 solicitudes por minuto para lectura y actualizacion.

## 3. Matriz de riesgos abiertos

| ID        | HU / Area                     | Descripcion del riesgo                                                                                                                                                     | Factores de riesgo                                          | Nivel ASD | Testing requerido  | Control actual                                                                                       |
| --------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| R-006-001 | HU-07 / Auditoria de Perfil   | La persistencia de `profile_audit_logs` esta bien cubierta a nivel servicio, adapter y schema, pero no se reviso una evidencia HTTP -> DB real sobre un `PATCH` exitoso    | Integracion multi-capa, dato sensible, evidencia incompleta | S         | Recomendado        | `profile-spec006.spec.ts`, adapter spec y schema spec validan emision y contrato de persistencia     |
| R-006-002 | HU-07 / Observabilidad        | Si la escritura de auditoria falla, la actualizacion principal sigue y la senal operativa queda limitada a `console.warn`                                                  | Compliance, trazabilidad, observabilidad limitada           | S         | Recomendado        | El servicio absorbe el fallo y deja warning tecnico para no bloquear la operacion principal          |
| R-006-003 | HU-08 / Operacion distribuida | El throttling actual es suficiente en el contexto revisado, pero no hay evidencia de almacenamiento compartido o comportamiento equivalente en despliegues multi-instancia | Seguridad operativa, infraestructura, ambiente no validado  | S         | Recomendado        | Existe throttling funcional a nivel app/controlador; no se reviso storage distribuido en esta pasada |
| R-006-004 | Frontend / Layouts protegidos | Los layouts protegidos son wrappers minimos y fueron revisados por codigo, pero no se identifico una prueba dedicada por layout                                            | Cobertura puntual, riesgo bajo por simplicidad              | D         | Opcional / backlog | `AuthHydrationBoundary` tiene cobertura fuerte y ambos layouts son wrappers de una sola linea        |

## 4. Recomendaciones de seguimiento

### R-006-001 - Evidencia end-to-end de auditoria de Perfil

- Agregar una prueba de integracion que ejecute una actualizacion valida de Perfil y afirme una escritura unica en `profile_audit_logs`.
- Agregar un caso negativo donde una validacion rechazada o un 403/429 afirmen cero escrituras de auditoria de Perfil.

### R-006-002 - Senal operativa ante falla de auditoria

- Reemplazar o complementar `console.warn` con una metrica o alerta estructurada.
- Definir si compliance acepta perdida silenciosa de bitacora cuando la operacion principal ya fue aplicada.

### R-006-003 - Consistencia de throttling en despliegues distribuidos

- Validar el almacenamiento real del throttler en el ambiente objetivo.
- Si hay escalado horizontal, migrar a storage compartido antes de usar este control como barrera principal de seguridad operativa.

### R-006-004 - Cobertura puntual de layouts

- Agregar un test simple por layout solo si el equipo necesita trazabilidad directa de `admin` y `doctor` sobre `AuthHydrationBoundary`.

## 5. Decision QA desde riesgo

Resultado QA local: condicional favorable, sin riesgos A abiertos.

Interpretacion:

- Los riesgos altos de bloqueo de usuario nuevo y ausencia de proteccion sobre endpoints sensibles quedan cerrados con evidencia suficiente.
- Los riesgos abiertos son de evidencia integral, observabilidad y madurez operativa, no de defecto funcional bloqueante en el alcance revisado.
- QA puede cerrar Fase 4 para SPEC-006 con veredicto condicional mientras esos riesgos queden documentados y sin sobredeclarar readiness de release.
