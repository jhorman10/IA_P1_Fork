# Casos Gherkin QA - admin-office-catalog-management (SPEC-016)

## Alcance

QA para la spec activa SPEC-016 sobre tres frentes funcionales coordinados:

- HU-01: gestion operativa del catalogo de consultorios.
- HU-02: ampliacion secuencial de capacidad sin renumeracion.
- HU-03: check-in del doctor y elegibilidad dinamica para check-in y consumer.

La spec no define SLA ni umbrales de performance. En esta fase QA solo aplican artefactos de Gherkin y riesgos.

## Flujos criticos priorizados

- Semilla inicial 1..5 para preservar el comportamiento historico al introducir el catalogo Office.
- Listado admin del catalogo con orden ascendente, estado habilitado/deshabilitado y estado libre/ocupado.
- Habilitar y deshabilitar consultorios sin borrar ni renumerar.
- Bloqueo al intentar deshabilitar un consultorio ocupado.
- Ampliacion secuencial e idempotente de capacidad.
- Check-in del doctor usando solo consultorios habilitados y libres.
- Rechazo operativo cuando el consultorio pierde elegibilidad antes de confirmar.
- Persistencia historica de Appointment.office como snapshot de negocio.
- Filtrado del consumer para ignorar doctores en consultorios ausentes o deshabilitados.

## HU-01 - Gestion operativa del catalogo de consultorios

```gherkin
#language: es
Caracteristica: Gestion operativa del catalogo de consultorios

  @smoke @critico @happy-path @hu-01 @bootstrap
  Escenario: El administrador ve el catalogo inicial 1..5 al introducir la funcionalidad
    Dado que la organizacion aun no tiene catalogo Office persistido
    Cuando el Administrador abre por primera vez la gestion de consultorios
    Entonces el sistema presenta consultorios 1, 2, 3, 4 y 5 habilitados
    Y la numeracion queda lista para ampliarse desde el siguiente numero consecutivo

  @smoke @critico @happy-path @hu-01 @criterio-1-1
  Escenario: El administrador lista el catalogo operativo completo
    Dado que existen consultorios registrados en el catalogo operativo
    Cuando el Administrador entra a la gestion de consultorios
    Entonces el sistema muestra todos los consultorios ordenados por numero ascendente
    Y para cada consultorio informa numero, estado habilitado o deshabilitado y estado libre u ocupado
    Y el sistema indica si ese consultorio puede deshabilitarse en ese momento

  @smoke @critico @happy-path @hu-01 @criterio-1-2
  Escenario: El administrador deshabilita un consultorio libre sin alterar la numeracion
    Dado que el consultorio 4 existe, esta habilitado y se encuentra libre
    Cuando el Administrador lo deshabilita
    Entonces el consultorio 4 queda fuera de la oferta operativa para nuevos check-in
    Y ningun otro consultorio cambia de numero
    Y el consultorio 4 permanece registrado en el catalogo

  @happy-path @hu-01 @criterio-1-3
  Escenario: El administrador vuelve a habilitar un consultorio deshabilitado
    Dado que el consultorio 4 existe y esta deshabilitado
    Cuando el Administrador lo habilita nuevamente
    Entonces el consultorio 4 vuelve a estar disponible para check-in si sigue libre
    Y el numero 4 conserva su identidad historica

  @error-path @critico @hu-01 @criterio-1-4
  Escenario: El administrador intenta deshabilitar un consultorio ocupado
    Dado que el consultorio 2 esta ocupado por un doctor activo
    Cuando el Administrador intenta deshabilitar el consultorio 2
    Entonces el sistema rechaza la operacion porque el consultorio esta ocupado
    Y el consultorio 2 conserva su estado habilitado original
    Y el doctor que lo ocupa no pierde su contexto operativo por esa accion rechazada

  @edge-case @historial @hu-01 @criterio-1-5
  Escenario: Deshabilitar un consultorio con historial no altera turnos previos
    Dado que el consultorio 5 tiene turnos historicos cerrados o cancelados
    Y el consultorio 5 no tiene un doctor activo en este momento
    Cuando el Administrador deshabilita el consultorio 5
    Entonces el catalogo marca al consultorio 5 como deshabilitado
    Y los turnos historicos siguen mostrando consultorio 5
    Y la trazabilidad del historial no se renumera ni se reescribe

  @seguridad @hu-01
  Escenario: Solo el Administrador puede operar el catalogo de consultorios
    Dado que un usuario autenticado no tiene rol Administrador
    Cuando intenta entrar a la gestion de consultorios o cambiar el estado de un consultorio
    Entonces el sistema bloquea la operacion administrativa
    Y el catalogo operativo no se modifica
```

## HU-02 - Ampliacion secuencial de capacidad de consultorios

```gherkin
#language: es
Caracteristica: Ampliacion secuencial de capacidad de consultorios

  @smoke @critico @happy-path @hu-02 @criterio-2-1
  Escenario: El administrador amplia la capacidad y se crean nuevos consultorios consecutivos
    Dado que el catalogo actual contiene los consultorios 1, 2, 3, 4 y 5
    Cuando el Administrador establece una capacidad objetivo de 8
    Entonces el sistema crea los consultorios 6, 7 y 8 en estado habilitado
    Y los consultorios 1 a 5 conservan su numeracion original
    Y el catalogo final queda formado por 1 a 8 sin huecos nuevos ni renumeracion

  @happy-path @hu-02 @criterio-2-2
  Escenario: Repetir la misma capacidad no duplica consultorios
    Dado que el mayor numero existente en el catalogo es 8
    Cuando el Administrador vuelve a establecer la capacidad objetivo 8
    Entonces el sistema confirma la operacion sin crear registros nuevos
    Y el catalogo conserva exactamente un consultorio por cada numero existente

  @error-path @hu-02 @criterio-2-3
  Escenario: El administrador intenta reducir la capacidad por debajo del maximo existente
    Dado que el catalogo ya contiene consultorios hasta el numero 8
    Cuando el Administrador establece una capacidad objetivo de 6
    Entonces el sistema rechaza la operacion indicando que la reduccion se resuelve deshabilitando consultorios
    Y el catalogo conserva todos los numeros existentes

  @edge-case @hu-02 @criterio-2-4
  Escenario: La ampliacion no reutiliza numeros ya existentes aunque esten deshabilitados
    Dado que existen consultorios 1 a 8
    Y los consultorios 5 y 7 estan deshabilitados
    Cuando el Administrador establece una capacidad objetivo de 10
    Entonces el sistema crea los consultorios 9 y 10
    Y los consultorios 5 y 7 permanecen deshabilitados
    Y la nueva capacidad no reutiliza numeros previos para representar otro consultorio
```

## HU-03 - Check-in del doctor con elegibilidad dinamica por catalogo Office

```gherkin
#language: es
Caracteristica: Check-in del doctor y elegibilidad dinamica por catalogo Office

  @smoke @critico @happy-path @hu-03 @criterio-3-1
  Escenario: El doctor solo ve consultorios habilitados y libres en orden ascendente
    Dado que el catalogo contiene consultorios 1, 2, 3, 4, 5 y 6
    Y el consultorio 2 esta deshabilitado
    Y el consultorio 4 esta ocupado por un doctor activo
    Cuando un doctor en estado offline abre su dashboard para hacer check-in
    Entonces el selector solo muestra los consultorios 1, 3, 5 y 6
    Y la lista visible respeta el orden ascendente por numero

  @smoke @critico @happy-path @hu-03 @criterio-3-2
  Escenario: El doctor hace check-in en un consultorio habilitado y libre
    Dado que el consultorio 6 existe, esta habilitado y esta libre
    Cuando el doctor selecciona el consultorio 6 y confirma el check-in
    Entonces el sistema deja al doctor disponible en el consultorio 6
    Y el doctor queda elegible para la operacion normal de pacientes segun las reglas vigentes

  @error-path @hu-03 @criterio-3-3
  Escenario: No existen consultorios habilitados y libres para hacer check-in
    Dado que todos los consultorios habilitados estan ocupados o no existen consultorios habilitados
    Cuando el doctor abre el selector de check-in
    Entonces la UI informa que no hay consultorios disponibles en ese momento
    Y el doctor no puede confirmar el check-in

  @error-path @critico @hu-03 @criterio-3-4
  Escenario: El consultorio elegido pierde elegibilidad antes de confirmar el check-in
    Dado que el doctor selecciono el consultorio 3 porque estaba listado como disponible
    Y antes de confirmar otro doctor ocupa el consultorio 3 o el Administrador lo deshabilita
    Cuando el doctor envia el check-in
    Entonces el sistema rechaza la operacion indicando que el consultorio ya no esta disponible
    Y la UI refresca la lista de consultorios elegibles
    Y el doctor debe elegir nuevamente un consultorio valido

  @edge-case @historial @hu-03 @criterio-3-5
  Escenario: El historial conserva el numero del consultorio asignado aunque luego se deshabilite
    Dado que un turno ya fue asignado al consultorio 4
    Y luego el consultorio 4 queda deshabilitado cuando esta libre
    Cuando se consulta el historial de ese turno
    Entonces el historial sigue mostrando consultorio 4
    Y el cambio de habilitacion posterior no altera el numero persistido del turno

  @integracion @consumer @hu-03
  Escenario: El motor de asignacion ignora doctores en consultorios ausentes o deshabilitados
    Dado que existe un conjunto de doctores disponibles para recibir pacientes
    Y algunos de esos doctores tienen consultorio ausente o deshabilitado en el catalogo Office
    Cuando el motor operativo evalua a quien asignar los turnos en espera
    Entonces solo considera elegibles a los doctores cuyo consultorio sigue habilitado en el catalogo
    Y los turnos no se asignan a doctores con consultorios fuera del catalogo operativo
```

## Datos de prueba sinteticos

| Escenario                  | Campo               | Valido                        | Invalido                            | Borde                                           |
| -------------------------- | ------------------- | ----------------------------- | ----------------------------------- | ----------------------------------------------- |
| Catalogo inicial           | numeros iniciales   | 1,2,3,4,5                     | catalogo vacio sin seed visible     | primer arranque con coleccion inexistente       |
| Listado admin              | orden               | 1,2,3,10                      | 1,10,2                              | mezcla de ocupados y deshabilitados             |
| Deshabilitar libre         | numero              | 4                             | 0                                   | ultimo consultorio libre antes de ampliar       |
| Deshabilitar ocupado       | estado ocupacion    | libre=false y ocupado=true    | libre=true asumido por error        | doctor cambia de estado durante la operacion    |
| Rehabilitar consultorio    | enabled             | false -> true                 | numero inexistente                  | consultorio historico con turnos previos        |
| Ampliar capacidad          | target_total        | 8                             | 0                                   | repetir el mismo valor ya aplicado              |
| Reducir capacidad          | target_total        | 8                             | 6 con maximo actual 8               | maximo actual mas uno                           |
| Ampliar con deshabilitados | numeros existentes  | 1..8 con 5 y 7 deshabilitados | recrear 5 o 7                       | crear 9 y 10 sin reactivar 5 ni 7               |
| Selector doctor            | offices visibles    | 1,3,5,6                       | 2 deshabilitado, 4 ocupado          | catalogo sin offices libres                     |
| Check-in con conflicto     | office seleccionado | 3 visible al cargar           | 3 deja de ser elegible al confirmar | disable admin y ocupacion concurrente           |
| Historial de turnos        | office historico    | 4                             | reescritura a null o a otro numero  | office deshabilitado despues de cerrar el turno |
| Consumer operativo         | enabled offices     | 7                             | 99 ausente o 2 deshabilitado        | solo un doctor elegible restante                |

## Cobertura automatizada observada en el workspace

| HU    | Cobertura lograda                                                                                                                                                                                                                | Evidencia focal validada                                                                                                                                                                                                                                                                                                    |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HU-01 | Seed inicial 1..5, listado admin, bloqueo al deshabilitar ocupados, actualizacion de enabled, auth 401/403 y UX admin para resumen, validacion y toggle de consultorios                                                          | backend/producer/test/src/application/use-cases/office.service.impl.spec.ts, backend/producer/test/src/offices/office.controller.spec.ts, frontend/src/**tests**/components/OfficeManagerComponent.test.tsx, frontend/src/**tests**/hooks/useOfficeCatalog.test.ts, frontend/src/**tests**/pages/AdminProfilesPage.test.tsx |
| HU-02 | Ajuste de capacidad sin cambios, rechazo de reduccion, ampliacion secuencial por contrato backend y flujo UI para aplicar nueva capacidad con refetch del catalogo                                                               | backend/producer/test/src/application/use-cases/office.service.impl.spec.ts, backend/producer/test/src/offices/office.controller.spec.ts, frontend/src/**tests**/components/OfficeManagerComponent.test.tsx, frontend/src/**tests**/hooks/useOfficeCatalog.test.ts                                                          |
| HU-03 | Check-in con office dinamico, rechazo de office inexistente o deshabilitado, listado de consultorios habilitados y libres, filtrado del consumer por catalogo Office y UX de dashboard para empty state y refetch tras conflicto | backend/producer/test/src/application/use-cases/doctor.service.impl.spec.ts, backend/producer/test/src/doctors/doctor.controller.spec.ts, backend/consumer/test/src/application/use-cases/assign-doctor.use-case.impl.spec.ts, frontend/src/**tests**/pages/DoctorDashboardPage.test.tsx                                    |

## Gaps residuales razonables

- No hay evidencia automatizada deterministica de concurrencia real entre deshabilitar un consultorio y hacer check-in sobre ese mismo numero; hoy solo esta cubierto el contrato por separado.
- No se encontro una prueba de arranque paralelo o de catalogo parcialmente sembrado que valide la robustez del seed 1..5 en escenarios multi-instancia.
- No hay un caso automatizado explicito para el criterio 2.4 que demuestre que ampliar capacidad con numeros deshabilitados no los reactiva ni los reutiliza.
- No hay una regresion integrada que consulte historico de turnos despues de deshabilitar un consultorio y confirme por lectura de negocio que Appointment.office se mantiene intacto.
- No se encontro evidencia integrada producer + consumer sobre la misma coleccion offices para validar orden de arranque, seed y elegibilidad real de asignacion.

## Evidencia base usada para esta salida

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
