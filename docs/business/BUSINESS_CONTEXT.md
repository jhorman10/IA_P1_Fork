# Contexto de Negocio - SPEC-004 Operational Access Foundation

## 1. Descripcion del Proyecto

### Nombre del Proyecto

Sistema Inteligente de Gestion de Turnos Medicos

### Objetivo del Proyecto

Operar el sistema de turnos medicos con personal interno autenticado, perfiles operativos y control por roles, manteniendo la continuidad del flujo publico de espera y dashboard sin romper el pipeline heredado de asignacion y notificaciones.

### Alcance especifico de SPEC-004

SPEC-004 agrega la base de acceso operativo que el producto necesitaba para dejar de ser anonimo:

- autenticacion Firebase para personal interno,
- resolucion de Perfil operativo activo,
- autorizacion por rol,
- proteccion de modulos internos,
- gestion de perfiles,
- regla de contexto medico propio,
- y evidencia QA/CI alineada al estado real del repositorio.

## 2. Flujos Criticos del Negocio

### Principales Flujos de Trabajo

1. Inicio de sesion operativo
   Un Usuario interno se autentica con Firebase, producer resuelve su Perfil operativo activo y frontend habilita solo la experiencia acorde a su rol.

2. Administracion de perfiles operativos
   Solo el Administrador puede crear, listar y actualizar Perfiles. Un Perfil nuevo nace activo por defecto. Si el rol es `doctor`, debe existir `doctor_id`.

3. Registro de turnos protegido
   Solo `admin` y `recepcionista` pueden registrar turnos desde producer y desde la UI. El Bearer token debe viajar desde frontend hasta producer.

4. Contexto medico propio
   El rol `doctor` puede ejecutar check-in/check-out solo sobre su propio `doctor_id`.

5. Continuidad del flujo publico
   La pantalla publica de espera y el dashboard en tiempo real siguen funcionando sin autenticacion para no romper la demo ni la operacion heredada.

### Modulos o Funcionalidades Criticas

- Autenticacion y sesion operativa.
- Gestion de Perfiles y roles.
- Registro de turnos protegido.
- Gestion de medicos y contexto propio.
- Pantalla publica de espera y dashboard realtime.
- Pipeline de CI/CD y seguridad Docker como soporte de release.

## 3. Reglas de Negocio y Restricciones

### Reglas de Negocio Relevantes

| Regla                                              | Estado real                                                |
| -------------------------------------------------- | ---------------------------------------------------------- |
| Todo endpoint interno requiere Bearer token valido | Implementado en producer                                   |
| Todo acceso autenticado requiere Perfil activo     | Implementado en `FirebaseAuthGuard` y `ProfileServiceImpl` |
| Solo admin gestiona Perfiles                       | Implementado en backend y frontend                         |
| Solo admin y recepcionista registran turnos        | Implementado en producer y `RoleGate` de `/registration`   |
| Doctor solo opera su propio contexto               | Implementado con `DoctorContextGuard`                      |
| La pantalla publica sigue sin auth                 | Implementado en la ruta raiz del frontend                  |

### Regulaciones o Normativas

No se observa en el repositorio una normativa sectorial explicitamente codificada. Sin embargo, por el tipo de datos y el alcance operativo, deben tratarse como requisitos no funcionales de release:

- proteccion de datos personales de pacientes y personal interno,
- minimizacion de exposicion publica de nombres y correos,
- control de acceso por identidad y rol,
- trazabilidad operativa basica,
- y decisiones de privacidad explicitadas cuando una excepcion se mantenga por negocio.

## 4. Perfiles de Usuario y Roles

### Perfiles o Roles de Usuario en el Sistema

| Perfil / rol         | Necesidad principal                                           | Estado actual                               |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------- |
| Administrador        | Gestionar Perfiles y roles, crear medicos, supervisar modulos | Cubierto en backend y frontend              |
| Recepcionista        | Iniciar sesion y registrar turnos operativos                  | Cubierto en backend y frontend              |
| Doctor               | Iniciar sesion y operar solo su propio contexto medico        | Cubierto en backend; UX parcial en frontend |
| Paciente / visitante | Ver estado de turnos en la pantalla publica                   | Sigue disponible sin autenticacion          |

### Permisos y Limitaciones de Cada Perfil

| Perfil / rol         | Puede hacer                                                          | No puede hacer                                                    |
| -------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Administrador        | Crear, listar y actualizar Perfiles; registrar turnos; crear medicos | Operar como medico sobre contexto ajeno                           |
| Recepcionista        | Iniciar sesion y registrar turnos                                    | Gestionar Perfiles; operar check-in/check-out de medico           |
| Doctor               | Iniciar sesion; operar check-in/check-out solo sobre su `doctor_id`  | Registrar turnos; gestionar Perfiles; operar otro contexto medico |
| Paciente / visitante | Consultar la pantalla publica                                        | Acceder a modulos internos                                        |

## 5. Condiciones del Entorno Tecnico

### Plataformas Soportadas

- Aplicacion web publica para la sala de espera y dashboard.
- Aplicacion web interna para administracion, login y registro de turnos.
- APIs backend para operaciones internas y pipeline asincrono.

### Tecnologias o Integraciones Clave

| Componente    | Tecnologia / responsabilidad             |
| ------------- | ---------------------------------------- |
| Frontend      | Next.js + React + Jest + Testing Library |
| Producer      | NestJS + Jest + Supertest                |
| Consumer      | NestJS + Jest                            |
| Persistencia  | MongoDB                                  |
| Mensajeria    | RabbitMQ                                 |
| Autenticacion | Firebase Auth                            |
| Tiempo real   | WebSocket                                |
| CI/CD         | GitHub Actions                           |
| Contenedores  | Docker multi-stage + Trivy scan          |

## 6. Casos Especiales o Excepciones

### Escenarios Alternos o Excepciones que Deben Considerarse

- La pantalla publica sigue sin autenticacion como excepcion operativa actual.
- La ruta del rol doctor no tiene aun una landing operativa dedicada; hoy cae en la ruta raiz publica.
- La autenticacion del canal WebSocket sigue fuera del alcance de SPEC-004.
- Branch protection no puede resolverse desde el codigo; requiere configuracion manual en GitHub.
- No existe aun un E2E auth-aware completo del journey login -> Perfil -> operacion protegida.
- La pantalla publica mantiene valor de demo, pero deja un riesgo de privacidad que debe aceptarse explicitamente o mitigarse.
