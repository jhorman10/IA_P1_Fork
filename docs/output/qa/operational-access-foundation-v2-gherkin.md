# Casos Gherkin QA - operational-access-foundation-v2

## Alcance

SPEC-006 consolida mejoras post-implementacion sobre la base de acceso operativo. En esta pasada QA se cubren cinco frentes ya implementados en backend y frontend:

- auto-inicializacion de Perfil operativo para nuevos usuarios autenticados,
- persistencia de auditoria de cambios de Perfil en `profile_audit_logs`,
- throttling de endpoints sensibles de Perfiles,
- carga segura de configuracion cliente sin romper SSR,
- y bloqueo de render en secciones protegidas hasta resolver auth + Perfil.

Estado de evidencia tomado para este entregable:

- Backend focalizado reportado en la sesion: 49/49 pruebas verdes.
- Frontend focalizado reportado en la sesion: 12/12 pruebas verdes.
- `get_errors` reportado sin errores.

## Flujos criticos priorizados

- Nuevo usuario autenticado crea su Perfil operativo sin quedar bloqueado.
- El sistema evita auto-asignacion de privilegios no permitidos.
- Un administrador modifica un Perfil y el cambio queda trazado con actor, diff y motivo.
- El sistema limita la rafaga de consultas o cambios sobre Perfiles sensibles.
- Las secciones protegidas no muestran contenido inconsistente mientras la sesion aun se hidrata.
- La configuracion cliente no intenta inicializar dependencias de navegador durante prerender.

```gherkin
#language: es
Caracteristica: Mejoras operativas de acceso, trazabilidad y proteccion en perfiles

  @smoke @critico @hu-06
  Escenario: Un usuario interno nuevo crea su Perfil operativo al primer acceso
    Dado que el Usuario autentica correctamente y aun no tiene Perfil operativo
    Cuando completa la inicializacion de su acceso operativo
    Entonces el sistema crea su Perfil con los datos esperados
    Y el Usuario deja de estar bloqueado para operar

  @happy-path @hu-06
  Escenario: Un usuario nuevo puede inicializarse como doctor sin quedar en estado intermedio
    Dado que el Usuario autentica correctamente y aun no tiene Perfil operativo
    Cuando solicita inicializarse con rol Medico
    Entonces el sistema crea el Perfil operativo con ese rol permitido
    Y la operacion termina en un estado consistente

  @error-path @critico @seguridad @hu-06
  Escenario: Un usuario intenta auto-asignarse privilegios de administrador
    Dado que el Usuario autentica correctamente y aun no tiene Perfil operativo
    Cuando intenta inicializar su acceso con privilegios no permitidos para auto-registro
    Entonces el sistema rechaza la operacion
    Y no crea un nuevo Perfil operativo

  @error-path @hu-06
  Escenario: Un usuario intenta inicializarse cuando ya posee un Perfil operativo
    Dado que el Usuario ya cuenta con un Perfil operativo registrado
    Cuando intenta repetir la inicializacion
    Entonces el sistema informa que el Perfil ya existe
    Y no duplica el acceso operativo

  @smoke @critico @hu-07
  Escenario: Un administrador cambia un Perfil y el cambio queda auditado
    Dado que existe un Perfil operativo administrable
    Y que un Administrador autenticado decide modificar su rol o estado
    Cuando confirma el cambio con un motivo de negocio
    Entonces el sistema aplica la actualizacion
    Y conserva una traza con actor, valores antes y despues, motivo y momento del cambio

  @error-path @critico @seguridad @hu-07
  Escenario: Un rol no administrador intenta modificar un Perfil operativo ajeno
    Dado que el Usuario autenticado no tiene privilegios de administracion de Perfiles
    Cuando intenta cambiar los datos operativos de otro Usuario
    Entonces el sistema rechaza la accion
    Y no registra un cambio de Perfil efectivo

  @edge-case @hu-07
  Escenario: Una falla transitoria de auditoria no rompe la actualizacion principal del Perfil
    Dado que un Administrador ejecuta un cambio de Perfil valido
    Y que el registro tecnico de auditoria presenta una falla transitoria
    Cuando el sistema procesa la actualizacion
    Entonces el cambio principal del Perfil se conserva
    Y queda evidencia tecnica para seguimiento operativo

  @smoke @critico @hu-08
  Escenario: El sistema limita la consulta reiterada de Perfiles sensibles
    Dado que un Administrador realiza multiples consultas consecutivas sobre gestion de Perfiles
    Cuando supera el umbral permitido en la ventana de tiempo configurada
    Entonces el sistema frena temporalmente nuevas solicitudes
    Y protege la superficie sensible contra abuso o enumeracion

  @edge-case @hu-08
  Escenario: El sistema limita tambien los cambios repetidos sobre un Perfil sensible
    Dado que un Administrador realiza multiples cambios consecutivos sobre Perfiles operativos
    Cuando supera el umbral permitido en la ventana de tiempo configurada
    Entonces el sistema rechaza temporalmente nuevas actualizaciones
    Y evita rafagas anormales de mutacion administrativa

  @happy-path @ux @frontend
  Escenario: Una seccion protegida espera a que la sesion este resuelta antes de mostrar contenido
    Dado que el Usuario entra a una zona protegida de la aplicacion
    Y que la sesion aun se esta resolviendo en cliente
    Cuando la interfaz prepara el contenido protegido
    Entonces el sistema muestra un estado de espera controlado
    Y no expone contenido protegido antes de tiempo

  @edge-case @frontend @ssr
  Escenario: El sistema no inicializa dependencias de navegador durante prerender
    Dado que una pagina se prerenderiza fuera del navegador
    Cuando la aplicacion carga configuracion cliente para servicios dependientes del entorno web
    Entonces el sistema conserva un valor seguro por defecto
    Y evita inicializaciones incompatibles con SSR
```

## Datos de prueba sinteticos

| Escenario             | Campo                    | Valido                         | Invalido                            | Borde                                    |
| --------------------- | ------------------------ | ------------------------------ | ----------------------------------- | ---------------------------------------- |
| Auto-inicializacion   | Perfil inicial           | usuario autenticado sin Perfil | usuario ya inicializado             | rol omitido con default permitido        |
| Auto-inicializacion   | Rol solicitado           | recepcionista, doctor          | admin                               | cambio de rol explicito a doctor         |
| Auditoria de Perfil   | Cambio administrativo    | estado o rol con motivo        | actor sin permiso                   | motivo omitido y persistido como nulo    |
| Auditoria de Perfil   | Persistencia de bitacora | escritura disponible           | falla transitoria de almacenamiento | actualizacion valida con warning tecnico |
| Throttling            | Volumen de solicitudes   | dentro del limite              | mas de 20 solicitudes por ventana   | rafaga exacta en el umbral               |
| Boundary protegida    | Estado auth              | carga resuelta                 | carga pendiente prolongada          | cambio de loading a resuelto sin flash   |
| Configuracion cliente | Entorno                  | navegador con init exitoso     | prerender sin `window`              | init rechazado y fallback estable        |

## Lectura de cobertura actual

Cobertura fuerte observada:

- `backend/producer/test/src/profiles/profile-auto-init.spec.ts` cubre 201, 409, 401, 403, 400, rol por defecto y rol doctor en auto-inicializacion.
- `backend/producer/test/src/application/use-cases/profile-spec006.spec.ts` cubre `initializeSelf()` y la emision de `profile_audit_logs` en `updateProfile()`.
- `backend/producer/test/src/profiles/profiles.rate-limit.spec.ts` cubre 429 sobre lectura y actualizacion de Perfiles tras superar el umbral.
- `backend/producer/test/src/infrastructure/adapters/outbound/mongoose-profile-audit-log.adapter.spec.ts` y `backend/producer/test/src/schemas/profile-audit-log.schema.spec.ts` cubren contrato de persistencia, defaults e indices de la bitacora.
- `frontend/test/components/AuthHydrationBoundary.spec.tsx` cubre spinner por defecto, fallback custom y contrato sin flash.
- `frontend/test/lib/useClientSideConfig.spec.ts` y `frontend/test/lib/useClientSideConfig.ssr.spec.ts` cubren fallback, resolucion, rechazo e inactividad durante SSR.

Cobertura parcial o residual:

- No se reviso una prueba HTTP -> DB real que verifique la escritura de `profile_audit_logs` despues de un `PATCH` exitoso sobre el endpoint protegido.
- Los layouts `admin` y `doctor` son wrappers minimos sobre `AuthHydrationBoundary`; fueron revisados a nivel de codigo, pero no se identifico una prueba dedicada por layout en esta pasada QA.
- No se genero evidencia de performance porque la spec no define SLA cuantitativos.
