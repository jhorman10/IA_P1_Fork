# Matriz de Riesgos ASD - doctor-operational-landing

## 1. Resumen

Contexto del riesgo:

- Proyecto: Sistema Inteligente de Gestion de Turnos Medicos.
- Objetivo de SPEC-008: dar al rol doctor una landing operativa dedicada para su contexto propio.
- Alcance revisado: frontend remediado de SPEC-008 + evidencia de contrato backend producer para el rechazo `409` de check-out en estado `busy`.
- Evidencia base: spec, implementacion frontend, codigo/backend tests del producer para `check-out busy` y suites focalizadas reportadas en verde.

Total: 4 riesgos | Alto (A): 1 | Medio (S): 3 | Bajo (D): 0

Leyenda ASD:

- A = testing obligatorio, bloquea release si no tiene mitigacion aceptable.
- S = testing recomendado, debe documentarse si se difiere.
- D = testing opcional o control de proceso, priorizable en backlog.

## 2. Matriz de riesgos

| ID    | HU / Area                          | Descripcion del riesgo                                                                                                                                                                                               | Factores de riesgo                                                       | Nivel ASD | Testing requerido | Mitigacion / control actual                                                                                                                                                                    |
| ----- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-001 | HU-01 / acceso al panel            | Un usuario con rol distinto a Medico podria entrar al panel operativo o un doctor sin vinculacion operativa podria quedar con acciones habilitadas                                                                   | Autorizacion critica, codigo nuevo, flujo de alta frecuencia             | A         | Obligatorio       | `RoleGate` bloquea la pagina, `useDoctorDashboard` expone error por `doctor_id` nulo, y existen pruebas de pagina y componente                                                                 |
| R-002 | CRITERIO-1.4 / check-out bloqueado | El mensaje de negocio del `409` puede quedar desalineado entre spec, backend y frontend, porque hoy no hay una prueba automatizada que una el texto real emitido por backend con el mensaje renderizado en dashboard | Regla de negocio critica, integracion frontend-backend, codigo nuevo     | S         | Recomendado       | `doctorService` ya preserva `body.message`, hay tests de servicio para esa conducta y el backend producer evidencia un mensaje de negocio; queda pendiente cerrar el contrato textual en la UI |
| R-003 | HU-01 / completitud funcional      | La HU y la descripcion de la spec indican visibilidad de pacientes asignados, pero no se encontro UI ni evidencia automatizada para esa capacidad                                                                    | Requisito incompleto o ambiguo, feature nueva, impacto operativo directo | S         | Recomendado       | No hay control funcional visible en la landing revisada                                                                                                                                        |
| R-004 | Servicios frontend SPEC-008        | La cobertura de contrato HTTP sigue siendo parcial: `getDoctorById` no tiene prueba dedicada y los tests actuales de `doctorService` no verifican URL ni header `Authorization`                                      | Integracion con backend, evidencia parcial, codigo nuevo                 | S         | Recomendado       | Hay evidencia nueva para preservacion de mensajes de error en `checkInDoctor` y `checkOutDoctor`, pero no para el contrato completo de request                                                 |

## 3. Plan de mitigacion para riesgos A

### R-001 - Acceso incorrecto al panel operativo del doctor

- Mitigacion actual:
  - `RoleGate` restringe el acceso visual al panel del doctor.
  - `useDoctorDashboard` impide operar sin `doctor_id` y expone error operacional.
  - Existen pruebas para rol admin, rol recepcionista y doctor sin vinculacion valida.
- Tests obligatorios:
  - Redireccion post-login del rol doctor.
  - Bloqueo de acceso para roles no autorizados.
  - Error visible y ausencia de acciones operativas cuando falta `doctor_id`.
- Bloquea release: Solo si esta cobertura deja de existir. En la revision actual no hay hallazgo abierto en este frente.

## 4. Evidencia pendiente y riesgos residuales

- No se encontro implementacion visible para la parte de pacientes asignados mencionada en la HU-01 y en la descripcion de la spec.
- No se encontro una automatizacion que valide en el dashboard el texto exacto que hoy devuelve el backend producer para el `409` de check-out en estado `busy`.
- El mensaje actual del backend producer para ese `409` no coincide literalmente con la frase citada en CRITERIO-1.4 ni con el string usado por los tests frontend con mocks.
- `getDoctorById` sigue sin prueba dedicada de servicio, y los tests de `doctorService` no verifican construccion de URL ni header `Authorization`.
- No se re-ejecutaron pruebas localmente en esta pasada QA; la referencia de verde proviene de la validacion independiente reportada por el equipo.
- No se genero archivo de performance porque la spec no define SLAs cuantitativos.

## 5. Decision QA local

Resultado QA local: bloqueo funcional remediado; cierre QA condicional sin bloqueos activos en el batch revisado.

Interpretacion:

- La base funcional del panel del doctor esta cubierta a nivel de hook, componente, pagina, servicio y redireccion post-login.
- El bloqueo previo por colapso de errores a `HTTP_ERROR` queda cerrado: `doctorService` ahora preserva `body.message` y existe evidencia automatizada para esa conducta.
- La confirmacion de exito posterior a check-in/check-out ya queda evidenciada en hook y pagina.
- La conformidad completa de SPEC-008 sigue condicionada por riesgos medios: ausencia de pacientes asignados en la landing y falta de evidencia automatizada del contrato textual real del `409` en la UI.
