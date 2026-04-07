# Casos Gherkin QA - unified-doctor-profile-dynamic-office (SPEC-015)

## Alcance

QA para la spec activa SPEC-015 sobre tres frentes funcionales:

- HU-01: creacion unificada de perfil doctor con especialidad desde catalogo.
- HU-02: check-in con consultorio dinamico, check-out y liberacion del consultorio.
- HU-03: CRUD admin del catalogo de especialidades.

La spec no define SLA ni umbrales de performance. En esta fase QA solo aplican artefactos de Gherkin y riesgos.

## Flujos criticos priorizados

- Alta unificada de doctor sin exponer IDs internos ni pedir consultorio en el alta.
- Consistencia entre `Profile.doctor_id`, `Doctor.specialtyId`, `Doctor.specialty` y `Specialty`.
- Seleccion dinamica de consultorio libre al hacer check-in, con rechazo de doble ocupacion.
- Liberacion de consultorio en check-out y disponibilidad posterior para otro doctor.
- CRUD de especialidades con unicidad por nombre y proteccion referencial cuando hay doctores vinculados.

## HU-01 - Creacion unificada de perfil doctor con especialidad

```gherkin
#language: es
Caracteristica: Creacion unificada de perfil doctor con especialidad

  @smoke @critico @happy-path @hu-01 @criterio-1-1
  Escenario: El administrador crea un perfil doctor desde un unico formulario
    Dado que el Administrador abre el modal Nuevo Perfil
    Y existen especialidades disponibles en el catalogo
    Cuando selecciona el rol doctor
    Y ingresa correo, contrasena y nombre visible validos
    Y selecciona una especialidad del catalogo
    Entonces el sistema crea el usuario autenticable, el perfil operativo y la entidad doctor
    Y el doctor queda con estado offline y sin consultorio asignado
    Y el perfil queda vinculado al doctor sin exponer IDs tecnicos en la UI

  @smoke @happy-path @hu-01 @criterio-1-2
  Escenario: El administrador edita un perfil doctor y ve su especialidad actual preseleccionada
    Dado que existe un perfil doctor vinculado a la especialidad Pediatria
    Cuando el Administrador abre el modal de edicion
    Entonces la especialidad actual aparece preseleccionada
    Y el Administrador puede reemplazarla por otra del catalogo
    Y el cambio mantiene la consistencia del vinculo con el doctor existente

  @error-path @hu-01 @criterio-1-3
  Escenario: El administrador intenta guardar un perfil doctor sin seleccionar especialidad
    Dado que el Administrador selecciono el rol doctor
    Y completo correo, contrasena y nombre visible
    Cuando intenta guardar sin elegir una especialidad
    Entonces la UI bloquea el envio
    Y muestra el mensaje Debe seleccionar una especialidad
    Y no se crea ningun perfil doctor

  @edge-case @hu-01 @criterio-1-4
  Escenario: El catalogo esta vacio al intentar crear un perfil doctor
    Dado que no existen especialidades registradas
    Cuando el Administrador selecciona el rol doctor
    Entonces la UI informa No hay especialidades registradas. Crear una primero.
    Y el guardado queda deshabilitado para ese rol

  @edge-case @integridad @hu-01
  Escenario: El administrador intenta cambiar la especialidad de un perfil doctor inconsistente
    Dado que existe un perfil con rol doctor sin doctor vinculado valido
    Cuando el Administrador intenta actualizar la especialidad
    Entonces el sistema rechaza la operacion por inconsistencia perfil doctor
    Y no modifica la especialidad ni el perfil operativo
```

## HU-02 - Consultorio dinamico en check-in del doctor

```gherkin
#language: es
Caracteristica: Consultorio dinamico en check-in del doctor

  @smoke @critico @happy-path @hu-02 @criterio-2-1
  Escenario: El doctor hace check-in eligiendo un consultorio libre
    Dado que el doctor esta autenticado y en estado offline
    Y existen consultorios libres en ese momento
    Cuando selecciona un consultorio libre y confirma su disponibilidad
    Entonces el sistema asigna ese consultorio al doctor
    Y cambia su estado a available
    Y la UI refleja el consultorio seleccionado

  @smoke @critico @happy-path @hu-02 @criterio-2-2
  Escenario: El doctor hace check-out y el consultorio se libera
    Dado que el doctor esta disponible en un consultorio asignado
    Y no tiene paciente activo
    Cuando ejecuta el check-out
    Entonces el sistema cambia su estado a offline
    Y limpia el consultorio asignado
    Y el consultorio vuelve a quedar disponible para otro doctor

  @happy-path @hu-02 @criterio-2-3
  Escenario: El doctor elige un consultorio diferente en un segundo check-in
    Dado que el doctor ya hizo check-out de un consultorio previo
    Y existe mas de un consultorio libre
    Cuando vuelve a hacer check-in con otro consultorio
    Entonces el sistema registra el nuevo consultorio seleccionado
    Y el doctor puede operar desde un consultorio distinto al anterior

  @error-path @hu-02 @criterio-2-4
  Escenario: El doctor intenta hacer check-in cuando no hay consultorios libres
    Dado que todos los consultorios estan ocupados
    Cuando el doctor abre el selector de consultorios
    Entonces la UI informa No hay consultorios disponibles en este momento
    Y no permite confirmar el check-in

  @error-path @critico @hu-02 @criterio-2-5
  Escenario: Otro doctor ocupa el consultorio antes de confirmar el check-in
    Dado que el doctor selecciono un consultorio que aparecia libre
    Y otro doctor lo ocupa instantes antes de confirmar
    Cuando el primer doctor envia el check-in
    Entonces el backend rechaza con conflicto indicando que el consultorio ya esta ocupado
    Y la UI refresca la lista de consultorios disponibles
    Y el doctor debe elegir nuevamente

  @edge-case @operacion @hu-02
  Escenario: El doctor intenta hacer check-out mientras tiene un paciente asignado
    Dado que el doctor se encuentra en atencion con un paciente activo
    Cuando intenta salir de consultorio
    Entonces el sistema rechaza el check-out
    Y mantiene el estado operativo y el consultorio asignado
```

## HU-03 - Catalogo editable de especialidades medicas

```gherkin
#language: es
Caracteristica: Catalogo editable de especialidades medicas

  @smoke @happy-path @hu-03 @criterio-3-1
  Escenario: El administrador crea una nueva especialidad y queda disponible para perfiles doctor
    Dado que el Administrador gestiona el catalogo de especialidades
    Cuando registra la especialidad Cardiologia
    Entonces la especialidad queda persistida en el catalogo
    Y aparece disponible en los selectores de especialidad para perfiles doctor

  @smoke @happy-path @hu-03 @criterio-3-2
  Escenario: El administrador renombra una especialidad sin romper los vinculos existentes
    Dado que existe la especialidad Medicina Gral con doctores asociados por ID
    Cuando el Administrador la actualiza a Medicina General
    Entonces el catalogo muestra el nuevo nombre
    Y los doctores previamente vinculados conservan su referencia valida

  @happy-path @hu-03 @criterio-3-3
  Escenario: El administrador elimina una especialidad sin doctores vinculados
    Dado que existe una especialidad sin doctores asociados
    Cuando el Administrador la elimina
    Entonces la especialidad desaparece del catalogo
    Y deja de verse en los selectores

  @error-path @hu-03 @criterio-3-4
  Escenario: El administrador intenta eliminar una especialidad con doctores vinculados
    Dado que existe una especialidad con doctores asociados
    Cuando el Administrador intenta eliminarla
    Entonces el sistema rechaza la operacion indicando que hay doctores vinculados
    Y la especialidad permanece en el catalogo

  @error-path @hu-03 @criterio-3-5
  Escenario: El administrador intenta crear una especialidad duplicada
    Dado que la especialidad Pediatria ya existe en el catalogo
    Cuando el Administrador intenta crearla nuevamente
    Entonces el sistema rechaza la operacion por duplicado
    Y no crea una segunda entrada

  @edge-case @hu-03
  Escenario: El administrador intenta renombrar una especialidad a un nombre ya existente con otra capitalizacion
    Dado que existe la especialidad Pediatria
    Y existe otra especialidad con nombre equivalente variando solo mayusculas o acentos visuales
    Cuando el Administrador intenta guardar el nuevo nombre
    Entonces el sistema bloquea la actualizacion por unicidad del catalogo
    Y mantiene la especialidad original sin cambios
```

## Datos de prueba sinteticos

| Escenario                         | Campo                | Valido                     | Invalido                    | Borde                                          |
| --------------------------------- | -------------------- | -------------------------- | --------------------------- | ---------------------------------------------- |
| Alta unificada de doctor          | email                | `doctor.nuevo@clinic.test` | `doctor.nuevo`              | email ya registrado                            |
| Alta unificada de doctor          | password             | `SecureP@ss123`            | `123`                       | longitud minima permitida                      |
| Alta unificada de doctor          | specialty_id         | `spec-cardio-001`          | vacio                       | ID inexistente en catalogo                     |
| Edicion de especialidad de perfil | doctor_id vinculado  | `doctor-001`               | `null`                      | doctor referenciado pero no encontrado         |
| Check-in exitoso                  | office               | `3`                        | `9`                         | ultimo consultorio valido `5`                  |
| Check-in con colision             | office visible en UI | `2` libre                  | `2` ya ocupado al confirmar | lista obsoleta entre fetch y submit            |
| Check-out                         | estado del doctor    | `available` sin paciente   | `busy` con paciente         | transicion inmediata despues de terminar cita  |
| Alta de especialidad              | name                 | `Cardiologia`              | vacio                       | 100 caracteres exactos                         |
| Duplicado de especialidad         | name                 | `Neurologia`               | `Pediatria` ya existente    | misma especialidad con distinta capitalizacion |
| Eliminacion protegida             | doctores vinculados  | `0`                        | `2`                         | un doctor vinculado recien creado              |

## Cobertura automatizada observada en el workspace

| HU    | Cobertura lograda                                                                                                                                                       | Evidencia focal validada                                                                                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HU-01 | Alta unificada, selector de especialidad, validacion sin especialidad, catalogo vacio, preseleccion en edicion y actualizacion de `specialty_id` del doctor vinculado   | `backend/producer/test/src/profiles/profiles.controller.spec.ts`, `frontend/test/components/ProfileFormModal.spec.tsx`                                                 |
| HU-02 | Check-in con office, validacion de office, 409 por office ocupado, check-out que limpia office, endpoint de offices libres, selector UI y estados empty/loading/refetch | `backend/producer/test/src/doctors/doctor.controller.spec.ts`, `frontend/test/components/DoctorStatusCard.spec.tsx`, `frontend/test/hooks/useAvailableOffices.spec.ts` |
| HU-03 | CRUD de especialidades, duplicados, proteccion referencial al eliminar y manejo de errores en el hook de catalogo                                                       | `backend/producer/test/src/application/use-cases/specialty.service.impl.spec.ts`, `frontend/test/hooks/useSpecialties.spec.ts`                                         |

## Gaps residuales razonables

- No hay evidencia deterministica de concurrencia real a nivel repositorio o DB para probar que dos check-in simultaneos al mismo consultorio terminan en `200 + 409` y nunca en doble ocupacion.
- No hay un escenario automatizado directo que cubra el segundo check-in con un consultorio diferente despues del check-out.
- No hay una secuencia automatizada que pruebe check-out, reaparicion inmediata del consultorio en offices libres y reutilizacion por otro doctor.
- No se encontro evidencia automatizada del componente o pagina `SpecialtyManager`; la cobertura actual del CRUD esta en servicio y hook, no en la UI admin completa.
- No hay evidencia de compensacion o rollback para la creacion unificada si se crea el usuario autenticable pero falla la creacion del doctor o del perfil.
- No hay prueba explicita de regresion que demuestre que renombrar una especialidad preserva los doctores vinculados a traves de las lecturas de negocio, no solo en la capa de servicio.

## Evidencia base usada para esta salida

### Focal validada por el usuario

- `.github/specs/unified-doctor-profile-dynamic-office.spec.md`
- `backend/producer/test/src/profiles/profiles.controller.spec.ts`
- `backend/producer/test/src/doctors/doctor.controller.spec.ts`
- `backend/producer/test/src/application/use-cases/specialty.service.impl.spec.ts`
- `frontend/test/components/ProfileFormModal.spec.tsx`
- `frontend/test/components/DoctorStatusCard.spec.tsx`
- `frontend/test/hooks/useSpecialties.spec.ts`
- `frontend/test/hooks/useAvailableOffices.spec.ts`

### Contexto adicional consultado en el workspace

- `frontend/test/hooks/useDoctorDashboard.spec.ts`
- `frontend/test/app/doctor/page.spec.tsx`
- `backend/consumer/test/src/application/use-cases/assign-available-offices.use-case.impl.spec.ts`
