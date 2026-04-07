# Matriz de Riesgos ASD - ci-hardening-and-typescript-rectification

## 1. Resumen

Contexto base del riesgo:

- Proyecto: Sistema Inteligente de Gestion de Turnos Medicos.
- Objetivo de SPEC-005: convertir la evidencia local en cierre de release verificable para CI, TypeScript y journey auth-aware.
- Estado observado: workflow endurecido en repo, fix puntual frontend aplicado, suite auth-aware local fuerte en producer y gaps todavia abiertos para evidencia remota, E2E black-box auth-aware y limpieza TypeScript global.

Total: 6 riesgos | Alto (A): 3 | Medio (S): 2 | Bajo (D): 1

Leyenda ASD:

- A = testing obligatorio, bloquea el release si no tiene mitigacion aceptable.
- S = testing recomendado, debe documentarse si se difiere.
- D = testing opcional o control de proceso.

## 2. Matriz de riesgos

| ID    | Area                      | Descripcion del riesgo                                                                                                                                                                | Factores de riesgo                                                               | Nivel ASD | Testing requerido  | Mitigacion / control actual                                                                                                                                                                                                                                      |
| ----- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-001 | DevOps / Release evidence | El workflow endurecido existe en el repo, pero no hay evidencia remota adjunta de GitHub Actions que pruebe el comportamiento bloqueante en el entorno hospedado                      | Integraciones externas, evidencia de release, posible drift de entorno           | A         | Obligatorio        | [ci.yml](../../../.github/workflows/ci.yml) ya refleja jobs obligatorios locales, pero falta corrida remota verificable                                                                                                                                          |
| R-002 | Auth / Autorizacion       | El journey auth-aware tiene cobertura fuerte de integracion, pero no existe un E2E black-box auth-aware real dentro de [backend/e2e](../../../backend/e2e/) ni su ejecucion remota    | Autenticacion/autorizacion critica, multiples capas, frontera de infraestructura | A         | Obligatorio        | [spec-005-auth-aware.integration.spec.ts](../../../backend/producer/test/src/auth/spec-005-auth-aware.integration.spec.ts) cubre 9 escenarios locales; [appointment.e2e.spec.ts](../../../backend/e2e/appointment.e2e.spec.ts) sigue siendo flujo publico legado |
| R-003 | TypeScript / Readiness    | La spec promete diagnosticos TypeScript limpios, pero el contexto validado indica errores frontend ajenos todavia presentes, lo que impide afirmar cierre global                      | Salud del codigo, criterio de aceptacion incompleto, multiples paquetes          | A         | Obligatorio        | El fix puntual en [useAuth.session.spec.tsx](../../../frontend/test/hooks/useAuth.session.spec.tsx) esta aplicado, pero no hay evidencia concluyente de limpieza global                                                                                          |
| R-004 | Coverage gate             | Se verifican thresholds de 80% en producer y consumer, pero no se encontro threshold equivalente en la configuracion frontend observada                                               | Gate inconsistente, visibilidad parcial de regresiones                           | S         | Recomendado        | [backend/producer/jest.config.js](../../../backend/producer/jest.config.js) y [backend/consumer/jest.config.js](../../../backend/consumer/jest.config.js) ya lo exigen; [frontend/jest.config.ts](../../../frontend/jest.config.ts) solo evidencia recoleccion   |
| R-005 | Senal E2E                 | El unico E2E backend observado sigue validando el flujo publico legado, lo que puede dar falsa confianza sobre journeys autenticados si la integracion local diverge del entorno real | Cobertura black-box incompleta, logica por rol, cambio reciente                  | S         | Recomendado        | El control actual descansa en la suite integrada de producer y en el E2E publico existente                                                                                                                                                                       |
| R-006 | Gobierno de cierre        | Marcar la spec como completa mientras sigue en `IN_PROGRESS` y con evidencia faltante inflaria el estado real de release readiness                                                    | Control de proceso y trazabilidad                                                | D         | Opcional / proceso | Este reporte QA mantiene el cierre en condicion y explicita los gaps                                                                                                                                                                                             |

## 3. Plan de mitigacion para riesgos A

### R-001 - Workflow endurecido sin evidencia remota adjunta

- Mitigacion actual:
  - El workflow versionado ya no muestra `continue-on-error` en integracion ni E2E obligatorios.
  - Existen jobs separados para integracion, E2E y seguridad.
- Falta para cerrar:
  - Ejecutar al menos una corrida remota de GitHub Actions con esta version del workflow.
  - Conservar el link o captura del run exitoso y, idealmente, de una falla controlada que demuestre bloqueo.
- Bloquea release: Si.

### R-002 - Journey auth-aware sin E2E black-box real

- Mitigacion actual:
  - La suite [spec-005-auth-aware.integration.spec.ts](../../../backend/producer/test/src/auth/spec-005-auth-aware.integration.spec.ts) cubre 9 escenarios relevantes por rol y ownership.
  - El flujo publico legado sigue cubierto por [appointment.e2e.spec.ts](../../../backend/e2e/appointment.e2e.spec.ts).
- Falta para cerrar:
  - Implementar un E2E auth-aware real en [backend/e2e](../../../backend/e2e/) o acotar formalmente el criterio de aceptacion para aceptar integracion fuerte como sustituto.
  - Ejecutarlo en CI remota.
- Bloquea release: Si, para marcar la spec como completa.

### R-003 - Criterio TypeScript global no demostrado

- Mitigacion actual:
  - El fix puntual de frontend requerido por la spec ya fue aplicado.
  - La deuda conocida fuera del cambio minimo esta identificada por el contexto validado.
- Falta para cerrar:
  - Corregir los errores TypeScript ajenos o dejar un carve-out formal aprobado que saque esa deuda del criterio de cierre de SPEC-005.
  - Adjuntar una corrida de validacion que respalde el criterio final acordado.
- Bloquea release: Si, para sostener el claim de workspace limpio que la spec declara.

## 4. Evidencia pendiente y riesgo residual aceptable solo en condicion

- No se adjunto evidencia remota de GitHub Actions dentro del workspace actual.
- La cobertura auth-aware existente es integracion fuerte; no equivale por si sola a E2E black-box real.
- El estado `IN_PROGRESS` de la spec sigue siendo consistente con la evidencia actual.
- El fix puntual frontend no elimina por si mismo el ruido TypeScript ajeno reportado para el repo.

## 5. Decision QA local

Resultado QA local: conditional.

Recomendacion go/no-go local:

- No-go para declarar SPEC-005 como release-ready completa hoy.
- Go condicional para conservar y promover los cambios ya implementados a validacion remota, siempre que el cierre de la spec permanezca condicionado hasta resolver o acotar formalmente los tres riesgos A.
