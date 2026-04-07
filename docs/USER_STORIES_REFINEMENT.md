# User Stories Refinement - SPEC-004 Operational Access Foundation

## 1. Objetivo del refinamiento

Este documento toma las tres historias nucleares de SPEC-004 y las refina con enfoque INVEST, testabilidad y alineacion con el contexto de negocio corregido.

La meta no es reescribir la spec, sino volver cada HU mas util para QA, desarrollo y evaluacion:

- con criterios verificables,
- con dependencias y riesgos visibles,
- con roles y limitaciones consistentes,
- y con diferencias explicitas entre lo esperado por la spec y lo actualmente materializado.

## 2. Contexto base aplicado al refinamiento

- Proyecto: Sistema Inteligente de Gestion de Turnos Medicos.
- Objetivo: operar el sistema con personal interno autenticado, Perfiles y control por roles.
- Flujos criticos: login operativo, administracion de Perfiles, registro de turnos protegido, contexto medico propio y continuidad del flujo publico.
- Excepciones: pantalla publica sin auth, doctor sin landing dedicada, WebSocket auth fuera de alcance y ausencia de E2E auth-aware.

## 3. Resumen ejecutivo por HU

| HU                                          | Valor principal                           | Estado implementado                              | Principal gap QA                                                        |
| ------------------------------------------- | ----------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| HU-01 Inicio de sesion con Perfil operativo | Crear identidad operativa y sesion usable | Backend y frontend implementados                 | La landing del doctor no esta alineada a un modulo operativo especifico |
| HU-02 Administracion de Perfiles y roles    | Permitir control centralizado del acceso  | Backend y frontend implementados                 | Falta evidencia black-box completa del CRUD autenticado                 |
| HU-03 Acceso por rol a modulos operativos   | Aplicar separacion de responsabilidades   | Backend implementado y UI parcialmente protegida | No existe E2E auth-aware completo                                       |

## 4. HU-01 Refinada

### HU refinada para desarrollo y QA

Como Usuario interno con cuenta institucional valida, quiero que el sistema autentique mi identidad tecnica, resuelva mi Perfil operativo activo y me redirija a una experiencia coherente con mi rol, para operar solo dentro del alcance permitido y sin conservar sesiones rotas o parciales.

### Ajustes QA aplicados

- Se separa autenticacion tecnica de autorizacion operativa.
- Se exige que un token valido sin Perfil activo se trate como error de negocio.
- Se vuelve criterio testable la limpieza de sesion local cuando falla la resolucion del Perfil.
- Se reconoce la implementacion real de redireccion actual:
  - admin -> `/admin/profiles`
  - recepcionista -> `/registration`
  - doctor -> `/` (ruta publica actual, no modulo dedicado)

### Criterios de aceptacion refinados

1. Un Usuario con Perfil activo obtiene sesion operativa y redireccion coherente con su rol implementado.
2. Un Usuario autenticado sin Perfil operativo recibe 403 y no conserva acceso frontend usable.
3. Si la sesion deja de resolverse despues del bootstrap, el frontend limpia estado y expone el error.
4. Los errores de credenciales se traducen a mensajes amigables.

## 5. HU-02 Refinada

### HU refinada para desarrollo y QA

Como Administrador autenticado, quiero gestionar Perfiles operativos con validaciones de unicidad, estado y vinculacion medica, para mantener el acceso interno bajo control centralizado y evitar configuraciones inconsistentes.

### Ajustes QA aplicados

- Se explicita la unicidad por `uid` y por email institucional.
- Se eleva a regla obligatoria que el rol `doctor` exija `doctor_id`.
- Se reconoce el default operativo real: los Perfiles nuevos nacen `active`.
- Se vuelve testable la edicion de estado y rol desde una UI admin-only.

### Criterios de aceptacion refinados

1. Solo admin puede crear, listar y actualizar Perfiles.
2. Un Perfil duplicado por `uid` o email se bloquea con 409.
3. Un Perfil doctor sin `doctor_id` se bloquea con 400.
4. Un Perfil nuevo queda activo por defecto.
5. Un Perfil inactivado deja de resolver sesion operativa en llamadas posteriores.

## 6. HU-03 Refinada

### HU refinada para desarrollo y QA

Como Usuario interno con Perfil activo, quiero que backend y frontend apliquen de forma consistente la matriz de permisos para registro, gestion de Perfiles y contexto medico, de modo que no exista forma util de operar fuera de mi responsabilidad aunque intente acceder por UI o por llamada directa.

### Ajustes QA aplicados

- Se distingue entre bloqueo de experiencia y enforcement real.
- Se hace explicita la regla de ownership del medico.
- Se ancla el comportamiento del registro a dos capas: `RoleGate` en frontend y guards en producer.
- Se documenta la diferencia actual entre permisos backend del rol doctor y su experiencia de aterrizaje en frontend.

### Criterios de aceptacion refinados

1. Admin y recepcionista pueden registrar turnos; doctor no.
2. Admin puede gestionar Perfiles; recepcionista y doctor no.
3. Doctor puede operar check-in/check-out solo sobre su `doctor_id` asociado.
4. La UI no debe sugerir accesos no permitidos, pero el backend sigue siendo la fuente de verdad.
5. La pantalla publica de espera sigue disponible sin autenticacion como excepcion operativa actual con riesgo de privacidad documentado.

## 7. Diferencias detectadas entre spec aprobada y estado implementado

| Tema               | Spec aprobada                    | Estado implementado                                 | Impacto QA                                 |
| ------------------ | -------------------------------- | --------------------------------------------------- | ------------------------------------------ |
| Landing del doctor | Modulo inicial permitido por rol | Redireccion actual a `/`                            | Riesgo medio de coherencia funcional       |
| E2E auth completo  | Deseable como cierre de Semana 3 | No existe automatizado                              | Riesgo medio de evidencia                  |
| Branch protection  | Parte del criterio de salida     | Requiere setting manual externo                     | Riesgo bajo de proceso                     |
| CI como gate duro  | Esperado por Semana 3            | Integracion/E2E no bloquean por `continue-on-error` | Riesgo alto de falsa confianza             |
| Pantalla publica   | Continuidad operativa            | Sigue visible sin auth y con riesgo de privacidad   | Riesgo alto si no hay aceptacion explicita |

## 8. Conclusiones del refinamiento

- Las tres HUs son claras, valiosas y testeables para sostener cierre local de implementacion.
- El mayor ajuste QA no es de negocio sino de evidencia: endurecer release evidence y automatizacion auth-aware.
- La mayor desviacion funcional actual es la experiencia del rol doctor.
- La mayor excepcion operativa actual es la pantalla publica sin auth y con datos visibles, que debe mantenerse solo con riesgo explicitado o mitigacion acordada.
