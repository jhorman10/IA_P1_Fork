# Matriz de Riesgos ASD - operational-metrics-dashboard

## 1. Resumen

Contexto del riesgo:

- Proyecto: sistema de turnos medicos con visibilidad operativa para administracion.
- Objetivo de SPEC-013: exponer una vista consolidada de metricas del dia para soporte a decisiones operativas.
- Alcance revisado: endpoint `GET /metrics`, use case de agregacion, adapter read-only a `audit_logs`, servicio frontend, hook de auto-refresh y pagina admin del dashboard.

Total: 4 riesgos | Alto (A): 1 | Medio (S): 3 | Bajo (D): 0

Leyenda ASD:

- A = testing obligatorio, bloquea release si no tiene mitigacion aceptable.
- S = testing recomendado, debe documentarse si se difiere.
- D = testing opcional o control de proceso.

## 2. Matriz de riesgos

| ID        | HU / Area                    | Descripcion del riesgo                                                                                                                                    | Factores de riesgo                                                     | Nivel ASD | Testing requerido | Mitigacion / control actual                                                                                                            |
| --------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| R-013-001 | HU-01 / acceso a metricas    | Un usuario no admin podria acceder a metricas operativas sensibles                                                                                        | Autenticacion, autorizacion, visibilidad administrativa                | A         | Obligatorio       | Controller protegido con auth y rol admin; tests cubren 401 y 403; pagina usa `useRoleGuard(["admin"])`                                |
| R-013-002 | HU-01 / KPI temporal         | Los promedios dependen de que existan eventos suficientes y consistentes en `audit_logs`; cuando faltan pares validos del dia los valores seguiran `null` | Integracion cross-service read-only, calidad de datos, feature nueva   | S         | Recomendado       | El use case ya lee `APPOINTMENT_ASSIGNED` y `APPOINTMENT_COMPLETED`; los tests cubren calculo positivo y caminos sin datos suficientes |
| R-013-003 | HU-01 / disponibilidad de UI | Un fallo temporal de refresh podria dejar al admin sin visibilidad o con una UI inestable                                                                 | Integracion frontend-backend, polling periodico, experiencia operativa | S         | Recomendado       | Hook conserva el ultimo snapshot valido y la pagina mantiene la grid visible junto al error                                            |
| R-013-004 | Backend aggregation          | El calculo en memoria sobre `findAll()` y la lectura completa de `audit_logs` pueden degradar la experiencia cuando el volumen crezca                     | Codigo nuevo, agregacion de datos, sensibilidad a volumen              | S         | Recomendado       | No hay evidencia de problema actual en el lote revisado, pero la implementacion ya revela el primer punto de presion de escala         |

## 3. Plan de mitigacion para riesgos A

### R-013-001 - Acceso indebido a metricas administrativas

- Mitigacion actual:
  - `GET /metrics` exige Bearer token valido y rol `admin`.
  - La pagina usa `useRoleGuard(["admin"])` antes de renderizar el dashboard.
- Tests obligatorios:
  - 200 con token admin.
  - 401 sin token.
  - 401 con token invalido.
  - 403 con rol no admin.
- Bloquea release: solo si la proteccion del endpoint o de la pagina deja de cumplirse.

## 4. Evidencia pendiente y riesgos residuales

- La brecha previa de promedios operativos queda cerrada: el use case ya calcula `avgWaitTimeMinutes` y `avgConsultationTimeMinutes` desde `audit_logs`, y la suite focal cubre caminos con datos suficientes e insuficientes.
- No se reviso una prueba de integracion con Mongo real para la lectura read-only sobre `audit_logs`; la confianza actual se apoya en tests unitarios focalizados y en la revision del contrato entre producer y consumer.
- La agregacion sigue siendo in-memory y puede requerir una estrategia de query agregada o precomputo si el volumen operativo crece.
- No se genero archivo de performance porque la spec no define SLAs cuantitativos contractuales.
- El polling de 30 segundos y la preservacion del ultimo dato valido quedan correctamente cubiertos en la evidencia revisada.

## 5. Decision QA local

Resultado QA local: sin bloqueos activos para cierre funcional de la spec.

Interpretacion:

- La seguridad de acceso y la estabilidad basica del dashboard estan bien cubiertas.
- La brecha material que mantenia la spec en `IN_PROGRESS` queda cerrada con el calculo real de promedios desde eventos auditados del consumer.

Recomendacion QA: SPEC-013 queda apta para cierre en `IMPLEMENTED`.
