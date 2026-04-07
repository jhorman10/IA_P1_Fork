# Test Cases AI - SPEC-004 Operational Access Foundation

## 1. Objetivo

Este documento consolida casos de prueba generados con apoyo de IA y refinados por QA a partir del contexto de negocio corregido, las tres HUs de SPEC-004 y las excepciones explicitadas para el estado actual del sistema.

## 2. Base de contexto usada para refinar casos

- Proyecto: Sistema Inteligente de Gestion de Turnos Medicos.
- Objetivo: operar el sistema con personal interno autenticado, Perfiles y control por roles.
- Flujos criticos: login operativo, gestion de Perfiles, registro de turnos protegido, contexto medico propio y continuidad del flujo publico.
- Excepciones: pantalla publica sin auth, doctor sin landing dedicada y ausencia de E2E auth-aware completo.
- Restriccion transversal: proteccion de datos personales y decisiones de privacidad deben quedar explicitadas.

## 3. Matriz de casos refinados

| ID       | HU / Flujo        | Caso base generado por IA                   | Ajuste QA aplicado                                                                                  | Nivel                    | Verificar / Validar | Datos sinteticos                                    | Resultado esperado                                                       | Evidencia actual                                                               |
| -------- | ----------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------ | ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| TC-AI-01 | HU-01             | Usuario interno inicia sesion correctamente | Se exige resolucion de Perfil y redireccion real de admin a gestion de Perfiles                     | Integracion + componente | Validar             | `admin@clinic.local`, Perfil activo admin           | Sesion operativa resuelta y aterrizaje en `/admin/profiles`              | `auth.controller.spec.ts`, `app/login/page.spec.tsx`                           |
| TC-AI-02 | HU-01             | Usuario con credenciales invalidas ve error | Se mapea mensaje tecnico Firebase a mensaje amigable de negocio                                     | Componente               | Verificar           | `recepcion@clinic.local` + password incorrecto      | Mensaje amigable sin exponer error tecnico                               | `app/login/page.spec.tsx`                                                      |
| TC-AI-03 | HU-01             | Token valido sin Perfil operativo           | Se exige 403 backend y sesion no usable en frontend                                                 | Integracion              | Validar             | Bearer valido sin Perfil asociado                   | No hay acceso a modulos internos                                         | `auth.controller.spec.ts`                                                      |
| TC-AI-04 | HU-01             | La sesion expira o falla despues del login  | Se valida limpieza total del estado local y sign-out defensivo                                      | Unit                     | Validar             | `resolveSession` lanza `Perfil no configurado`      | Se limpia token, Perfil y se expone error                                | `useAuth.session.spec.tsx`                                                     |
| TC-AI-05 | HU-02             | Admin crea un Perfil de recepcionista       | Se exige estado `active` por defecto y payload consistente                                          | Integracion              | Verificar           | `uid-recep-01`, `recepcion.nueva@clinic.local`      | Perfil creado activo                                                     | `profiles.controller.spec.ts`, `mongoose-profile.repository.spec.ts`           |
| TC-AI-06 | HU-02             | Se intenta crear Perfil duplicado           | Se separan duplicado por `uid` y por email                                                          | Unit                     | Validar             | `uid-admin`, `admin@clinic.example`                 | 409 por conflicto                                                        | `profile.service.impl.spec.ts`                                                 |
| TC-AI-07 | HU-02             | Se crea o edita un doctor sin `doctor_id`   | Se fuerza la regla tanto en create como en update                                                   | Unit                     | Validar             | Rol `doctor` sin vinculacion                        | 400 y no se persiste el cambio                                           | `profile.service.impl.spec.ts`, `ProfileFormModal.tsx`                         |
| TC-AI-08 | HU-02             | Recepcionista intenta gestionar Perfiles    | Se cubren create y list para asegurar admin-only                                                    | Integracion              | Validar             | Bearer de recepcionista activo                      | 403 y sin ejecucion del servicio                                         | `profiles.controller.spec.ts`                                                  |
| TC-AI-09 | HU-03             | Recepcionista registra turnos               | Se exige que el frontend reenvie Bearer token y producer acepte la operacion                        | Unit + integracion       | Verificar           | Token `id-token-123`, prioridad `high`              | Token reenviado y backend acepta registro                                | `useAppointmentRegistration.spec.ts`, `spec-004-auth-flow.integration.spec.ts` |
| TC-AI-10 | HU-03             | Doctor intenta registrar turnos             | Se exige doble barrera: UI bloqueada y backend 403                                                  | Componente + integracion | Validar             | Perfil doctor activo                                | Sin acceso a registro                                                    | `RoleGate.spec.tsx`, `spec-004-auth-flow.integration.spec.ts`                  |
| TC-AI-11 | HU-03             | Doctor opera su propio contexto             | Se valida check-in exitoso solo sobre su `doctor_id`                                                | Integracion              | Validar             | Doctor con `doctor_id=doc-001`                      | Check-in permitido en su propio contexto                                 | `doctor.controller.spec.ts`                                                    |
| TC-AI-12 | HU-03             | Doctor opera contexto ajeno                 | Se eleva como caso critico de seguridad y ownership                                                 | Integracion              | Validar             | Doctor con `doctor_id=doc-001` intentando `doc-002` | 403 y sin accion operativa                                               | `doctor.controller.spec.ts`, `doctor-context.guard.spec.ts`                    |
| TC-AI-13 | Excepcion publica | Home publica continua disponible            | Se mantiene como excepcion operativa y riesgo de privacidad documentado                             | Black-box manual         | Validar             | Navegacion sin autenticacion                        | La pantalla publica sigue mostrando turnos y el riesgo queda explicitado | `frontend/src/app/page.tsx`, `backend/e2e/appointment.e2e.spec.ts`             |
| TC-AI-14 | Pipeline          | La pipeline demuestra calidad automatizada  | Se aclara que hoy la evidencia completa requiere push remoto y que integracion/E2E no son gate duro | Pipeline                 | Verificar           | Push o PR real                                      | Actions ejecuta jobs definidos; evidencia remota pendiente               | `.github/workflows/ci.yml`                                                     |

## 4. Ajustes del probador sobre la salida IA

| Caso IA original                                     | Ajuste QA                                                            | Justificacion                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| Login exitoso generico                               | Se vincula a Perfil activo y a la redireccion real por rol           | En SPEC-004 el login tecnico sin Perfil no es suficiente      |
| CRUD de Perfiles happy path                          | Se agregan duplicados por `uid` y email, mas `doctor_id` obligatorio | Son las reglas de negocio con mayor impacto operativo         |
| Acceso por rol solo en UI                            | Se exige enforcement backend y bloqueo frontend                      | La UI no puede ser la fuente de verdad de seguridad           |
| Sesion expirada como 401 generico                    | Se refina a fallo de `resolveSession` y limpieza local               | Ese es el comportamiento observable actual del frontend       |
| Continuidad del flujo publico como happy path neutro | Se reetiqueta como excepcion operativa con riesgo de privacidad      | El contexto de negocio corregido obliga a dejarlo explicitado |
| E2E auth completo asumido                            | Se degrada a pendiente de automatizacion y evidencia manual          | El repo hoy no contiene ese journey black-box                 |
| Pipeline verde como hecho                            | Se marca como evidencia remota pendiente                             | El repo solo versiona el workflow, no el resultado remoto     |

## 5. Datos de prueba sinteticos recomendados

| Dominio             | Valor valido                       | Valor invalido       | Borde                                                |
| ------------------- | ---------------------------------- | -------------------- | ---------------------------------------------------- |
| Email institucional | `admin@clinic.local`               | `admin-clinic.local` | espacios alrededor antes de sanitizar                |
| UID Firebase        | `uid-admin-001`                    | vacio                | UID con espacios laterales                           |
| Rol                 | `admin`, `recepcionista`, `doctor` | `superadmin`         | cambio de `recepcionista` a `doctor` sin `doctor_id` |
| Estado              | `active`, `inactive`               | `disabled`           | inactivar Perfil con sesion abierta                  |
| Doctor context      | `doc-001` propio                   | `doc-002` ajeno      | medico sin `doctor_id` vinculado                     |

## 6. Lectura QA final sobre los casos IA

La IA acelera la enumeracion inicial de escenarios, pero en SPEC-004 el valor real aparece cuando QA obliga a aterrizar cada caso contra el contexto corregido del negocio:

- auth tecnica mas Perfil activo,
- enforcement doble UI + backend,
- contexto medico propio,
- continuidad del flujo publico como excepcion,
- y honestidad respecto de lo que aun depende de una corrida remota o de automatizacion futura.
