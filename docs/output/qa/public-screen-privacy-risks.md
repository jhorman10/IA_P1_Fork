# Matriz de Riesgos ASD - public-screen-privacy

## 1. Resumen

Contexto del riesgo:

- Proyecto: Sistema Inteligente de Gestion de Turnos Medicos.
- Objetivo de SPEC-009: anonimizar nombres en la pantalla publica sin perder identificacion completa en vistas autenticadas operativas.
- Alcance revisado: frontend solamente.
- Evidencia base: spec, implementacion frontend revisada y suites focalizadas reportadas en verde.

Total: 5 riesgos | Alto (A): 2 | Medio (S): 3 | Bajo (D): 0

Leyenda ASD:

- A = testing obligatorio, bloquea release si no tiene mitigacion aceptable.
- S = testing recomendado, debe documentarse si se difiere.
- D = testing opcional o control de proceso, priorizable en backlog.

## 2. Matriz de riesgos

| ID    | HU / Area                          | Descripcion del riesgo                                                                                                                                                                                  | Factores de riesgo                                                                         | Nivel ASD | Testing requerido | Mitigacion / control actual                                                                                                          |
| ----- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| R-001 | HU-01 / superficies publicas       | Una tarjeta publica o la notificacion publica podrian volver a mostrar nombres completos si se remueve el default de anonimizacion o se reutiliza mal un componente compartido                          | Datos personales, feature nueva, componentes compartidos, alta visibilidad                 | A         | Obligatorio       | `anonymizeName`, defaults `anonymize=true` en componentes publicos, y cobertura de componentes y pagina publica                      |
| R-002 | Arquitectura de privacidad         | El cliente no autenticado sigue recibiendo `fullName` en el payload WebSocket; la privacidad depende por completo de la capa de presentacion                                                            | Datos personales, contrato de integracion, canal no autenticado                            | A         | Obligatorio       | La spec mantiene el contrato backend intacto y el frontend revisado enmascara la visualizacion; queda riesgo residual arquitectonico |
| R-003 | CRITERIO-1.2 / vistas autenticadas | Una regresion de reutilizacion podria dejar anonimizados los nombres en el dashboard autenticado y afectar la operacion interna                                                                         | Reutilizacion de componentes, regresion funcional, alta frecuencia de uso                  | S         | Recomendado       | `frontend/src/app/dashboard/page.tsx` pasa `anonymize={false}` y `frontend/test/app/dashboard/page.spec.tsx` lo valida               |
| R-004 | Notificacion de asignacion         | La privacidad de la notificacion en la transicion `waiting -> called` podria degradarse sin ser detectada a nivel de pagina, porque el texto anonimizado hoy se verifica solo en el test del componente | Interaccion multi-componente, evidencia de integracion parcial                             | S         | Recomendado       | `AssignmentNotification` anonimiza por default y su suite valida ambos contextos; la pagina solo prueba aparicion de la notificacion |
| R-005 | Cobertura de contrato              | No existen pruebas SPEC-009 de backend o de contrato WebSocket para detectar drift futuro del payload que pueda afectar vistas publicas y autenticadas                                                  | Dependencia de integracion, ausencia de pruebas backend en esta spec, evidencia incompleta | S         | Recomendado       | La spec congela el contrato y la validacion actual descansa en tests frontend y revision del codigo                                  |

## 3. Plan de mitigacion para riesgos A

### R-001 - Exposicion de nombres completos en superficies publicas

- Mitigacion actual:
  - `anonymizeName` concentra la regla de formato.
  - `WaitingAppointmentCard`, `CalledAppointmentCard`, `CompletedAppointmentCard` y `AssignmentNotification` usan `anonymize=true` por defecto.
  - `frontend/test/app/page.spec.tsx` valida nombres enmascarados en la home publica.
- Tests obligatorios:
  - Suite de utilidad para nombres multi-termino, dos terminos, un termino y entradas vacias.
  - Suites de componentes publicos con verificacion de default anonimizado.
  - Regresion de la pagina publica con valores enmascarados visibles.
- Bloquea release: Si.

### R-002 - Privacidad dependiente solo de la capa de presentacion

- Mitigacion actual:
  - La spec decide no cambiar backend ni contrato WebSocket para no romper consumidores existentes.
  - El frontend revisado aplica anonimizacion de forma consistente en las superficies publicas analizadas.
- Mitigacion recomendada a futuro:
  - Evaluar un canal publico con payload minimizado o un campo derivado ya anonimizado.
  - Agregar chequeos de contrato o monitoreo para cualquier nuevo consumidor publico del stream.
  - Mantener pruebas de regresion en cada superficie publica que consuma `fullName`.
- Tests obligatorios:
  - Regresion de pantalla publica en cada punto de visualizacion.
  - Validacion de cualquier nueva vista publica o kiosko antes de release.
- Bloquea release: Si, salvo aceptacion explicita del riesgo arquitectonico definido por la spec.

## 4. Evidencia pendiente y riesgos residuales

- No se encontro una asercion a nivel de pagina sobre el texto anonimizado dentro de la notificacion despues de la transicion real `waiting -> called`.
- No se encontraron pruebas backend ni de contrato WebSocket especificas para SPEC-009, consistente con el alcance pero relevante para mantenimiento.
- Esta pasada QA no re-ejecuto tests localmente; la referencia de verde proviene de la validacion independiente reportada.
- La spec sigue marcada como `IN_PROGRESS`, por lo que existe una diferencia de estado de proceso frente al avance tecnico observado.

## 5. Decision QA local

Resultado QA local: cierre condicional.

Interpretacion:

- La evidencia revisada soporta la anonimizacion en la pantalla publica y la preservacion del nombre completo en el dashboard autenticado.
- No se detecto un blocker funcional nuevo dentro del frontend implementado para SPEC-009.
- Permanecen riesgos residuales sobre la dependencia de masking en frontend y sobre la cobertura de integracion de la notificacion.
