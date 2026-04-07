# Matriz de Riesgos ASD - operational-access-foundation

## 1. Resumen

Contexto base del riesgo:

- Proyecto: Sistema Inteligente de Gestion de Turnos Medicos.
- Objetivo de SPEC-004: habilitar operacion interna con auth, Perfiles y roles.
- Excepciones vigentes: pantalla publica sin auth, redireccion del rol doctor a una ruta publica, E2E auth-aware versionado ausente y branch protection manual.

Total: 8 riesgos | Alto (A): 6 | Medio (S): 1 | Bajo (D): 1

Leyenda ASD:

- A = testing obligatorio, bloquea release si no tiene mitigacion aceptable.
- S = testing recomendado, debe documentarse si se difiere.
- D = testing opcional o control de proceso, priorizable en backlog.

## 2. Matriz de riesgos

| ID    | HU / Area                      | Descripcion del riesgo                                                                                                                                                         | Factores de riesgo                                                        | Nivel ASD | Testing requerido  | Mitigacion / control actual                                                            |
| ----- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------- | ------------------ | -------------------------------------------------------------------------------------- |
| R-001 | HU-01                          | Un token valido podria considerarse suficiente aunque el Perfil no exista o este inactivo                                                                                      | Auth critica, datos personales, feature nueva                             | A         | Obligatorio        | `FirebaseAuthGuard`, `ProfileServiceImpl`, `AuthController` y pruebas 401/403          |
| R-002 | HU-03                          | La matriz de permisos puede divergir entre backend y frontend, especialmente porque el login del rol doctor hoy aterriza en la home publica en lugar de un modulo permitido    | Reglas de negocio complejas, multiples capas, alta frecuencia de uso      | A         | Obligatorio        | `RoleGuard`, `RoleGate`, `/registration` protegido y pruebas de bloqueo por rol        |
| R-003 | HU-03                          | Un medico podria operar el contexto de otro si falla la validacion de ownership                                                                                                | Autorizacion critica, impacto operativo directo                           | A         | Obligatorio        | `DoctorContextGuard` y pruebas de check-in/check-out propio vs ajeno                   |
| R-004 | Privacidad / Excepcion publica | La pantalla publica sigue mostrando nombres de pacientes sin autenticacion                                                                                                     | Datos personales expuestos, excepcion operativa heredada                  | A         | Obligatorio        | Riesgo parcialmente mitigado; requiere decision explicita del negocio o anonimizar     |
| R-005 | DevOps / Semana 3              | La pipeline existe, pero el gate sigue incompleto: frontend no fuerza threshold de coverage y el paso E2E ejecuta un archivo Jest via `ts-node` en vez de un runner de pruebas | Gate de calidad incompleto, falsa confianza de release                    | A         | Obligatorio        | Workflow versionado, thresholds presentes en producer/consumer y reportes de coverage  |
| R-006 | HU-01 a HU-03                  | No existe un E2E auth-aware completo del journey login -> Perfil -> operacion protegida; el E2E versionado sigue cubriendo el contrato publico anterior                        | Cobertura black-box incompleta, contrato critico sin evidencia end-to-end | A         | Obligatorio        | Integracion fuerte en producer y frontend; falta automatizacion end-to-end autenticada |
| R-007 | Frontend auth                  | La estrategia de lazy-loading para Firebase/Auth puede degradarse por cambios de env, SSR o build                                                                              | Codigo nuevo, dependencias externas, build sensible a entorno             | S         | Recomendado        | `firebase.ts`, `env.ts`, pruebas de `useAuth` y build limpio reportado                 |
| R-008 | Gobierno de release            | Branch protection y aprobaciones requeridas no viven en el repo y pueden quedar sin configurar                                                                                 | Control de proceso externo                                                | D         | Opcional / proceso | Configuracion manual en GitHub                                                         |

## 3. Plan de mitigacion para riesgos A

### R-001 - Token valido sin Perfil operativo usable

- Mitigacion actual:
  - Guard de backend resuelve Perfil activo antes de autorizar.
  - Pruebas unitarias e integracion cubren Perfil faltante e inactivo.
  - Frontend limpia la sesion cuando falla `resolveSession`.
- Falta para cerrar:
  - E2E autenticado completo entre frontend y producer.
- Bloquea release: Si.

### R-002 - Drift entre permisos backend y frontend

- Mitigacion actual:
  - Backend sigue siendo la fuente de verdad con `RoleGuard`.
  - Frontend agrega `RoleGate` y `useRoleGuard`.
  - Hay pruebas de bloqueo de rol tanto en producer como en frontend.
- Falta para cerrar:
  - Automatizar una matriz black-box de permisos por rol y ruta.
  - Corregir la redireccion post-login del rol doctor para que aterrice en un modulo operativo permitido.
- Bloquea release: Si.

### R-003 - Falla de ownership del medico

- Mitigacion actual:
  - `DoctorContextGuard` exige contexto propio.
  - Integracion de `DoctorController` cubre permitido y rechazo 403.
- Falta para cerrar:
  - Prueba manual o E2E del flujo desde la UI de medico cuando exista landing propia.
- Bloquea release: Si.

### R-004 - Exposicion publica de nombres de pacientes

- Mitigacion actual:
  - No hay mitigacion tecnica suficiente en el estado actual; es una excepcion de producto para no romper la demo publica.
- Recomendacion:
  - Anonimizar nombres en la pantalla publica.
  - Reemplazar nombre visible por codigo corto.
  - Dejar aceptacion explicita del riesgo si se mantiene el comportamiento actual.
- Bloquea release: Si, salvo aceptacion explicita del negocio.

### R-005 - Falsa sensacion de pipeline completamente bloqueante

- Mitigacion actual:
  - `ci.yml` versiona la ruta de build, pruebas y seguridad.
  - Existe separacion de jobs por nivel.
  - Producer y consumer ya fuerzan threshold global de cobertura.
- Falta para cerrar:
  - Agregar `coverageThreshold` equivalente en frontend.
  - Ejecutar el E2E con Jest/Supertest real en lugar de cargar el spec con `ts-node`.
  - Adjuntar evidencia remota de Actions verde.
- Bloquea release: Si.

### R-006 - No existe un E2E auth-aware completo del journey login -> Perfil -> operacion protegida

- Mitigacion actual:
  - Integracion fuerte en producer y frontend; falta automatizacion end-to-end autenticada.
- Falta para cerrar:
  - Versionar un E2E Caja Negra que use el contrato actual de SPEC-004 (`POST /auth/session` + operacion protegida con Bearer token).
  - Remover o actualizar el E2E legado que hoy sigue apuntando al contrato pre-auth.
- Bloquea release: Si.

## 4. Evidencia pendiente y riesgos aceptados temporalmente

- No existe en este workspace un link de GitHub Actions verde; esa evidencia depende de push remoto.
- El repo no puede aplicar por si solo branch protection; requiere intervencion manual.
- No hay evidencia en el repo de PR formal de release ni de tag remoto validado en GitHub.
- La pantalla publica sigue accesible y mostrando `fullName`; esto debe asumirse como riesgo aceptado o corregirse antes del cierre remoto.
- El E2E actual del repo sigue cubriendo el flujo publico legado y, ademas, el workflow lo invoca con un runner inconsistente para un archivo Jest.

## 5. Decision QA local

Resultado QA local: no cierre.

Interpretacion:

- La documentacion QA y la evidencia de pruebas unitarias e integracion son fuertes y muestran que la mayor parte de SPEC-004 esta implementada en codigo.
- Aun asi, el repo mantiene blockers internos para declarar la spec como `IMPLEMENTED`: gap de E2E auth-aware, gate incompleto de coverage en frontend y redireccion post-login del rol doctor hacia una ruta publica.
- El cierre remoto adicional sigue dependiendo de evidencia externa de GitHub Actions, branch protection y release/tag.
