# Casos Gherkin QA - appointment-lifecycle-management

## Alcance

Feature de gestion explicita del ciclo de vida de turnos. Se cubren la finalizacion manual por el doctor, la cancelacion por recepcionista o admin, las validaciones de ownership y estado, la propagacion asincrona al consumer y la actualizacion de UI por servicios y realtime.

## Flujos criticos priorizados

- Doctor completa su turno actual en estado `called`.
- El sistema dispara reasignacion inmediata despues de completar.
- Bloqueo al intentar completar el turno de otro doctor o un turno fuera de estado valido.
- Recepcionista o admin cancelan un turno `waiting`.
- Bloqueo de cancelacion para roles no autorizados o estados no validos.
- Concurrencia entre auto-expiracion y finalizacion explicita.

```gherkin
#language: es
Caracteristica: Gestion explicita del ciclo de vida de turnos

  @smoke @critico @hu-01
  Escenario: Doctor finaliza correctamente el turno que esta atendiendo
    Dado que el Doctor tiene un turno asignado en atencion
    Cuando marca la atencion como finalizada
    Entonces el sistema acepta la accion
    Y el turno queda completado
    Y el doctor vuelve a estar disponible
    Y las pantallas operativas reciben la actualizacion

  @happy-path @critico @hu-01
  Escenario: El sistema ejecuta reasignacion inmediata despues de completar
    Dado que el Doctor finaliza su turno actual
    Y existe al menos un paciente esperando en cola
    Cuando el flujo de completado termina
    Entonces el sistema dispara el ciclo de asignacion
    Y el siguiente paciente elegible puede ser atendido sin esperar al timer

  @error-path @critico @hu-01
  Escenario: Doctor intenta completar el turno de otro medico
    Dado que existe un turno en atencion asignado a otro medico
    Cuando el Doctor intenta finalizarlo
    Entonces el sistema rechaza la operacion
    Y no modifica el estado del turno ni del medico asignado

  @error-path @hu-01
  Escenario: Se intenta completar un turno que no esta en atencion
    Dado que el turno esta en espera, cancelado o ya completado
    Cuando un actor autorizado intenta finalizarlo
    Entonces el sistema rechaza la operacion con conflicto de estado

  @edge-case @hu-01
  Escenario: El turno auto-expira mientras el doctor intenta completarlo
    Dado que el turno esta cerca de completar por timer
    Cuando el Doctor intenta finalizarlo casi al mismo tiempo
    Entonces el sistema resuelve la transicion sin duplicar efectos
    Y deja el turno en un estado terminal consistente

  @smoke @critico @hu-02
  Escenario: Recepcionista cancela un turno en espera
    Dado que existe un turno en espera y el paciente ya no esta en sala
    Cuando la Recepcionista cancela el turno
    Entonces el sistema acepta la accion
    Y el turno queda cancelado
    Y la cola se recalcula automaticamente
    Y las pantallas reciben la actualizacion

  @happy-path @hu-02
  Escenario: Admin cancela un turno en espera
    Dado que existe un turno en espera
    Cuando el Administrador decide cancelarlo
    Entonces el sistema procesa la cancelacion con exito

  @error-path @critico @hu-02
  Escenario: Doctor intenta cancelar un turno
    Dado que el actor autenticado tiene rol Doctor
    Cuando intenta cancelar un turno en espera
    Entonces el sistema rechaza la operacion por permisos

  @error-path @hu-02
  Escenario: Se intenta cancelar un turno que ya no esta en espera
    Dado que el turno ya fue llamado, completado o cancelado
    Cuando un actor autorizado intenta cancelarlo
    Entonces el sistema rechaza la operacion con conflicto de estado
```

## Datos de prueba sinteticos

| Escenario              | Campo            | Valido                   | Invalido                           | Borde                                                      |
| ---------------------- | ---------------- | ------------------------ | ---------------------------------- | ---------------------------------------------------------- |
| Finalizacion exitosa   | Estado del turno | `called`                 | `waiting`                          | `completed` por carrera con timer                          |
| Finalizacion exitosa   | Ownership doctor | `doctor_id` propio       | `doctor_id` ajeno                  | doctor sin `doctor_id` operativo                           |
| Reasignacion inmediata | Cola disponible  | 1 o mas turnos `waiting` | cola vacia                         | paciente de prioridad alta inmediatamente detras           |
| Cancelacion exitosa    | Rol actor        | `recepcionista`, `admin` | `doctor`                           | admin operando sobre el mismo turno visto en dashboard     |
| Cancelacion exitosa    | Estado del turno | `waiting`                | `called`, `completed`, `cancelled` | turno cancelado inmediatamente despues de abrir la tarjeta |
| Concurrencia           | Fuente de cierre | finalizacion explicita   | auto-expiracion previa             | casi simultaneo entre timer y PATCH                        |

## Evidencia actual observada en repo

Cobertura encontrada en el repo revisado:

- `backend/producer/test/src/appointments/appointment-lifecycle.controller.spec.ts` valida respuestas 200, 403, 404 y 409 para completar y cancelar, incluyendo ownership del doctor.
- `backend/consumer/test/src/application/use-cases/complete-appointment.use-case.impl.spec.ts` valida `called -> completed`, liberacion de doctor, auditoria, notificacion y disparo de `assignUseCase.execute()`.
- `backend/consumer/test/src/application/use-cases/cancel-appointment.use-case.impl.spec.ts` valida `waiting -> cancelled`, notificacion y auditoria.
- `backend/consumer/test/src/consumer.controller.spec.ts` valida ACK y NACK de los eventos `complete_appointment` y `cancel_appointment`.
- `frontend/test/services/appointmentService.spec.ts` valida endpoints PATCH, header `Authorization` y preservacion de mensajes de negocio para errores 409.
- `frontend/test/hooks/useDoctorDashboard.spec.ts` valida `completeCurrentAppointment`, refresh del estado del doctor y propagacion del error de backend.
- `frontend/test/app/doctor/page.spec.tsx` valida render del paciente actual, boton `Finalizar atencion` y estado `Procesando...`.
- `frontend/test/app/dashboard/page.spec.tsx` valida accion de cancelar, estado `Cancelando...` y recuperacion del boton tras exito o error, ademas del historial de turnos cancelados.

Gaps observados en la evidencia real:

- No se reviso una prueba concurrente deterministica para el caso `auto-expira` vs `complete` casi simultaneo.
- La reasignacion inmediata posterior al completado queda evidenciada por la invocacion de `assignUseCase.execute()`, no por un E2E especifico que verifique un siguiente paciente concreto durante esta pasada QA.
