# Casos Gherkin QA - structured-operational-audit-trail

## Alcance

Se cubre la trazabilidad operativa estructurada para acciones internas del producer y la consulta administrativa de esa bitacora desde backend y frontend.

Estado de evidencia actualizado para esta revision:

- Backend: suite del interceptor con 14 tests verdes.
- Backend audit-focused: 6 suites, 36 tests verdes.
- Frontend revisado: page, filters, table, hook y service en verde.

Flujos priorizados:

- Registro automatico de acciones operativas exitosas.
- Deduplicacion de resolucion de sesion por ventana de 24 horas.
- Consulta administrativa read-only con filtros y paginacion.
- Restriccion de acceso a la bitacora solo para administradores.
- Continuidad del flujo principal aun si la escritura de auditoria falla.

```gherkin
#language: es
Caracteristica: Trazabilidad operativa estructurada de acciones internas y consulta administrativa

  @smoke @critico @happy-path @hu-01
  Escenario: Un administrador crea un perfil y la accion queda trazada
    Dado que un administrador autenticado opera sobre la gestion interna de perfiles
    Cuando registra un nuevo perfil valido
    Entonces la operacion se completa correctamente
    Y el sistema conserva la accion con su actor, objetivo y detalle de alta

  @happy-path @critico @hu-01
  Escenario: Un medico reporta disponibilidad y el cambio queda registrado
    Dado que un medico autentico opera sobre su propio contexto asistencial
    Cuando marca que esta disponible para atender
    Entonces el sistema confirma el cambio de estado
    Y la trazabilidad operativa conserva la accion de check-in

  @happy-path @critico @hu-01
  Escenario: Un medico finaliza su disponibilidad y el cambio queda registrado
    Dado que un medico autentico opera sobre su propio contexto asistencial
    Cuando marca que deja de estar disponible
    Entonces el sistema confirma el cambio de estado
    Y la trazabilidad operativa conserva la accion de check-out

  @happy-path @hu-01
  Escenario: Una recepcionista registra un turno y la accion queda disponible para auditoria
    Dado que una recepcionista autenticada registra un turno valido
    Cuando la operacion es aceptada por el sistema
    Entonces el turno entra al flujo operativo normal
    Y la accion queda disponible en la bitacora administrativa

  @error-path @hu-01
  Escenario: Una operacion rechazada por validacion no genera bitacora
    Dado que un usuario interno intenta ejecutar una operacion con datos invalidos
    Cuando el sistema rechaza la solicitud
    Entonces la accion principal no se completa
    Y no se crea un nuevo registro de trazabilidad operativa

  @error-path @critico @hu-01
  Escenario: La falla del repositorio de auditoria no bloquea la operacion principal
    Dado que la operacion de negocio principal es valida y puede completarse
    Y que la persistencia de auditoria presenta una falla transitoria
    Cuando el usuario ejecuta la accion
    Entonces el sistema responde con exito para la operacion principal
    Y deja evidencia tecnica del fallo de auditoria para seguimiento operativo

  @edge-case @hu-01
  Escenario: La resolucion de sesion solo se registra una vez por dia
    Dado que un usuario interno ya resolvio su sesion operativa en las ultimas 24 horas
    Cuando vuelve a resolver la sesion dentro de la misma ventana diaria
    Entonces el sistema mantiene la sesion operativa valida
    Y no duplica la entrada de auditoria de resolucion de sesion

  @smoke @critico @happy-path @hu-02
  Escenario: Un administrador consulta la bitacora y ve primero los eventos mas recientes
    Dado que existen acciones operativas registradas previamente
    Y que un administrador autenticado abre la bitacora administrativa
    Cuando carga la consulta inicial
    Entonces el sistema muestra los registros ordenados desde el mas reciente al mas antiguo
    Y presenta informacion legible de fecha, accion, actor y detalle

  @happy-path @hu-02
  Escenario: Un administrador acota la bitacora por accion, actor y rango de fechas
    Dado que la bitacora contiene acciones de distintos actores y fechas
    Cuando el administrador aplica filtros de accion, actor y periodo
    Entonces el sistema muestra solo los registros que cumplen esos criterios
    Y conserva la navegacion paginada sobre el subconjunto filtrado

  @error-path @critico @seguridad @hu-02
  Escenario: Un rol no administrador intenta revisar la bitacora
    Dado que un usuario interno autenticado no tiene rol administrador
    Cuando intenta entrar a la consulta de auditoria
    Entonces el sistema bloquea el acceso
    Y no expone registros ni metadatos de la bitacora

  @edge-case @hu-02
  Escenario: Una pagina sin registros no rompe la consulta administrativa
    Dado que el administrador navega a una pagina sin resultados
    Cuando la consulta no encuentra registros para esa pagina
    Entonces el sistema mantiene la respuesta estable
    Y muestra una lista vacia sin comprometer la navegacion de la bitacora
```

## Datos de prueba sinteticos

| Escenario                     | Campo              | Valido                                                           | Invalido                                     | Borde                                         |
| ----------------------------- | ------------------ | ---------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------- |
| Alta de perfil auditada       | Perfil interno     | admin crea perfil `recepcion@clinic.local` con rol recepcionista | email mal formado o rol invalido             | perfil medico sin contexto operativo completo |
| Check-in / check-out auditado | Contexto medico    | medico autentico sobre su propio contexto                        | medico sobre contexto ajeno                  | medico que intenta cambiar estado repetido    |
| Alta de turno auditada        | Datos de turno     | paciente sintetico `1045678901`, prioridad `alta`                | identificacion faltante o prioridad invalida | prioridad minima valida segun regla vigente   |
| Operacion invalidada          | Datos de entrada   | carga completa y consistente                                     | payload incompleto                           | combinacion valida en limite de longitud      |
| Falla de auditoria tolerada   | Persistencia audit | Mongo disponible                                                 | timeout de escritura                         | latencia alta con respuesta operativa exitosa |
| Sesion deduplicada            | Ventana temporal   | primer ingreso del dia                                           | actor sin autenticacion valida               | segundo ingreso dentro de 24 horas            |
| Consulta admin                | Filtros            | accion `PROFILE_CREATED`, actor `uid-admin`, rango valido        | accion inexistente                           | pagina fuera de rango con total conocido      |
| Acceso prohibido              | Rol operativo      | administrador                                                    | recepcionista o medico                       | token valido con rol sin permiso              |

## Lectura de cobertura actual

Cobertura fuerte en la implementacion revisada:

- Semantica del payload alineada y cubierta para `PROFILE_CREATED`, `PROFILE_UPDATED`, `DOCTOR_CHECK_IN`, `DOCTOR_CHECK_OUT`, `APPOINTMENT_CREATED` y `SESSION_RESOLVED`.
- Contrato de lectura con `id` y `createdAt` persistentes cubierto en adapter y controller.
- Consulta admin con filtros, validacion de action y bloqueos 401/403.
- Renderizado de la pagina admin, tabla, filtros, paginacion, loading y error.
- Fire-and-forget y deduplicacion de `SESSION_RESOLVED` a nivel interceptor.

Cobertura parcial o pendiente:

- Verificacion por endpoint real de que cada accion exitosa crea exactamente un registro persistido.
- Verificacion por endpoint real de que validaciones fallidas generan cero registros persistidos.
- Caso de pagina fuera de rango con lista vacia y bordes UTC/inclusivos en pruebas automatizadas dirigidas.
- Observabilidad operativa adicional para fallos de escritura de auditoria mas alla de `console.warn`.
