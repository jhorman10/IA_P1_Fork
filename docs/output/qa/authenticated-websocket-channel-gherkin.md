# Casos Gherkin QA - authenticated-websocket-channel

## Alcance

Feature de canal operativo autenticado por WebSocket para usuarios internos, con continuidad explicita del canal publico de sala de espera. Se cubren la autenticacion con `idToken`, el rechazo de clientes sin `Profile` operativo activo, el manejo de error autenticado en frontend y la no regresion del namespace publico existente.

## Flujos criticos priorizados

- Conexion operativa autenticada con `Profile` activo.
- Rechazo de conexion operativa cuando falta token o el `Profile` no esta habilitado.
- Rechazo visible al frontend cuando la sesion expira y el canal intenta reconectar.
- Continuidad del canal publico sin autenticacion.
- Rechazo del namespace operativo para clientes publicos sin romper la alternativa legitima.

```gherkin
#language: es
Caracteristica: Canal operativo autenticado y canal publico continuo

  @smoke @critico @seguridad @hu-01
  Escenario: Usuario interno se conecta al canal operativo con sesion valida
    Dado que el Usuario interno tiene una sesion valida y un Perfil operativo activo
    Cuando abre el canal operativo en tiempo real
    Entonces el sistema acepta la conexion
    Y entrega el snapshot inicial de turnos operativos

  @error-path @critico @seguridad @hu-01
  Escenario: Usuario con token valido pero sin Perfil operativo activo intenta conectarse
    Dado que el Usuario presenta una identidad valida pero no tiene Perfil operativo habilitado
    Cuando intenta abrir el canal operativo
    Entonces el sistema rechaza la conexion
    Y informa un error de autenticacion observable por frontend
    Y cierra el socket

  @edge-case @critico @seguridad @hu-01
  Escenario: El canal operativo intenta reconectar con token expirado
    Dado que el Usuario ya habia usado el canal operativo
    Y su sesion ya no es valida
    Cuando el cliente intenta reconectarse
    Entonces el sistema rechaza la reconexion
    Y el frontend deja de mostrar el canal como conectado
    Y expone estado de rechazo autenticado

  @smoke @critico @hu-02
  Escenario: La pantalla publica mantiene la actualizacion en tiempo real sin login
    Dado que un visitante abre la pantalla publica de turnos
    Cuando el sistema establece la conexion publica en tiempo real
    Entonces el visitante recibe el snapshot inicial de turnos
    Y sigue recibiendo actualizaciones sin autenticarse

  @error-path @hu-02
  Escenario: El canal operativo no reemplaza el canal publico existente
    Dado que el sistema ya tiene un canal publico en uso
    Cuando se despliega el canal operativo autenticado
    Entonces la experiencia publica no depende de token ni secreto compartido
    Y los clientes publicos siguen conectando normalmente

  @edge-case @seguridad @hu-02
  Escenario: Cliente publico intenta usar el canal operativo sin credenciales
    Dado que un visitante no autenticado intenta entrar al canal operativo
    Cuando abre el canal protegido
    Entonces el sistema rechaza la conexion operativa
    Y la alternativa publica permanece disponible
```

## Datos de prueba sinteticos

| Escenario                  | Campo                | Valido            | Invalido                                 | Borde                                              |
| -------------------------- | -------------------- | ----------------- | ---------------------------------------- | -------------------------------------------------- |
| Conexion operativa exitosa | Token                | `idToken` valido  | token ausente                            | token via `Authorization: Bearer`                  |
| Conexion operativa exitosa | Perfil operativo     | `status=active`   | perfil inexistente                       | rol doctor con `doctor_id` presente                |
| Rechazo por perfil         | Estado del perfil    | activo            | inactivo                                 | perfil existente sin permisos operativos esperados |
| Reconexion expirada        | Sesion               | token vigente     | token expirado                           | token removido durante reconexion                  |
| Continuidad publica        | Tipo de cliente      | visitante publico | cliente publico forzando canal operativo | snapshot vacio sin turnos                          |
| Canal protegido rechazado  | Namespace solicitado | publico legitimo  | operativo sin credenciales               | cambio inmediato desde canal publico al operativo  |

## Evidencia actual observada en repo

Cobertura encontrada en el repo revisado:

- `backend/producer/test/src/auth/guards/ws-firebase-auth.guard.spec.ts` valida token en `handshake.auth`, fallback por header `Authorization`, `Profile` ausente, `Profile` inactivo y rechazo por token ausente o expirado.
- `backend/producer/test/src/events/operational-appointments.gateway.spec.ts` valida que el snapshot operativo se emite solo despues de autenticar y que el gateway no expone datos cuando la autenticacion falla.
- `frontend/test/services/AuthenticatedSocketIoAdapter.spec.ts` valida el namespace `/ws/operational-appointments`, el envio de `auth.token` y el manejo del evento `WS_AUTH_ERROR`.
- `frontend/test/hooks/useOperationalAppointmentsWebSocket.spec.ts` valida el no-connect sin token, `authRejected`, estados de conexion y actualizacion de appointments por snapshot/delta.
- `backend/producer/test/src/events/appointments.gateway.spec.ts` valida la regresion publica: no dependencia de `WS_AUTH_TOKEN` y aceptacion de clientes no autenticados en el canal publico.
- `frontend/test/hooks/useAppointmentsWebSocket.spec.ts` mantiene cobertura del flujo publico no autenticado.

Gaps observados en la evidencia real:

- No se reviso una prueba E2E multi-proceso que conecte un frontend real contra un producer real durante esta pasada QA.
- No se identifico una pagina operativa consumidora final en esta spec; el alcance implementado se concentra en infraestructura, adapter y hook, lo cual es consistente con la spec actual.
