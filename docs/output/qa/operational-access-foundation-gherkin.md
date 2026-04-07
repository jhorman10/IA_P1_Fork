# Casos Gherkin QA - operational-access-foundation

## Alcance

Feature de base de acceso operativo sobre el Sistema Inteligente de Gestion de Turnos Medicos. Se cubren autenticacion interna, resolucion de Perfil operativo, administracion de Perfiles, enforcement por rol y continuidad del flujo publico heredado como excepcion operativa actual.

## Flujos criticos priorizados

- Inicio de sesion operativo para personal interno.
- Gestion admin-only de Perfiles y roles.
- Registro de turnos solo para admin y recepcionista.
- Regla de ownership del medico sobre su propio contexto.
- Continuidad de la pantalla publica de espera sin romper la operacion actual y con riesgo de privacidad documentado.

```gherkin
#language: es
Caracteristica: Base de acceso operativo para usuarios internos y continuidad del flujo de turnos

  @smoke @critico @happy-path @hu-01
  Escenario: Un administrador inicia sesion con Perfil operativo activo
    Dado que el Usuario interno tiene una cuenta institucional valida
    Y que su Perfil operativo esta activo con rol Administrador
    Cuando ingresa sus credenciales en la pantalla de acceso operativo
    Entonces el sistema resuelve su sesion operativa
    Y habilita la gestion de Perfiles
    Y no conserva mensajes de error de autenticacion

  @error-path @critico @seguridad @hu-01
  Escenario: La cuenta autentica pero no tiene Perfil operativo configurado
    Dado que el Usuario interno autentica correctamente su cuenta institucional
    Y que no existe un Perfil operativo activo asociado a esa cuenta
    Cuando intenta entrar al sistema
    Entonces el sistema informa que el Perfil no esta configurado
    Y no habilita modulos internos
    Y limpia la sesion local

  @edge-case @hu-01
  Escenario: La sesion deja de ser operativa despues del ingreso
    Dado que el Usuario interno ya habia ingresado y tenia sesion operativa resuelta
    Cuando el sistema no puede volver a resolver su Perfil operativo
    Entonces elimina el estado local de autenticacion
    Y expone el motivo del rechazo
    Y requiere un nuevo inicio de sesion

  @smoke @critico @happy-path @hu-02
  Escenario: Un administrador crea un nuevo Perfil operativo
    Dado que el Administrador ya esta autenticado
    Y que desea habilitar a una nueva recepcionista
    Cuando registra el UID institucional, el correo, el nombre visible y el rol correspondiente
    Entonces el sistema crea el Perfil operativo
    Y lo deja activo para uso inmediato
    Y lo muestra en la gestion de Perfiles

  @error-path @hu-02
  Escenario: Se intenta registrar un Perfil operativo duplicado
    Dado que ya existe un Perfil operativo con el mismo identificador o correo institucional
    Cuando el Administrador intenta registrar nuevamente ese Perfil
    Entonces el sistema rechaza la operacion
    Y comunica que el Perfil ya existe
    Y no altera la lista vigente de Perfiles

  @edge-case @hu-02
  Escenario: Se intenta registrar un medico sin vinculo operativo completo
    Dado que el Administrador esta creando un Perfil con rol Medico
    Y que no ha indicado el vinculo operativo del medico
    Cuando intenta guardar el Perfil
    Entonces el sistema rechaza la creacion
    Y explica que el vinculo del medico es obligatorio

  @smoke @critico @happy-path @hu-03
  Escenario: Una recepcionista registra un turno en el modulo autorizado
    Dado que la recepcionista inicio sesion con Perfil activo
    Cuando accede al modulo de registro y diligencia un turno valido
    Entonces la interfaz le permite continuar
    Y el sistema acepta la operacion operativa
    Y el turno entra al flujo normal de asignacion

  @error-path @critico @seguridad @hu-03
  Escenario: Un medico intenta acceder a funciones de registro que no le corresponden
    Dado que el Usuario interno tiene rol Medico y Perfil activo
    Cuando intenta entrar al flujo de registro de turnos
    Entonces la interfaz bloquea el acceso
    Y el sistema no habilita la operacion aunque se intente por un canal directo

  @edge-case @critico @hu-03
  Escenario: Un medico opera unicamente sobre su propio contexto
    Dado que el Medico tiene un Perfil operativo vinculado a su propio contexto asistencial
    Cuando intenta marcar disponibilidad sobre su propio contexto
    Entonces el sistema permite la operacion
    Pero cuando intenta operar sobre el contexto de otro medico
    Entonces el sistema rechaza la accion por falta de autorizacion

  @happy-path @transversal
  Escenario: La pantalla publica de espera sigue disponible como excepcion operativa actual
    Dado que una persona abre la pantalla publica del sistema sin iniciar sesion
    Cuando consulta los turnos en tiempo real
    Entonces la vista publica carga correctamente
    Y continua mostrando el flujo heredado de espera y atencion
    Y este comportamiento queda documentado como excepcion operativa con riesgo de privacidad
```

## Datos de prueba sinteticos

| Escenario              | Campo                | Valido                                   | Invalido              | Borde                                               |
| ---------------------- | -------------------- | ---------------------------------------- | --------------------- | --------------------------------------------------- |
| Inicio de sesion admin | Cuenta institucional | `admin@clinic.local`                     | correo mal formado    | espacios laterales antes de sanitizar               |
| Perfil faltante        | Perfil operativo     | Perfil activo existente                  | Perfil inexistente    | Perfil inactivo                                     |
| Alta de Perfil         | Identidad operativa  | `uid-recep-01`, `recepcion@clinic.local` | `uid`/email duplicado | alta de doctor sin vinculacion                      |
| Registro de turnos     | Rol operativo        | recepcionista activa                     | medico activo         | admin usando mismo flujo protegido                  |
| Contexto medico        | Contexto asistencial | contexto propio                          | contexto ajeno        | medico sin asociacion valida                        |
| Pantalla publica       | Acceso               | usuario anonimo                          | no aplica             | carga simultanea con sesion interna en otra ventana |

## Evidencia esperada para cada grupo

- HU-01: pruebas de `AuthController`, `AuthProvider`, `LoginPage` y `LoginForm`.
- HU-02: pruebas de `ProfileServiceImpl`, `ProfilesController`, `MongooseProfileRepository` y pagina admin de Perfiles.
- HU-03: pruebas de `ProducerController`, `DoctorController`, `RoleGuard`, `DoctorContextGuard`, `RoleGate` y `useAppointmentRegistration`.
- Flujo publico: home publica del frontend y E2E legado de turnos.
