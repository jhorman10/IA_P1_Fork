# Matriz de Riesgos ASD - authenticated-websocket-channel

## 1. Resumen

Contexto del riesgo:

- Proyecto: sistema de turnos medicos con canales realtime publico y operativo.
- Objetivo de SPEC-010: introducir autenticacion real para el canal operativo sin romper la experiencia publica existente.
- Alcance revisado: guard WebSocket, gateway operativo, adapter/hook frontend autenticado y regresiones del canal publico.

Total: 4 riesgos | Alto (A): 1 | Medio (S): 3 | Bajo (D): 0

Leyenda ASD:

- A = testing obligatorio, bloquea release si no tiene mitigacion aceptable.
- S = testing recomendado, debe documentarse si se difiere.
- D = testing opcional o control de proceso.

## 2. Matriz de riesgos

| ID        | HU / Area                      | Descripcion del riesgo                                                                                                               | Factores de riesgo                                                                 | Nivel ASD | Testing requerido | Mitigacion / control actual                                                                                                      |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | --------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| R-010-001 | HU-01 / acceso operativo       | Un cliente sin autenticacion valida o sin `Profile` activo podria conectarse al canal operativo y recibir datos internos             | Autenticacion, autorizacion, datos operativos en tiempo real                       | A         | Obligatorio       | `WsFirebaseAuthGuard` valida token, `Profile` y estado activo; tests cubren token ausente, invalido, perfil ausente e inactivo   |
| R-010-002 | HU-02 / continuidad publica    | La nueva autenticacion operativa podria acoplar o romper el canal publico ya usado por sala de espera                                | Regresion de funcionalidad existente, flujo de alta frecuencia, cambio transversal | S         | Recomendado       | Tests del gateway publico validan no dependencia de `WS_AUTH_TOKEN` y aceptacion de clientes no autenticados                     |
| R-010-003 | HU-01 / feedback de frontend   | El frontend podria seguir mostrando el canal operativo como conectado despues de un rechazo de autenticacion o reconexion invalida   | Integracion frontend-backend, estados asincronos de UI                             | S         | Recomendado       | Adapter y hook operativos exponen `onAuthRejected`, `authRejected` y `connected=false` con cobertura automatizada                |
| R-010-004 | Integracion operativa completa | La integracion real entre producer y frontend podria diferir del comportamiento validado en pruebas unitarias e integracion aisladas | Integracion entre procesos, ausencia de E2E revisado en esta pasada                | S         | Recomendado       | La confianza actual descansa en suites focalizadas de guard, gateway, adapter y hook; no se reviso una corrida E2E multi-proceso |

## 3. Plan de mitigacion para riesgos A

### R-010-001 - Acceso no autorizado al canal operativo

- Mitigacion actual:
  - Extraccion de token desde `handshake.auth.token` o header `Authorization`.
  - Verificacion del `idToken` con Firebase.
  - Resolucion de `Profile` por `uid` y rechazo cuando falta o esta inactivo.
  - Emision explicita de `WS_AUTH_ERROR` y desconexion antes de emitir snapshot.
- Tests obligatorios:
  - Conexion exitosa con `Profile` activo.
  - Rechazo por token ausente o expirado.
  - Rechazo por `Profile` inexistente o inactivo.
  - Verificacion de que el snapshot solo se emite despues de autenticar.
- Bloquea release: solo si desaparece esta cobertura o si el gateway vuelve a emitir datos sin autenticar.

## 4. Evidencia pendiente y riesgos residuales

- No se reviso una prueba E2E multi-proceso para la conexion operativa real durante esta pasada QA.
- No se identifico una vista operativa consumidora final dentro del alcance de SPEC-010; la evidencia actual es de infraestructura, adapter y hook.
- No se detectaron hallazgos bloqueantes sobre continuidad del canal publico o bypass de autenticacion en el canal operativo.

## 5. Decision QA local

Resultado QA local: sin bloqueos activos para la spec.

Interpretacion:

- El riesgo alto de acceso indebido al canal operativo queda controlado por implementacion y pruebas focalizadas.
- La regresion publica queda explicitamente cubierta en backend y frontend.
- Persisten riesgos medios normales de integracion realtime, pero no hay evidencia actual que justifique mantener SPEC-010 en `IN_PROGRESS`.

Recomendacion QA: SPEC-010 queda apta para cierre en `IMPLEMENTED`.
