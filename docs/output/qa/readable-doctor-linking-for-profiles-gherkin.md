# Casos Gherkin QA - readable-doctor-linking-for-profiles

## Alcance

Refinamiento UX del modulo admin de perfiles para reemplazar el ingreso libre del doctor tecnico por un selector legible de medicos existentes. El valor interno persistido sigue siendo `doctor_id`, pero la interaccion visible para el Administrador pasa a ser una seleccion por nombre, especialidad y consultorio.

## Flujos criticos priorizados

- Alta de perfil doctor con selector legible y sin exponer un campo tecnico.
- Edicion de perfil doctor con medico preseleccionado.
- Bloqueo de guardado cuando el rol es doctor y no se eligio un medico valido.
- Estado vacio cuando no existen medicos para vincular.
- Exploracion recomendada del error de carga del catalogo.

```gherkin
#language: es
Caracteristica: Vinculacion legible de medicos en perfiles doctor

	@smoke @critico @happy-path @hu-01 @criterio-1-1
	Escenario: El administrador crea un perfil doctor seleccionando un medico desde una lista legible
		Dado que el Administrador abre el formulario de perfiles
		Y existen medicos registrados para vincular
		Cuando selecciona el rol doctor
		Y elige un medico por nombre, especialidad y consultorio
		Y completa los datos obligatorios del perfil
		Entonces el sistema crea el perfil doctor con el vinculo correcto
		Y la interfaz no expone un campo libre para escribir identificadores tecnicos

	@smoke @happy-path @hu-01 @criterio-1-2
	Escenario: El administrador edita un perfil doctor ya vinculado
		Dado que existe un perfil doctor previamente vinculado a un medico
		Cuando el Administrador abre el formulario de edicion
		Entonces la interfaz muestra preseleccionado el medico actualmente vinculado
		Y conserva el vinculo si el Administrador no cambia la seleccion

	@error-path @hu-01 @criterio-1-3
	Escenario: El administrador intenta guardar un perfil doctor sin seleccionar medico
		Dado que el catalogo de medicos cargo correctamente
		Y el Administrador selecciono el rol doctor
		Pero no eligio ningun medico del listado
		Cuando intenta guardar el formulario
		Entonces la interfaz bloquea el envio
		Y muestra un mensaje indicando que debe seleccionar un medico existente
		Y el perfil no se crea ni se actualiza

	@edge-case @hu-01 @criterio-1-4
	Escenario: El catalogo esta vacio al intentar vincular un perfil doctor
		Dado que el Administrador abre el formulario de perfiles
		Y no existen medicos disponibles para vincular
		Cuando selecciona el rol doctor
		Entonces la interfaz informa que primero debe crear un medico
		Y bloquea el guardado del perfil doctor

	@exploratorio @ux @integracion
	Escenario: El catalogo de medicos no puede cargarse
		Dado que el Administrador necesita vincular un perfil doctor
		Y el sistema no logra recuperar el listado de medicos
		Cuando selecciona el rol doctor
		Entonces la interfaz informa que el listado no pudo cargarse
		Y el Administrador no deberia continuar hasta recuperar el catalogo
```

## Datos de prueba sinteticos

| Escenario                 | Campo                   | Valido                                         | Invalido                        | Borde                                                          |
| ------------------------- | ----------------------- | ---------------------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| Alta con selector legible | Medico visible          | `Dra. Laura Gomez · Pediatria · Consultorio 2` | opcion vacia                    | dos medicos con misma especialidad y distinto consultorio      |
| Alta con selector legible | Rol                     | `doctor`                                       | `recepcionista` para este flujo | cambio de rol antes de guardar                                 |
| Edicion con preseleccion  | Vinculo actual          | medico ya asociado al perfil                   | medico inexistente en catalogo  | medico existente pero sin cambio de seleccion                  |
| Validacion sin seleccion  | Seleccion de medico     | opcion elegida                                 | placeholder sin elegir          | clic en guardar inmediatamente despues de cambiar a rol doctor |
| Estado vacio              | Catalogo                | medico creado previamente                      | lista vacia                     | respuesta vacia pero request exitoso                           |
| Error de carga            | Disponibilidad catalogo | respuesta 200                                  | error 401, 403 o 500            | reconexion despues de fallo inicial                            |

## Cobertura automatizada observada en el workspace

- Cubierto: selector legible visible y ausencia del campo libre `Doctor ID`.
- Cubierto: estado vacio y bloqueo de submit cuando no hay medicos disponibles.
- Cubierto: preseleccion del medico vinculado en modo edicion.
- Cubierto: carga del catalogo con token y construccion de labels legibles en el hook.
- Cubierto: estado vacio del hook y no ejecucion del fetch sin token.

## Gaps de cobertura residuales

- No hay evidencia automatizada del caso con catalogo cargado, rol doctor y submit sin seleccion, aunque la validacion existe en el componente.
- No hay evidencia automatizada del estado `loading` ni del estado de error del selector en el modal.
- No hay evidencia end to end o de pagina que asegure la persistencia del medico seleccionado a traves del submit completo del flujo admin.

## Evidencia base usada para esta salida

- `frontend/src/components/ProfileFormModal/ProfileFormModal.tsx`
- `frontend/src/components/ProfileFormModal/DoctorSelectorField.tsx`
- `frontend/src/hooks/useDoctorOptions.ts`
- `frontend/test/components/ProfileFormModal.spec.tsx`
- `frontend/test/hooks/useDoctorOptions.spec.ts`
