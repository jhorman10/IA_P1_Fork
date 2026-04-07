# Matriz de Riesgos ASD - admin-office-catalog-management (SPEC-016)

## 1. Resumen

Contexto evaluado:

- Spec activa en estado IN_PROGRESS con cambios coordinados en producer, consumer y frontend.
- La fuente de verdad para consultorios cambio desde una constante fija hacia el catalogo Office persistido.
- La funcionalidad introduce dependencias operativas entre seed, gestion admin, check-in del doctor y asignacion del consumer.
- La spec no define SLA ni umbrales de performance, por lo que no corresponde artefacto de performance en esta fase.

Total: 4 riesgos | Alto (A): 1 | Medio (S): 3 | Bajo (D): 0

Leyenda ASD:

- A = testing obligatorio. Si queda sin evidencia suficiente, bloquea el sign-off de release.
- S = testing recomendado. Debe quedar trazado si se difiere.
- D = testing opcional o mejora diferible.

Marcacion especial:

- ALTO RESIDUAL: R-016-001 permanece abierto y es el principal riesgo de release observado en el codigo actual.

## 2. Matriz de riesgos

| ID        | HU / Area                                                    | Descripcion del riesgo                                                                                                                                                                                                                                                                                                                  | Factores de riesgo                                                                                                 | Nivel ASD | Testing requerido | Mitigacion / control actual                                                                                                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-016-001 | HU-03 concurrencia disable vs check-in                       | ALTO RESIDUAL. Un doctor puede validar que un consultorio esta habilitado y, antes de persistir su check-in, el Administrador deshabilitar ese mismo consultorio. El resultado posible es dejar al doctor disponible en un office ya deshabilitado porque las validaciones viven en operaciones separadas y sin transaccion compartida. | Logica concurrente, operacion en vivo, cambio cross-collection, feature nueva de alto impacto                      | A         | Obligatorio       | Hay cobertura separada para 409 por office ocupado, para rechazo de office deshabilitado y para refetch UI tras conflicto. Sin embargo, el repositorio de doctores documenta que el check-in es best-effort y que la atomicidad real requeriria transacciones MongoDB.                                      |
| R-016-002 | HU-01 seed inicial 1..5                                      | La semilla inicial puede comportarse de forma no idempotente en arranque paralelo o catalogo parcialmente sembrado, porque el flujo actual hace findMaxNumber seguido de insertMany sin upsert ni manejo explicito de duplicate key.                                                                                                    | Bootstrap operativo, codigo nuevo, dependencia de datos persistidos, posible despliegue multi-instancia            | S         | Recomendado       | Existe unique index sobre Office.number y un test unitario que verifica el seed cuando el catalogo esta vacio. No hay evidencia de arranque paralelo, seed parcial ni tolerancia a errores de duplicado durante bootstrap.                                                                                  |
| R-016-003 | HU-01 y HU-03 compatibilidad historica de Appointment.office | Deshabilitar consultorios o ampliar capacidad podria romper reportes o historicos si algun flujo reescribe el numero ya persistido en Appointment.office o si las lecturas dejan de reconocer snapshots historicos.                                                                                                                     | Trazabilidad historica, dato compartido entre producer y consumer, regresion de lectura                            | S         | Recomendado       | El modelo actual conserva Appointment.office como snapshot; assignDoctor persiste el numero y no se encontro ningun flujo de toggle de Office que actualice appointments. Falta una regresion automatizada que pruebe el comportamiento por lectura de negocio despues de deshabilitar un office historico. |
| R-016-004 | HU-03 dependencia del consumer respecto al catalogo Office   | El consumer puede dejar de asignar pacientes o descartar doctores validos si el catalogo Office esta vacio, desincronizado o refleja un office deshabilitado para un doctor que aun aparece disponible por una carrera operativa.                                                                                                       | Dependencia entre modulos, operacion critica, cambio reciente, comportamiento safe-fail pero con impacto operativo | S         | Recomendado       | El use case del consumer ya filtra por enabledOffices y tiene tests que prueban tanto el filtrado como el caso sin elegibles. No existe evidencia integrada producer + consumer sobre la misma coleccion offices ni validacion de orden de arranque o desincronizacion real.                                |

## 3. Plan de mitigacion para riesgos A

### R-016-001 - Concurrencia entre deshabilitar y hacer check-in

- Mitigacion actual:
  - El backend rechaza check-in cuando el office ya esta deshabilitado al momento de validar.
  - El backend rechaza deshabilitar un office ya ocupado.
  - La UI del dashboard refresca la lista de offices luego de un conflicto de check-in.
- Evidencia tecnica observada:
  - DoctorServiceImpl valida Office.enabled antes de repo.updateStatusAndOffice.
  - OfficeServiceImpl valida ocupacion antes de officeRepo.updateEnabled.
  - MongooseDoctorRepository declara que el control de ocupacion es best-effort y que la atomicidad real requeriria transacciones.
- Falta para cierre fuerte:
  - Prueba de integracion concurrente que ejecute en paralelo PATCH de check-in y PATCH de deshabilitacion sobre el mismo numero.
  - Evidencia de resultado consistente esperable bajo carrera: o bien check-in exitoso con office aun habilitado, o bien rechazo coherente, pero nunca doctor disponible en office deshabilitado.
  - Validacion posterior de impacto en consumer cuando la carrera deja un doctor en office no elegible.
- Bloqueante para release si se omite: Si.

## 4. Cobertura lograda y gaps residuales

### Cobertura lograda

- HU-01: cubierta la semilla basica del catalogo, el listado admin, el bloqueo al deshabilitar consultorios ocupados, el cambio de enabled, y las restricciones de acceso admin en controller y frontend.
- HU-02: cubiertos el aumento secuencial por contrato, el caso idempotente sin cambios, el rechazo de reduccion por debajo del maximo y la validacion visual de capacidad en OfficeManager.
- HU-03: cubiertos check-in con consultorio dinamico, rechazo de consultorio inexistente o deshabilitado, listado de offices habilitados menos ocupados, empty state en dashboard y filtrado del consumer por catalogo Office.

### Gaps residuales importantes

- Falta evidencia deterministica de carrera real entre disable y check-in; ese es el principal gap de release.
- Falta una prueba de robustez del seed 1..5 frente a arranque paralelo o catalogo parcialmente existente.
- Falta una regresion que valide por lectura de negocio que un Appointment.office historico no cambia despues de deshabilitar el consultorio.
- Falta una prueba integrada producer + consumer que cubra el catalogo compartido, el seed y la elegibilidad real del motor de asignacion.

### Gaps residuales razonables

- No hay un caso automatizado explicito del criterio 2.4 para probar que ampliar capacidad con offices deshabilitados no los reactiva ni los reutiliza.
- No se encontro E2E especifico de SPEC-016 que encadene admin ajusta catalogo -> doctor hace check-in -> consumer asigna usando ese mismo catalogo.
- No hay evidencia de comportamiento ante fallos de bootstrap del catalogo durante un despliegue con mas de una instancia del producer.

## 5. Decision QA local

Resultado QA local: artefactos QA generados y trazabilidad funcional suficiente para continuar con seguimiento, con un riesgo A residual abierto y tres riesgos S documentados.

Interpretacion:

- La funcionalidad principal existe y tiene evidencia automatizada relevante en backend, frontend y consumer.
- El riesgo mas sensible no esta en el contrato nominal sino en la consistencia bajo simultaneidad entre disable admin y check-in doctor.
- El seed inicial y la compatibilidad historica muestran una base de diseno correcta, pero aun no tienen pruebas integradas de robustez operacional.
- La recomendacion QA para sign-off final seria condicionada a obtener evidencia adicional sobre R-016-001 y, en segundo nivel, sobre R-016-002 y R-016-004 si el despliegue contempla multiples instancias o alta concurrencia operativa.

## 6. Evidencia base usada para esta salida

### Focal validada por el usuario

- .github/specs/admin-office-catalog-management.spec.md
- backend/producer/test/src/application/use-cases/office.service.impl.spec.ts
- backend/producer/test/src/offices/office.controller.spec.ts
- backend/producer/test/src/application/use-cases/doctor.service.impl.spec.ts
- backend/producer/test/src/doctors/doctor.controller.spec.ts
- backend/consumer/test/src/application/use-cases/assign-doctor.use-case.impl.spec.ts
- frontend/src/**tests**/components/OfficeManagerComponent.test.tsx
- frontend/src/**tests**/hooks/useOfficeCatalog.test.ts
- frontend/src/**tests**/pages/AdminProfilesPage.test.tsx
- frontend/src/**tests**/pages/DoctorDashboardPage.test.tsx

### Contexto adicional consultado en el workspace

- backend/producer/src/application/use-cases/office.service.impl.ts
- backend/producer/src/application/use-cases/doctor.service.impl.ts
- backend/producer/src/infrastructure/adapters/outbound/mongoose-doctor.repository.ts
- backend/producer/src/infrastructure/adapters/outbound/mongoose-office.repository.ts
- backend/producer/src/schemas/office.schema.ts
- backend/consumer/src/application/use-cases/assign-doctor.use-case.impl.ts
- backend/consumer/src/domain/entities/appointment.entity.ts
