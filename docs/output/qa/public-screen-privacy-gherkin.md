# Casos Gherkin QA - public-screen-privacy

## Alcance

Feature de privacidad para la pantalla publica de turnos. El alcance QA revisado cubre la anonimizacion de nombres en la home publica, la conservacion del nombre completo en el dashboard autenticado y la notificacion publica de asignacion. No incluye cambios backend ni modificaciones al contrato del WebSocket.

## Flujos criticos priorizados

- Anonimizacion de nombres multi-termino en la pantalla publica.
- Conservacion del nombre completo en el dashboard autenticado.
- Respeto de nombres de un solo termino.
- Formato correcto para nombres de dos terminos.
- Notificacion publica de asignacion con nombre anonimizado.
- Manejo seguro de nombre vacio o compuesto solo por espacios.

```gherkin
#language: es
Caracteristica: Privacidad de nombres en la pantalla publica de turnos

  @smoke @critico @happy-path @hu-01
  Escenario: La pantalla publica muestra el primer nombre y las iniciales restantes
    Dado que un paciente con nombre "Juan Carlos Perez Lopez" tiene un turno visible en la sala de espera publica
    Cuando la pantalla publica actualiza la lista de turnos
    Entonces el nombre visible es "Juan C. P. L."
    Y el nombre completo no queda expuesto en la tarjeta publica

  @smoke @critico @happy-path @hu-01
  Escenario: La notificacion publica de turno asignado conserva la anonimizacion
    Dado que un paciente con nombre "Juan Carlos Perez Lopez" pasa de espera a llamado
    Cuando la pantalla publica muestra la notificacion de asignacion
    Entonces la notificacion muestra "Juan C. P. L."
    Y mantiene visible el contexto operativo del consultorio y del medico asignado

  @smoke @critico @seguridad @happy-path @hu-01
  Escenario: El dashboard autenticado muestra el nombre completo para la operacion interna
    Dado que un usuario operativo autenticado consulta el dashboard interno
    Cuando revisa los turnos en espera, llamados y completados
    Entonces ve el nombre completo de cada paciente
    Y no ve la version anonimizada en esa vista

  @edge-case @hu-01
  Escenario: Un nombre de un solo termino permanece sin truncarse
    Dado que un paciente tiene nombre "Maria"
    Cuando la pantalla publica muestra su turno
    Entonces el nombre visible es "Maria"

  @edge-case @hu-01
  Escenario: Un nombre de dos terminos usa solo una inicial adicional
    Dado que un paciente tiene nombre "Ana Garcia"
    Cuando la pantalla publica muestra su turno
    Entonces el nombre visible es "Ana G."

  @error-path @hu-01
  Escenario: La pantalla publica recibe un nombre vacio o en blanco
    Dado que existe un turno con nombre vacio o compuesto solo por espacios
    Cuando la pantalla publica intenta renderizarlo
    Entonces la interfaz no falla
    Y el valor visible queda vacio sin exponer texto basura
```

## Datos de prueba sinteticos

| Escenario                        | Campo                      | Valido                        | Invalido                                          | Borde                                                    |
| -------------------------------- | -------------------------- | ----------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| Pantalla publica anonimizada     | Nombre del paciente        | `Juan Carlos Perez Lopez`     | nombre completo visible en pantalla publica       | `Juan  Carlos  Perez` con espacios extra                 |
| Notificacion publica anonimizada | Nombre en cambio de estado | `Juan Carlos Perez Lopez`     | nombre completo visible en la notificacion        | cambio de `waiting` a `called` sobre un turno ya visible |
| Dashboard autenticado            | Contexto de visualizacion  | usuario operativo autenticado | pantalla publica o usuario sin contexto operativo | reuso de componentes compartidos                         |
| Nombre de un solo termino        | Nombre del paciente        | `Maria`                       | truncado a inicial                                | un termino con espacios laterales                        |
| Nombre de dos terminos           | Nombre del paciente        | `Ana Garcia`                  | `Ana Garcia` visible completo en pantalla publica | dos terminos con distinta capitalizacion                 |
| Nombre vacio o en blanco         | Nombre del paciente        | `""`                          | crash de render                                   | `"   "`                                                  |

## Evidencia actual observada en repo

Cobertura encontrada en el repo revisado:

- `frontend/test/lib/anonymizeName.spec.ts` cubre multi-termino, un termino, dos terminos, string vacio, whitespace extra e iniciales en mayuscula.
- `frontend/test/components/WaitingAppointmentCard.spec.tsx`, `frontend/test/components/CalledAppointmentCard.spec.tsx` y `frontend/test/components/CompletedAppointmentCard.spec.tsx` validan anonimizacion por defecto y nombre completo cuando `anonymize=false`.
- `frontend/test/components/AssignmentNotification.spec.tsx` valida anonimizacion por defecto y nombre completo en contexto autenticado.
- `frontend/test/app/page.spec.tsx` valida que la pantalla publica renderiza nombres anonimizados en los turnos mostrados.
- `frontend/test/app/dashboard/page.spec.tsx` valida que el dashboard autenticado mantiene nombres completos y no muestra variantes anonimizadas.
- `frontend/test/app/page.spec003.spec.tsx` valida que la notificacion aparece cuando un turno pasa de espera a llamado.

Gaps observados en la evidencia real:

- No se encontro una asercion de integracion a nivel de pagina que verifique el texto anonimizado dentro de la notificacion una vez ocurre la transicion `waiting -> called`.
- No se encontraron pruebas backend o de contrato WebSocket especificas de SPEC-009, consistente con el alcance de la spec pero relevante como riesgo de mantenimiento.
- Esta pasada QA no re-ejecuto las suites localmente; la referencia de verde proviene de la validacion independiente reportada.
