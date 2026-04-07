# Matriz de Riesgos ASD - unified-doctor-profile-dynamic-office (SPEC-015)

## 1. Resumen

Contexto evaluado:

- Spec activa en estado `IN_PROGRESS` con cambios coordinados en backend, frontend y catalogo de datos.
- Flujo principal repartido entre autenticacion externa, perfil operativo, entidad doctor y catalogo de especialidades.
- Operacion live de consultorios con riesgo de concurrencia y de consistencia operativa en check-in y check-out.
- La spec no define SLA ni umbrales de performance, por lo que no corresponde generar artefacto de performance en esta fase.

Total: 7 riesgos | Alto (A): 4 | Medio (S): 3 | Bajo (D): 0

Leyenda ASD:

- A = testing obligatorio. Si queda sin evidencia suficiente, bloquea el sign-off de release.
- S = testing recomendado. Debe quedar trazado si se difiere.
- D = testing opcional o mejora diferible.

## 2. Matriz de riesgos

| ID        | HU / Area                                 | Descripcion del riesgo                                                                                                                                                                          | Factores de riesgo                                                                             | Nivel ASD | Testing requerido | Mitigacion / control actual                                                                                                                                                                                                             |
| --------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-015-001 | HU-02 check-in dinamico                   | Dos doctores pueden intentar ocupar el mismo consultorio a partir de una lista de disponibilidad obsoleta; si la validacion atomica falla, se produce doble ocupacion o inconsistencia visible. | Logica concurrente, operacion de alta frecuencia, codigo nuevo, impacto operativo directo      | A         | Obligatorio       | Hay cobertura de contrato `409` en controller y cobertura UI/hook para selector y refetch, pero no evidencia deterministica de concurrencia real a nivel repositorio o DB.                                                              |
| R-015-002 | HU-01 + HU-03 integridad specialty doctor | La relacion entre `Doctor.specialtyId`, `Doctor.specialty` y `Specialty` puede quedar inconsistente tras crear, editar, renombrar o eliminar especialidades.                                    | Integridad referencial, dato denormalizado, CRUD admin, cambio cross-entity                    | A         | Obligatorio       | El servicio bloquea delete con doctores vinculados, el modal envia `specialty_id`, y el backend ya cubre la actualizacion de `specialty_id` en perfiles doctor. Falta probar preservacion del vinculo tras rename en flujos de lectura. |
| R-015-003 | HU-01 creacion unificada                  | La secuencia Firebase user -> Doctor -> Profile puede dejar entidades parciales si una etapa falla despues de crear otra, generando inconsistencia perfil doctor o usuarios huerfanos.          | Integracion externa, sin transaccion distribuida, datos operativos, codigo nuevo               | A         | Obligatorio       | El happy path esta cubierto y la validacion de `specialty_id` tambien, pero no hay evidencia de compensacion, rollback o manejo de fallos intermedios.                                                                                  |
| R-015-004 | HU-02 check-out y liberacion              | El consultorio puede no liberarse cuando corresponde, o liberarse en un estado incorrecto, afectando la disponibilidad real para otros doctores y la asignacion posterior.                      | Consistencia operativa, dependencia de estado del doctor y citas, impacto en operacion en vivo | A         | Obligatorio       | Hay cobertura de `check-out` que limpia `office` y de rechazo cuando el doctor esta `busy`, pero no hay secuencia automatizada que pruebe la reutilizacion inmediata del consultorio por otro doctor.                                   |
| R-015-005 | HU-02 sincronizacion de UI                | Tras un `409` o un estado sin offices libres, la UI puede quedar desactualizada y seguir ofreciendo acciones contra una disponibilidad antigua.                                                 | Dependencia de red, feedback UX, flujo alterno sensible                                        | S         | Recomendado       | `useAvailableOffices` cubre carga, empty state, error y `refetch`; `DoctorStatusCard` cubre selector y boton deshabilitado. Falta evidencia de pagina o E2E para refresh real despues del conflicto.                                    |
| R-015-006 | HU-03 CRUD UI de especialidades           | El flujo visual admin del catalogo puede divergir del hook probado y no propagar altas, ediciones o errores a los selectores usados por perfiles doctor.                                        | Nueva UI, varias dependencias, uso administrativo frecuente                                    | S         | Recomendado       | Hay buena cobertura en servicio/hook, pero no se encontro evidencia automatizada del componente o pagina `SpecialtyManager`.                                                                                                            |
| R-015-007 | HU-01 + HU-02 + HU-03 trazabilidad E2E    | La cadena completa admin crea doctor -> doctor hace check-in -> check-out libera -> siguiente doctor reutiliza office -> catalogo sigue consistente no esta probada de punta a punta.           | Flujo transversal, multiples modulos, regresion integrada pendiente                            | S         | Recomendado       | Existen pruebas focales por capa y contexto adicional en dashboard y consumer, pero no hay evidencia E2E especifica de SPEC-015.                                                                                                        |

## 3. Plan de mitigacion para riesgos A

### R-015-001 - Race condition en ocupacion de consultorio

- Mitigacion actual:
  - El contrato backend ya contempla `409` cuando el consultorio fue ocupado por otro doctor.
  - La UI ya muestra selector de offices libres y el hook expone `refetch`.
- Falta para cierre fuerte:
  - Prueba de integracion o repositorio con dos check-in concurrentes al mismo office y asercion `200 + 409`.
  - Escenario de pagina o E2E que valide refresh del selector luego del conflicto.
- Bloqueante para release si se omite: Si.

### R-015-002 - Integridad specialty doctor

- Mitigacion actual:
  - La creacion y edicion de perfil doctor ya trabajan con `specialty_id`.
  - El servicio impide eliminar especialidades con doctores vinculados.
  - El gap de backend para editar `specialty_id` en perfiles doctor quedo cubierto por pruebas `200`, `400` y `404`.
- Falta para cierre fuerte:
  - Prueba integrada que renombre una especialidad y verifique que los doctores siguen vinculados por ID en lecturas posteriores.
  - Prueba UI que demuestre propagacion del catalogo actualizado hacia el formulario de perfiles.
- Bloqueante para release si se omite: Si.

### R-015-003 - Consistencia Profile / Doctor / Firebase

- Mitigacion actual:
  - El happy path de creacion unificada esta cubierto de extremo controller a servicios mockeados.
  - La validacion obligatoria de `specialty_id` evita altas doctor incompletas por omission del catalogo.
  - La actualizacion de especialidad ya contempla estados inconsistentes como `doctor_id = null` o doctor inexistente.
- Falta para cierre fuerte:
  - Pruebas de fallo intermedio: usuario autenticable creado pero fallo al crear doctor, y doctor creado pero fallo al crear profile.
  - Definicion observable de compensacion esperada o limpieza posterior.
- Bloqueante para release si se omite: Si.

### R-015-004 - Liberacion y reutilizacion del consultorio

- Mitigacion actual:
  - El backend ya limpia `office` al hacer check-out.
  - El backend rechaza el check-out si el doctor sigue `busy` con paciente asignado.
  - Existe endpoint para consultar offices libres.
- Falta para cierre fuerte:
  - Escenario secuencial que pruebe: doctor A ocupa office -> doctor A hace check-out -> office reaparece en disponibles -> doctor B ocupa ese mismo office.
  - Verificacion integrada de que no se libera el office antes de tiempo en transiciones con cita activa.
- Bloqueante para release si se omite: Si.

## 4. Cobertura lograda y gaps residuales

### Cobertura lograda

- HU-01: cubierta en create y edit del perfil doctor, incluyendo selector de especialidad, validacion sin especialidad, catalogo vacio y actualizacion de `specialty_id` en el doctor vinculado.
- HU-02: cubiertos el contrato de check-in con office, la validacion de office invalido, el `409` por office ocupado, el check-out que limpia office, el endpoint de offices libres y la UX basica del selector en dashboard.
- HU-03: cubiertos create, update, delete, duplicate y proteccion referencial del catalogo en servicio, junto con manejo de estados y errores en el hook frontend.

### Gaps residuales importantes

- Falta evidencia de concurrencia real; hoy solo esta probado el contrato de conflicto, no la atomicidad efectiva bajo simultaneidad.
- Falta probar fallos parciales de la creacion unificada y su efecto en la consistencia entre autenticacion, doctor y profile.
- Falta la secuencia completa de liberacion y reutilizacion del consultorio por otro doctor.
- Falta una prueba explicita de que renombrar especialidades preserva el vinculo por ID en flujos de negocio reales.

### Gaps residuales razonables

- No se encontro cobertura UI del `SpecialtyManager` ni del flujo admin completo del catalogo.
- No se encontro E2E especifico de SPEC-015 que atraviese admin, doctor y disponibilidad real.
- El criterio HU-02 sobre segundo check-in con consultorio distinto queda cubierto de forma indirecta por piezas, pero no por un escenario automatizado dedicado.

## 5. Decision QA local

Resultado QA local: artefactos QA generados y trazabilidad funcional suficiente para continuar, con riesgos residuales A/S abiertos para sign-off final.

Interpretacion:

- La implementacion focal validada demuestra que el feature principal existe y responde correctamente en sus contratos mas importantes.
- El cierre del gap backend de edicion de `specialty_id` mejora de forma tangible la consistencia perfil doctor y reduce uno de los riesgos historicos de la spec.
- Los riesgos mas sensibles que permanecen abiertos son la concurrencia real del consultorio y la consistencia ante fallos parciales de la creacion unificada.
- Si la decision fuera release sign-off, la recomendacion QA seria condicionada a cubrir al menos R-015-001, R-015-003 y R-015-004 con evidencia adicional.

## 6. Evidencia base usada para esta salida

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
