# Matriz de Riesgos ASD - navbar-public-turnos-removal (SPEC-018)

## Resumen

Contexto evaluado:

- El cambio implementado es acotado y se concentra en frontend y documentacion.
- No hay endpoints nuevos ni cambios de autorizacion.
- La regla de consultorios libres y ocupados ya existia; esta spec solo exige preservarla.
- La evidencia de ejecucion compartida por el usuario incluye 3 suites frontend y 25 tests exitosos.
- El repo ya contiene cobertura adicional para la pantalla publica y para el contrato backend 409, aunque esa evidencia no fue incluida en el lote de ejecucion reportado para esta fase.
- La spec no define SLA ni umbrales de performance, por lo que no corresponde artefacto de performance.

Veredicto QA recomendado: PASS WITH RISKS.

Riesgos abiertos: 2 | Alto (A): 0 | Medio (S): 2 | Bajo (D): 0

## Cobertura vs criterios de aceptacion

| Criterio     | Estado                                   | Cobertura observada                                                                                           | Comentario QA                                                                                                                                              |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRITERIO-1.1 | Cubierto                                 | frontend/test/components/Navbar.spec.tsx                                                                      | La suite valida que Turnos no aparece para admin, recepcionista y doctor.                                                                                  |
| CRITERIO-1.2 | Cubierto                                 | frontend/test/components/Navbar.spec.tsx                                                                      | La misma suite valida que Dashboard se mantiene visible y navegable.                                                                                       |
| CRITERIO-1.3 | Cubierto con evidencia indirecta         | frontend/test/app/page.spec.tsx                                                                               | Existe prueba en el repo para la carga de la pantalla publica, pero no aparece en el lote de ejecucion compartido para SPEC-018.                           |
| CRITERIO-2.1 | Cubierto                                 | frontend/test/app/admin/profiles/page.spec.tsx                                                                | La suite valida aria-label Selector de gestion y mantiene opciones visibles.                                                                               |
| CRITERIO-2.2 | Cubierto                                 | frontend/test/app/admin/profiles/page.spec.tsx                                                                | Se preserva la navegacion exclusiva y el modo activo.                                                                                                      |
| CRITERIO-2.3 | Cubierto                                 | frontend/test/app/admin/profiles/page.spec.tsx                                                                | El rename afecta solo el nombre general del selector.                                                                                                      |
| CRITERIO-3.1 | Cubierto                                 | frontend/test/components/OfficeManager.spec.tsx                                                               | La suite valida que un consultorio libre puede deshabilitarse.                                                                                             |
| CRITERIO-3.2 | Cubierto con evidencia parcial ejecutada | frontend/test/components/OfficeManager.spec.tsx y backend/producer/test/src/offices/office.controller.spec.ts | La UI bloquea el caso ocupado y el repo contiene prueba backend para 409, pero esa prueba backend no fue incluida en la evidencia de ejecucion compartida. |
| CRITERIO-3.3 | Cubierto                                 | Inspeccion estatica de spec, codigo y tests existentes                                                        | No se observan contratos nuevos ni cambios backend dentro del alcance de la spec.                                                                          |

## Matriz de riesgos residuales

| ID        | HU / Area              | Descripcion del riesgo                                                                                                                                                                                                                                                         | Factores                                                                     | Nivel ASD | Testing     |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | --------- | ----------- |
| R-018-001 | HU-01 acceso publico   | La ruta publica principal sigue con cobertura en el repo, pero no hay evidencia de re-ejecucion especifica en el lote QA compartido para este cambio. Si apareciera una regresion de montaje o layout ajena al navbar, no quedaria visible en la evidencia actual.             | Navegacion publica, evidencia de ejecucion incompleta para el criterio borde | S         | Recomendado |
| R-018-002 | HU-03 contrato backend | El rechazo 409 de consultorio ocupado esta cubierto por una prueba backend existente, pero no forma parte de la evidencia de ejecucion reportada para esta fase. Como la regla es preservada y no hubo cambios backend en esta spec, el riesgo es bajo a medio, no bloqueante. | Contrato compartido UI + backend, regresion preservada, ejecucion no adjunta | S         | Recomendado |

## Evaluacion QA

### Lo que si queda validado con buena confianza

- Navbar autenticado sin enlace Turnos para perfiles operativos.
- Dashboard preservado para perfiles autenticados.
- Selector interno renombrado a Selector de gestion sin alterar opciones ni modos.
- Regla UI de consultorio libre y ocupado preservada.
- Manual operativo alineado con la nueva navegacion autenticada.

### Lo que queda como riesgo residual no bloqueante

- Falta adjuntar la re-ejecucion explicita de frontend/test/app/page.spec.tsx como evidencia directa para CRITERIO-1.3.
- Falta adjuntar la re-ejecucion explicita de backend/producer/test/src/offices/office.controller.spec.ts para cerrar con evidencia directa el 409 del backend.

## Decision QA

Resultado QA: PASS WITH RISKS.

Interpretacion:

- No se observan desalineaciones funcionales entre la implementacion revisada y los criterios de aceptacion de SPEC-018.
- Los riesgos abiertos son de evidencia complementaria y regresion preservada, no de defecto funcional confirmado.
- Desde QA, la spec puede pasar a IMPLEMENTED si el equipo acepta estos riesgos como no bloqueantes.

## Recomendacion operativa

Para cierre documental mas fuerte, conviene anexar en el release evidence la ejecucion de:

1. frontend/test/app/page.spec.tsx
2. backend/producer/test/src/offices/office.controller.spec.ts

La ausencia de esas dos ejecuciones no bloquea el cierre QA de esta spec, pero si reduce la profundidad de evidencia sobre los criterios borde y el contrato preservado.
