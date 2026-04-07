# Matriz de Riesgos ASD - appointment-lifecycle-management

## 1. Resumen

Contexto del riesgo:

- Proyecto: sistema de turnos medicos con producer, consumer, RabbitMQ y actualizacion realtime.
- Objetivo de SPEC-012: habilitar finalizacion explicita y cancelacion operativa manteniendo consistencia del modelo asincrono existente.
- Alcance revisado: controller del producer, casos de uso del consumer, handlers de eventos, servicios frontend y acciones UI de doctor y dashboard.

Total: 4 riesgos | Alto (A): 2 | Medio (S): 2 | Bajo (D): 0

Leyenda ASD:

- A = testing obligatorio, bloquea release si no tiene mitigacion aceptable.
- S = testing recomendado, debe documentarse si se difiere.
- D = testing opcional o control de proceso.

## 2. Matriz de riesgos

| ID        | HU / Area                             | Descripcion del riesgo                                                                                                          | Factores de riesgo                                                           | Nivel ASD | Testing requerido | Mitigacion / control actual                                                                                                                                         |
| --------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-012-001 | HU-01 y HU-02 / validacion de negocio | Un actor no autorizado o un turno en estado invalido podria completar o cancelar indebidamente un turno                         | Autorizacion, reglas de negocio criticas, cambio multirol                    | A         | Obligatorio       | Controller del producer valida roles, ownership, existencia y estado; pruebas cubren 403, 404, 409 y 200                                                            |
| R-012-002 | Flujo asincrono producer-consumer     | El producer podria aceptar la operacion y la transicion no materializarse correctamente en consumer o en el ACK/NACK del evento | Integracion con sistema externo, asincronia, consistencia operativa          | A         | Obligatorio       | `consumer.controller.spec.ts` valida ACK/NACK y los casos de uso cubren persistencia, notificacion y auditoria                                                      |
| R-012-003 | UI operacional                        | La UI podria quedar desalineada temporalmente despues de completar o cancelar, mostrando estados stale o botones bloqueados     | Integracion frontend-backend, realtime, experiencia operativa                | S         | Recomendado       | Dashboard y doctor page tienen pruebas de wiring, loading state y recuperacion del boton tras exito o error                                                         |
| R-012-004 | Concurrencia de cierre                | La carrera entre auto-expiracion y finalizacion explicita puede producir feedback ambiguo para el operador                      | Logica compleja, asincronia, edge case sin evidencia deterministica revisada | S         | Recomendado       | El controller devuelve `Turno ya fue completado` cuando ya llega cerrado y el consumer no-op en estados no `called`, pero no se reviso un test concurrente dedicado |

## 3. Plan de mitigacion para riesgos A

### R-012-001 - Transiciones ilegales o bypass de permisos

- Mitigacion actual:
  - `FirebaseAuthGuard` y `RoleGuard` protegen ambos endpoints.
  - El producer valida `called` para completar y `waiting` para cancelar.
  - El producer valida ownership cuando el actor es doctor.
  - El frontend preserva mensajes de negocio del backend para que el error operativo sea visible.
- Tests obligatorios:
  - Completar turno propio con 200.
  - Rechazo 403 por ownership incorrecto.
  - Rechazo 409 por estado invalido al completar o cancelar.
  - Rechazo 403 para doctor intentando cancelar.
- Bloquea release: si cualquiera de estas validaciones deja de existir o deja de estar cubierta.

### R-012-002 - Inconsistencia en el flujo asincrono producer-consumer

- Mitigacion actual:
  - El producer solo publica eventos despues de validar precondiciones.
  - El consumer ACK/NACK queda cubierto para ambos eventos de lifecycle.
  - Los casos de uso cubren persistencia, notificacion y auditoria del lado consumer.
- Tests obligatorios:
  - ACK cuando `complete_appointment` y `cancel_appointment` se ejecutan correctamente.
  - NACK sin requeue cuando falla el caso de uso.
  - Persistencia del nuevo estado en los casos de uso.
- Bloquea release: si el consumer deja de confirmar o persiste estados incorrectos tras aceptar la orden del producer.

## 4. Evidencia pendiente y riesgos residuales

- No se reviso una prueba concurrente que reproduzca de forma deterministica la carrera entre auto-expiracion y finalizacion explicita.
- La reasignacion inmediata queda sustentada por la invocacion de `assignUseCase.execute()`, pero no por un E2E especifico de siguiente paciente asignado en esta pasada QA.
- No se detectaron hallazgos bloqueantes en las rutas principales de completar, cancelar, auditar y refrescar la UI operativa.

## 5. Decision QA local

Resultado QA local: sin bloqueos activos para la spec.

Interpretacion:

- Los riesgos altos de permisos, validacion de estados y consistencia asincrona quedan mitigados por implementacion y pruebas focalizadas.
- Permanecen riesgos medios razonables sobre concurrencia y evidencia E2E de reasignacion inmediata, pero no invalidan el flujo implementado.

Recomendacion QA: SPEC-012 queda apta para cierre en `IMPLEMENTED`.
