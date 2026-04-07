# Casos Gherkin QA - doctor-operational-landing

## Alcance

Feature de landing operativa del doctor en frontend. Se cubren la redireccion post-login al panel dedicado, el acceso solo para rol Medico, la visualizacion del estado operativo, las acciones de disponibilidad y las condiciones de error asociadas a la vinculacion operativa y al check-out con paciente asignado.

## Flujos criticos priorizados

- Redireccion del doctor autenticado a su panel operativo.
- Visualizacion del estado actual del doctor en la landing dedicada.
- Check-in desde estado fuera de consultorio.
- Check-out desde estado disponible.
- Bloqueo de check-out cuando hay un paciente asignado.
- Error operativo cuando el Perfil no tiene `doctor_id`.
- Bloqueo de acceso para roles distintos a Medico.
- Visibilidad de pacientes asignados declarada en la HU y descripcion de la spec.

```gherkin
#language: es
Caracteristica: Landing operativa del doctor autenticado

  @smoke @critico @happy-path @hu-01
  Escenario: El doctor autenticado aterriza en su panel operativo
    Dado que el Usuario tiene rol Medico y Perfil activo vinculado a un medico
    Cuando inicia sesion correctamente
    Entonces el sistema lo dirige a su panel operativo
    Y visualiza su nombre, consultorio y estado actual

  @happy-path @critico @hu-01
  Escenario: El doctor reporta disponibilidad desde su panel
    Dado que el Medico ya se encuentra en su panel operativo con estado Fuera de consultorio
    Cuando solicita iniciar disponibilidad
    Entonces el sistema cambia su estado a Disponible
    Y confirma que el cambio fue aplicado

  @happy-path @hu-01
  Escenario: El doctor sale del consultorio cuando no tiene paciente asignado
    Dado que el Medico se encuentra Disponible y sin paciente asignado
    Cuando solicita salir del consultorio
    Entonces el sistema cambia su estado a Fuera de consultorio
    Y mantiene el panel operativo actualizado

  @error-path @critico @hu-01
  Escenario: El doctor intenta salir del consultorio mientras atiende un paciente
    Dado que el Medico tiene un paciente asignado en atencion
    Cuando solicita salir del consultorio
    Entonces el sistema informa que no puede salir porque tiene un paciente asignado
    Y conserva su estado operativo actual

  @error-path @hu-01
  Escenario: El doctor accede al panel sin vinculacion operativa
    Dado que el Usuario tiene rol Medico y Perfil activo sin vinculacion a un medico
    Cuando entra a su panel operativo
    Entonces el sistema informa que su Perfil no esta vinculado a un medico
    Y no habilita acciones operativas

  @edge-case @critico @seguridad @hu-01
  Escenario: Un usuario sin rol Medico intenta acceder al panel operativo del doctor
    Dado que el Usuario autenticado tiene un rol diferente a Medico
    Cuando intenta entrar al panel operativo del doctor
    Entonces el sistema bloquea el acceso
    Y muestra un mensaje de permisos insuficientes

  @happy-path @hu-01 @alcance-narrativo
  Escenario: El doctor visualiza sus pacientes asignados
    Dado que el Medico tiene pacientes asignados a su contexto operativo
    Cuando consulta su panel operativo
    Entonces el sistema muestra la lista de pacientes asignados
    Y cada paciente queda asociado a su contexto actual
```

## Datos de prueba sinteticos

| Escenario               | Campo             | Valido                                 | Invalido                                | Borde                                          |
| ----------------------- | ----------------- | -------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| Aterrizaje del doctor   | Perfil operativo  | Medico activo vinculado                | rol admin o recepcionista               | Medico activo con `doctor_id` nulo             |
| Reportar disponibilidad | Estado inicial    | `offline`                              | `available`                             | click repetido con loading activo              |
| Salir de consultorio    | Estado operativo  | `available` sin paciente asignado      | `offline`                               | transicion inmediata despues de check-in       |
| Check-out bloqueado     | Asignacion actual | medico en `busy` con paciente asignado | medico sin asignacion                   | mensaje de rechazo proveniente del backend     |
| Perfil sin vinculacion  | Vinculo de medico | `doctor_id` valido                     | `doctor_id` nulo                        | perfil activo sin datos operativos adicionales |
| Acceso no autorizado    | Rol               | `doctor`                               | `admin`, `recepcionista`                | usuario autenticado sin Perfil operativo       |
| Pacientes asignados     | Lista operativa   | 1 o mas pacientes asignados            | lista vacia cuando existen asignaciones | multiples pacientes simultaneos                |

## Evidencia actual observada en repo

Cobertura encontrada en el repo revisado:

- `frontend/test/app/login/page.spec.tsx` valida la redireccion del rol doctor al panel dedicado, incluyendo el caso con `doctor_id` nulo.
- `frontend/test/app/doctor/page.spec.tsx` valida bloqueo por rol, render del dashboard, loading/error, feedback de exito y el wiring de acciones check-in/check-out a nivel de pagina.
- `frontend/test/hooks/useDoctorDashboard.spec.ts` valida carga del medico, error por `doctor_id` nulo, transiciones de check-in/check-out, `successMessage`, refetch y rechazo de check-out en estado `busy` a nivel de hook.
- `frontend/test/components/DoctorStatusCard.spec.tsx` valida render por estado y habilitacion/deshabilitacion de botones.
- `frontend/test/services/doctorService.spec.ts` valida que `checkInDoctor` y `checkOutDoctor` preserven `body.message` en respuestas no OK y que hagan fallback a `HTTP_ERROR` cuando el backend no entrega mensaje parseable.
- `backend/producer/src/application/use-cases/doctor.service.impl.ts`, `backend/producer/src/doctors/doctor.controller.ts` y `backend/producer/test/src/doctors/doctor.controller.spec.ts` evidencian que el backend rechaza el check-out en estado `busy` con `409` y un mensaje de negocio, aunque la redaccion actual no coincide literalmente con la frase citada en la spec.

Gaps observados en la evidencia real:

- No se encontro una lista o seccion de pacientes asignados en la implementacion revisada del panel del doctor.
- No se encontro una automatizacion que compruebe de punta a punta que el mensaje `409` real del backend es exactamente el que termina renderizado en el dashboard; los tests frontend usan mocks y validan la redaccion de la spec, mientras el backend actual responde con una frase centrada en `no puede hacer check-out`.
- No se encontro una prueba dedicada de servicio para `getDoctorById`, y los tests actuales de `doctorService` no verifican URL ni header `Authorization` para las llamadas `GET`/`PATCH`.
