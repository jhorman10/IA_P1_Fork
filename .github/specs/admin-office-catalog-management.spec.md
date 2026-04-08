---
id: SPEC-016
status: IMPLEMENTED
feature: admin-office-catalog-management
created: 2026-04-06
updated: 2026-04-07
author: spec-generator
version: "1.0"
related-specs: [SPEC-003, SPEC-004, SPEC-008, SPEC-012, SPEC-015]
---

# Spec: Catálogo Administrable de Consultorios

> **Estado:** `IMPLEMENTED`.
> **Nota de despliegue:** si el entorno ya tiene el índice legado `office_1` en `doctors`, validar y eliminar ese índice antes de aplicar el nuevo índice `unique+sparse` de `office`.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Evolucionar el modelo actual de consultorios válidos fijos `1..5` hacia un catálogo administrable por el Administrador, con numeración secuencial estable y control operativo por consultorio individual. El objetivo es que la capacidad deje de depender de constantes de código y pase a resolverse desde datos persistidos, sin romper el flujo vigente de check-in/check-out ni la trazabilidad histórica de médicos y turnos.

La funcionalidad debe permitir listar consultorios, ampliar capacidad creando nuevos números secuenciales, habilitar o deshabilitar consultorios libres, y hacer que el dashboard del doctor solo ofrezca consultorios habilitados y desocupados al momento del check-in.

### Requerimiento de Negocio

Fuente: aprobado por el usuario en conversación directa. No existe todavía un archivo dedicado en `.github/requirements/` para este feature.

1. Ya existe e implementada la spec `unified-doctor-profile-dynamic-office` (SPEC-015), que asume consultorios válidos fijos `1..5`.
2. Nuevo requerimiento: cuando no haya consultorios disponibles, el Administrador debe poder editar la cantidad de consultorios y habilitar o deshabilitar consultorios.
3. Decisión confirmada: el modelo debe ser un catálogo editable de consultorios individuales, no un simple total global.
4. Decisión confirmada: si un consultorio está ocupado por un doctor activo, la deshabilitación debe bloquearse hasta que quede libre.
5. Decisión confirmada: la numeración debe ser secuencial y estable. Al ampliar capacidad se crean nuevos números; no se renumeran los existentes.
6. Alcance operativo mínimo de esta spec:
   - listar consultorios
   - habilitar/deshabilitar consultorios
   - ampliar la cantidad creando nuevos consultorios secuenciales
   - permitir reducción operativa solo por deshabilitación, sin borrar ni renumerar
7. El doctor solo debe ver consultorios habilitados y libres al hacer check-in.
8. Las reglas vigentes de check-in/check-out y de asignación de turnos continúan, pero la fuente de verdad para consultorios válidos deja de ser una constante fija y pasa a ser el catálogo `Office` habilitado.

### Historias de Usuario

#### HU-01: Gestión operativa del catálogo de consultorios

```text
Como:        Administrador
Quiero:      Listar consultorios y habilitar o deshabilitar consultorios individuales
Para:        Ajustar la capacidad operativa sin tocar código y sin renumerar el sistema

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-015
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Admin lista el catálogo completo de consultorios
  Dado que:  existen consultorios registrados en el catálogo operativo
  Cuando:    el admin entra a la gestión de consultorios
  Entonces:  el sistema lista todos los consultorios ordenados por número ascendente
  Y:         muestra para cada consultorio su número, estado habilitado/deshabilitado y estado libre/ocupado
  Y:         informa si el consultorio puede o no ser deshabilitado en ese momento
```

```gherkin
CRITERIO-1.2: Admin deshabilita un consultorio libre
  Dado que:  el consultorio 4 existe, está habilitado y no tiene un doctor activo asignado
  Cuando:    el admin lo deshabilita
  Entonces:  el sistema actualiza el catálogo marcando el consultorio 4 como deshabilitado
  Y:         el consultorio 4 deja de aparecer en la lista de consultorios disponibles para check-in
  Y:         no se elimina ni se renumera ningún consultorio existente
```

```gherkin
CRITERIO-1.3: Admin vuelve a habilitar un consultorio deshabilitado
  Dado que:  el consultorio 4 existe y está deshabilitado
  Cuando:    el admin lo habilita
  Entonces:  el sistema marca el consultorio 4 como habilitado
  Y:         el consultorio 4 vuelve a ser elegible para el listado de consultorios disponibles si está libre
```

**Error Path**

```gherkin
CRITERIO-1.4: Admin intenta deshabilitar un consultorio ocupado
  Dado que:  el consultorio 2 está asignado a un doctor con status "available" o "busy"
  Cuando:    el admin intenta deshabilitar el consultorio 2
  Entonces:  el backend rechaza la operación con 409 "No se puede deshabilitar: el consultorio está ocupado"
  Y:         el estado del consultorio no cambia
```

**Edge Case**

```gherkin
CRITERIO-1.5: Deshabilitar un consultorio con historial previo no altera el histórico
  Dado que:  el consultorio 5 tiene citas históricas cerradas o canceladas
  Y:         no tiene un doctor activo asignado en este momento
  Cuando:    el admin deshabilita el consultorio 5
  Entonces:  el catálogo marca el consultorio 5 como deshabilitado
  Y:         los turnos históricos que referencian consultorio 5 no se modifican
  Y:         la trazabilidad histórica sigue mostrando el número 5 sin renumeración
```

---

#### HU-02: Ampliación secuencial de capacidad de consultorios

```text
Como:        Administrador
Quiero:      Editar la capacidad operativa creando nuevos consultorios secuenciales
Para:        Aumentar la oferta de consultorios sin romper la numeración histórica

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01, SPEC-015
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**

```gherkin
CRITERIO-2.1: Admin aumenta la capacidad objetivo y se crean nuevos consultorios secuenciales
  Dado que:  el catálogo actual tiene consultorios 1, 2, 3, 4 y 5
  Cuando:    el admin establece capacidad objetivo 8
  Entonces:  el sistema crea los consultorios 6, 7 y 8 en estado habilitado
  Y:         los consultorios 1 a 5 conservan su numeración original
  Y:         el catálogo final queda compuesto por 1 a 8 sin huecos nuevos ni renumeración
```

```gherkin
CRITERIO-2.2: Repetir la misma capacidad objetivo no duplica consultorios
  Dado que:  el mayor número existente en el catálogo es 8
  Cuando:    el admin vuelve a establecer capacidad objetivo 8
  Entonces:  el sistema no crea registros duplicados
  Y:         responde exitosamente como operación sin cambios
```

**Error Path**

```gherkin
CRITERIO-2.3: Admin intenta reducir la capacidad objetivo por debajo del máximo existente
  Dado que:  el mayor número existente en el catálogo es 8
  Cuando:    el admin establece capacidad objetivo 6
  Entonces:  el backend rechaza con 400 "La reducción de capacidad se realiza deshabilitando consultorios"
  Y:         no elimina ni renumera consultorios existentes
```

**Edge Case**

```gherkin
CRITERIO-2.4: La ampliación no reactiva ni reutiliza números deshabilitados
  Dado que:  existen consultorios 1 a 8
  Y:         los consultorios 5 y 7 están deshabilitados
  Cuando:    el admin establece capacidad objetivo 10
  Entonces:  el sistema crea los consultorios 9 y 10
  Y:         los consultorios 5 y 7 permanecen deshabilitados
  Y:         no se reutilizan números existentes para representar nueva capacidad
```

---

#### HU-03: Check-in del doctor solo con consultorios habilitados y libres

```text
Como:        Doctor autenticado
Quiero:      Ver y seleccionar únicamente consultorios habilitados y libres
Para:        Hacer check-in solo en espacios operativamente disponibles

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01, HU-02, SPEC-008, SPEC-015
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**

```gherkin
CRITERIO-3.1: El selector del doctor solo muestra consultorios habilitados y libres
  Dado que:  el catálogo contiene consultorios 1, 2, 3, 4, 5 y 6
  Y:         el consultorio 2 está deshabilitado
  Y:         el consultorio 4 está ocupado por un doctor activo
  Cuando:    un doctor offline abre su dashboard para hacer check-in
  Entonces:  el selector solo muestra los consultorios 1, 3, 5 y 6
  Y:         el orden visible es ascendente por número
```

```gherkin
CRITERIO-3.2: Doctor hace check-in en un consultorio habilitado y libre
  Dado que:  el consultorio 6 existe, está habilitado y no está ocupado
  Cuando:    el doctor selecciona el consultorio 6 y confirma el check-in
  Entonces:  el sistema actualiza Doctor.status a "available"
  Y:         el sistema actualiza Doctor.office a "6"
  Y:         el doctor queda elegible para la asignación operativa de pacientes según las reglas vigentes
```

**Error Path**

```gherkin
CRITERIO-3.3: No hay consultorios habilitados y libres para check-in
  Dado que:  todos los consultorios habilitados están ocupados o no existen consultorios habilitados
  Cuando:    el doctor abre el selector de check-in
  Entonces:  la UI muestra "No hay consultorios disponibles en este momento"
  Y:         no permite confirmar check-in
```

```gherkin
CRITERIO-3.4: El consultorio elegido dejó de ser elegible antes de confirmar el check-in
  Dado que:  el doctor seleccionó el consultorio 3 que estaba listado como disponible
  Y:         antes de confirmar, otro doctor ocupa el consultorio 3 o el admin lo deshabilita
  Cuando:    el doctor envía el check-in
  Entonces:  el backend rechaza con 409 indicando que el consultorio ya no está disponible
  Y:         la UI refresca la lista de consultorios elegibles
```

**Edge Case**

```gherkin
CRITERIO-3.5: El flujo de turnos conserva el número histórico del consultorio asignado
  Dado que:  un turno fue asignado previamente al consultorio 4
  Y:         el consultorio 4 luego es deshabilitado cuando queda libre
  Cuando:    se consulta el histórico del turno
  Entonces:  el histórico sigue mostrando consultorio 4
  Y:         el cambio de habilitación no altera el número persistido en Appointment.office
```

### Reglas de Negocio

1. El catálogo `Office` se convierte en la fuente de verdad para determinar qué consultorios existen y cuáles están habilitados.
2. Cada consultorio tiene un `number` único, estable y secuencial. Ese número nunca se renumera ni se recicla para representar otro consultorio distinto.
3. La ampliación de capacidad solo puede crear nuevos consultorios con números consecutivos a partir del mayor número existente.
4. La reducción de capacidad no elimina registros ni reduce el número máximo existente; se resuelve exclusivamente deshabilitando consultorios.
5. Un consultorio deshabilitado no puede aparecer en el selector de check-in ni ser elegible para nuevas operaciones activas.
6. No se puede deshabilitar un consultorio si existe un doctor con `status in ["available", "busy"]` y `office == number`.
7. Habilitar un consultorio deshabilitado es válido si el registro existe; al reactivarse vuelve a ser elegible cuando esté libre.
8. `Doctor.office` se mantiene como snapshot operativo `string | null`; no se introduce `officeId` en esta iteración para preservar compatibilidad con datos y flujos existentes.
9. `Appointment.office` se mantiene sin cambios como snapshot histórico del número de consultorio asignado. Los cambios de habilitación posteriores no reescriben historial.
10. El endpoint existente `GET /doctors/available-offices` sigue vigente por compatibilidad, pero su resultado ahora debe calcularse con el catálogo `Office.enabled=true` menos los consultorios ocupados por doctores activos.
11. El endpoint existente `PATCH /doctors/:id/check-in` sigue vigente por compatibilidad, pero valida contra el catálogo `Office` habilitado en lugar de una constante fija `1..5`.
12. La semilla inicial del catálogo debe preservar el comportamiento actual: si la colección `offices` aún no existe o está vacía, se crean consultorios `1..5` habilitados al introducir esta spec.
13. La ocupación del consultorio es estado derivado, no persistido en `Office`. Se calcula cruzando catálogo `Office` con `Doctor.status` y `Doctor.office`.
14. Para asignación operativa de pacientes, solo pueden considerarse doctores con `status = available` y `office != null`; adicionalmente, el consumer debe tratar como no elegible cualquier `office` ausente o deshabilitado en el catálogo.
15. No habrá borrado físico de consultorios en esta spec. El borrado queda fuera de alcance para no comprometer trazabilidad ni compatibilidad histórica.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad       | Almacén                  | Cambios                  | Descripción                                                                                                                |
| ------------- | ------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `Office`      | colección `offices`      | nueva                    | Catálogo administrable de consultorios individuales con estado habilitado/deshabilitado                                    |
| `Doctor`      | colección `doctors`      | cambio de comportamiento | Mantiene `office` como texto nullable, pero la validez y disponibilidad del consultorio pasan a resolverse contra `Office` |
| `Appointment` | colección `appointments` | sin cambio de schema     | Conserva `office` como snapshot histórico del consultorio asignado                                                         |
| `Profile`     | colección `profiles`     | sin cambio de schema     | Se reutiliza para autorización admin y dashboard doctor                                                                    |

#### Campos del modelo — Office

| Campo        | Tipo           | Obligatorio | Validación                    | Descripción                                                  |
| ------------ | -------------- | ----------- | ----------------------------- | ------------------------------------------------------------ |
| `_id`        | ObjectId       | sí          | auto-generado                 | Identificador interno MongoDB                                |
| `number`     | string         | sí          | regex `^[1-9][0-9]*$`, unique | Número estable del consultorio                               |
| `enabled`    | boolean        | sí          | default `true`                | Indica si el consultorio está operativo para nuevos check-in |
| `created_at` | datetime (UTC) | sí          | auto-generado                 | Timestamp de creación                                        |
| `updated_at` | datetime (UTC) | sí          | auto-generado                 | Timestamp de actualización                                   |

> **Decisión de compatibilidad:** `number` se modela como string numérico para alinear el catálogo nuevo con los campos ya existentes `Doctor.office` y `Appointment.office`, que hoy se usan como texto en producer, consumer y frontend.

#### Campos derivados de respuesta — Office

| Campo                     | Tipo           | Persistido | Descripción                                                  |
| ------------------------- | -------------- | ---------- | ------------------------------------------------------------ |
| `occupied`                | boolean        | no         | Indica si el consultorio está ocupado por un doctor activo   |
| `occupied_by_doctor_id`   | string \| null | no         | Doctor activo que ocupa el consultorio                       |
| `occupied_by_doctor_name` | string \| null | no         | Nombre visible del doctor activo                             |
| `occupied_by_status`      | string \| null | no         | Estado del doctor ocupante (`available` o `busy`)            |
| `can_disable`             | boolean        | no         | Conveniencia para UI; `false` si el consultorio está ocupado |

#### Campos del modelo — Doctor (sin breaking change de schema)

| Campo         | Tipo           | Obligatorio | Antes                          | Después                                        | Descripción                                   |
| ------------- | -------------- | ----------- | ------------------------------ | ---------------------------------------------- | --------------------------------------------- |
| `office`      | string \| null | no          | validado contra constante fija | validado contra catálogo `Office.enabled=true` | Snapshot del consultorio operativo del doctor |
| `status`      | enum           | sí          | sin cambio                     | sin cambio                                     | `available`, `busy`, `offline`                |
| `specialtyId` | string \| null | no          | sin cambio                     | sin cambio                                     | Continúa gobernado por SPEC-015               |

#### Campos del modelo — Appointment (sin cambio)

| Campo    | Tipo           | Obligatorio | Cambios | Descripción                                                                 |
| -------- | -------------- | ----------- | ------- | --------------------------------------------------------------------------- |
| `office` | string \| null | no          | ninguno | Conserva el número de consultorio asignado al turno como snapshot histórico |

#### Índices / Constraints

- `Office.number`: unique index para impedir duplicados de numeración.
- `Office.enabled + Office.number`: índice de apoyo para listados operativos y selección ascendente de consultorios habilitados.
- `Doctor.status`: se mantiene para motor de asignación.
- `Doctor.office`: mantener índice sparse/existente para búsquedas por ocupación.
- No se define `DELETE` lógico o físico para `Office` en esta spec.

### API Endpoints

#### GET /offices

- **Descripción**: Lista el catálogo completo de consultorios con metadatos operativos derivados.
- **Auth requerida**: sí, `admin`
- **Response 200**:
  ```json
  [
    {
      "number": "1",
      "enabled": true,
      "occupied": true,
      "occupied_by_doctor_id": "65f0c1...",
      "occupied_by_doctor_name": "Dra. Ana Pérez",
      "occupied_by_status": "available",
      "can_disable": false,
      "created_at": "2026-04-06T10:00:00.000Z",
      "updated_at": "2026-04-06T10:00:00.000Z"
    },
    {
      "number": "2",
      "enabled": false,
      "occupied": false,
      "occupied_by_doctor_id": null,
      "occupied_by_doctor_name": null,
      "occupied_by_status": null,
      "can_disable": false,
      "created_at": "2026-04-06T10:00:00.000Z",
      "updated_at": "2026-04-06T11:15:00.000Z"
    }
  ]
  ```
- **Response 401**: token ausente o inválido
- **Response 403**: rol no autorizado

#### PATCH /offices/capacity

- **Descripción**: Ajusta la capacidad objetivo de consultorios creando los números faltantes hasta alcanzar el objetivo.
- **Auth requerida**: sí, `admin`
- **Request Body**:
  ```json
  { "target_total": 8 }
  ```
- **Comportamiento**:
  - Si `target_total` es mayor que el máximo `number` existente, crea los consultorios faltantes en secuencia.
  - Si `target_total` es igual al máximo `number` existente, responde 200 sin cambios.
  - Si `target_total` es menor que el máximo `number` existente, rechaza la operación y obliga a reducir capacidad vía deshabilitación.
- **Response 200**:
  ```json
  {
    "target_total": 8,
    "created_offices": ["6", "7", "8"],
    "unchanged": false
  }
  ```
- **Response 400**: `target_total` inválido o intento de reducción por debajo del máximo actual
- **Response 401**: token ausente o inválido
- **Response 403**: rol no autorizado

#### PATCH /offices/{number}

- **Descripción**: Habilita o deshabilita un consultorio existente.
- **Auth requerida**: sí, `admin`
- **Request Body**:
  ```json
  { "enabled": false }
  ```
- **Response 200**:
  ```json
  {
    "number": "4",
    "enabled": false,
    "occupied": false,
    "can_disable": false,
    "updated_at": "2026-04-06T12:00:00.000Z"
  }
  ```
- **Response 404**: consultorio no encontrado
- **Response 409**: consultorio ocupado, no puede deshabilitarse

#### GET /doctors/available-offices

- **Descripción**: Endpoint existente. Continúa devolviendo consultorios elegibles para check-in, pero ahora calculados desde el catálogo `Office.enabled=true` y ocupación real.
- **Auth requerida**: sí, `admin` o `doctor`
- **Response 200**:
  ```json
  {
    "availableOffices": ["1", "3", "6"]
  }
  ```
- **Response 401**: token ausente o inválido
- **Notas**:
  - Solo incluye consultorios habilitados.
  - Excluye consultorios ocupados por doctores con `status in ["available", "busy"]`.
  - Debe ordenar el resultado por número ascendente.

#### PATCH /doctors/{id}/check-in

- **Descripción**: Endpoint existente. Conserva contrato, pero valida el `office` elegido contra el catálogo `Office` habilitado.
- **Auth requerida**: sí, `admin` o `doctor` con `DoctorContextGuard`
- **Request Body**:
  ```json
  { "office": "6" }
  ```
- **Response 200**:
  ```json
  {
    "id": "65f0c1...",
    "name": "Dr. Juan López",
    "status": "available",
    "office": "6",
    "message": "Médico registrado como disponible"
  }
  ```
- **Response 400**: consultorio inexistente o valor inválido
- **Response 404**: médico no encontrado
- **Response 409**: consultorio ocupado o deshabilitado al momento de confirmar

> **Fuera de alcance en esta spec:** `DELETE /offices`. La reducción operativa de capacidad se resuelve con `enabled=false` para preservar trazabilidad e historial.

### Impacto en Doctor y en el Flujo de Check-in

1. `Doctor.office` sigue siendo el dato operativo que identifica en qué consultorio trabaja el doctor en una sesión activa, pero deja de validarse con `VALID_DOCTOR_OFFICES`.
2. El `check-in` del doctor mantiene su experiencia funcional actual: seleccionar consultorio, pasar a `available` y quedar elegible para asignación de pacientes.
3. `check-out` no cambia de contrato: el doctor vuelve a `offline` y `office` queda en `null`.
4. La lista de consultorios disponibles deja de ser un cálculo basado en una constante fija y pasa a resolverse desde el catálogo `Office` habilitado.
5. Si el admin deshabilita un consultorio libre, ese número desaparece del selector de check-in sin afectar históricos previos.
6. Si la elegibilidad del consultorio cambia entre la carga del selector y el submit, el backend debe rechazar el `check-in` y forzar refresco del listado.
7. El consumer debe seguir considerando únicamente doctores con `status=available` y `office!=null`, pero ahora debe asumir que el catálogo `Office` es la referencia canónica para decidir si ese `office` sigue siendo válido.

### Diseño Frontend

#### Componentes nuevos

| Componente           | Archivo                                                        | Props principales                                                      | Descripción                                                                               |
| -------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `OfficeManager`      | `components/OfficeManager/OfficeManager.tsx`                   | `items, loading, error, targetTotal, onApplyCapacity, onToggleEnabled` | Gestión inline del catálogo de consultorios para admin                                    |
| `OfficeCapacityForm` | `components/OfficeManager/OfficeCapacityForm.tsx` _(opcional)_ | `currentMax, onSubmit`                                                 | Entrada explícita para capacidad objetivo con validación de reducción vía deshabilitación |

#### Páginas modificadas

| Página                | Archivo                         | Ruta                | Cambio                                                                                          |
| --------------------- | ------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| `AdminProfilesPage`   | `app/admin/profiles/page.tsx`   | `/admin/profiles`   | Agrega sección o toggle para gestión de consultorios, siguiendo el patrón de `SpecialtyManager` |
| `DoctorDashboardPage` | `app/doctor/dashboard/page.tsx` | `/doctor/dashboard` | Mantiene el selector actual, pero solo muestra consultorios habilitados y libres                |

#### Hooks y State

| Hook                  | Archivo                        | Retorna                                                            | Descripción                                                                     |
| --------------------- | ------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `useOfficeCatalog`    | `hooks/useOfficeCatalog.ts`    | `{ items, loading, error, applyCapacity, toggleEnabled, refetch }` | Estado CRUD acotado del catálogo `Office`                                       |
| `useAvailableOffices` | `hooks/useAvailableOffices.ts` | sin cambio de contrato público                                     | Se alimenta del endpoint existente ya recalculado por catálogo                  |
| `useDoctorDashboard`  | `hooks/useDoctorDashboard.ts`  | sin cambio de contrato público                                     | Debe manejar conflicto por consultorio deshabilitado u ocupado durante check-in |

#### Services (llamadas API)

| Función                                    | Archivo                     | Endpoint                         |
| ------------------------------------------ | --------------------------- | -------------------------------- |
| `getOffices(token)`                        | `services/officeService.ts` | `GET /offices`                   |
| `applyOfficeCapacity(data, token)`         | `services/officeService.ts` | `PATCH /offices/capacity`        |
| `updateOfficeEnabled(number, data, token)` | `services/officeService.ts` | `PATCH /offices/{number}`        |
| `getAvailableOffices(token)`               | `services/doctorService.ts` | `GET /doctors/available-offices` |
| `checkInDoctor(id, token, office)`         | `services/doctorService.ts` | `PATCH /doctors/{id}/check-in`   |

#### Diseño UX esperado

- La gestión de consultorios no requiere ruta nueva; puede convivir en `/admin/profiles` como bloque expandible junto al catálogo de especialidades.
- La UI admin debe mostrar al menos: total existente, habilitados, deshabilitados, ocupados y libres.
- La UI admin debe explicar explícitamente que reducir capacidad no borra consultorios: se realiza deshabilitando.
- La UI doctor no debe mostrar consultorios deshabilitados ni ocupados; si no hay ninguno, mantiene el mensaje actual de ausencia de disponibilidad.

### Arquitectura y Dependencias

- **Producer**:
  - Nuevo `OfficeModule` con controller, service, repository y schema propios.
  - `DoctorServiceImpl` pasa a depender del catálogo `Office` para validar check-in y calcular disponibles.
  - `CheckInDto` deja de usar `IsIn(VALID_DOCTOR_OFFICES)` como fuente de verdad y migra a validación dinámica en capa de servicio/use-case.
  - `AppModule` registra `OfficeModule`.
- **Consumer**:
  - Introduce read-model de `Office` sobre la colección compartida `offices`.
  - Ajusta la resolución de doctores elegibles para que un doctor con `office` ausente/deshabilitado en catálogo no sea candidato de asignación.
  - Se considera deuda técnica cerrar cualquier referencia remanente a `CONSULTORIOS_TOTAL` o a supuestos `1..5` en configuración, fixtures y documentación.
- **Auditoría**:
  - Si SPEC-011 está activo, los cambios administrativos sobre consultorios deben auditarse con acciones explícitas como `OFFICE_CAPACITY_UPDATED`, `OFFICE_ENABLED` y `OFFICE_DISABLED`.
- **Paquetes nuevos**: ninguno obligatorio. Se reutiliza NestJS + Mongoose + guards/interceptors ya presentes.

### Compatibilidad Histórica y Migración

1. Primera adopción del feature: crear semilla inicial `1..5` habilitados para no alterar el comportamiento actual de SPEC-015.
2. No se requiere backfill masivo de `Doctor.office` ni `Appointment.office`; ambos campos ya almacenan el número del consultorio como string.
3. Los turnos históricos mantienen su `office` original aunque ese consultorio sea deshabilitado después.
4. Los doctores offline siguen teniendo `office = null`; eso no cambia.
5. Si existieran datos históricos con números fuera del catálogo, seguirán siendo visibles como historial, pero no podrán usarse para nuevos check-in hasta que el catálogo los cree y habilite explícitamente.

### Notas de Implementación

- El modelo deja de ser “rango fijo válido” y pasa a ser “catálogo persistido habilitado”. Ese es el cambio raíz que debe reflejarse en validación, listados y asignación operativa.
- Se debe evitar una solución híbrida donde la UI admin maneje el catálogo pero el backend siga validando con `1..5` o el consumer siga asumiendo un conjunto fijo.
- El número del consultorio se conserva como identidad funcional visible. No se deben exponer IDs técnicos al usuario para operaciones habituales del catálogo.
- La ampliación de capacidad debe ser idempotente respecto al mismo `target_total`.
- La ocupación debe seguir derivándose desde `Doctor`, no duplicarse en `Office`, para no introducir fuentes de verdad divergentes.

---

## 3. LISTA DE TAREAS

> Checklist accionable para backend, frontend, tests y QA. Marcar cada ítem (`[x]`) al completarlo.

### Backend

#### Producer — Implementación

- [ ] Crear schema `Office`, DTOs y colección `offices` en `backend/producer/src/schemas/` y `backend/producer/src/dto/`
- [ ] Implementar `OfficeRepository` + `MongooseOfficeRepository`
- [ ] Implementar `OfficeService` con operaciones: listar catálogo, aplicar `target_total`, habilitar/deshabilitar por `number`
- [ ] Implementar `OfficeController` con endpoints `GET /offices`, `PATCH /offices/capacity` y `PATCH /offices/:number`
- [ ] Registrar `OfficeModule` en `backend/producer/src/app.module.ts`
- [ ] Agregar bootstrap/seed inicial para crear consultorios `1..5` habilitados cuando la colección esté vacía
- [ ] Refactorizar `DoctorServiceImpl` para validar check-in contra `Office.enabled=true`
- [ ] Refactorizar cálculo de `GET /doctors/available-offices` para usar catálogo habilitado menos consultorios ocupados
- [ ] Eliminar dependencia funcional de `VALID_DOCTOR_OFFICES` y de cualquier validación rígida `1..5`
- [ ] Auditar operaciones administrativas de consultorios si SPEC-011 está activo

#### Consumer — Implementación

- [ ] Registrar schema/read-model `Office` en `backend/consumer/src/schemas/`
- [ ] Ajustar `DoctorRepository.findAvailable()` o el caso de uso de asignación para excluir oficinas ausentes/deshabilitadas del catálogo
- [ ] Validar que la asignación de turnos siga usando solo doctores `available` con `office != null`
- [ ] Retirar supuestos remanentes de `CONSULTORIOS_TOTAL` o de numeración fija en runtime/config/documentación del consumer

#### Tests Backend

- [ ] `test_office_service_list_returns_catalog_with_operational_flags`
- [ ] `test_office_service_disable_free_office_success`
- [ ] `test_office_service_disable_occupied_office_conflict`
- [ ] `test_office_service_apply_capacity_creates_missing_sequential_offices`
- [ ] `test_office_service_apply_capacity_same_target_is_noop`
- [ ] `test_office_service_apply_capacity_lower_than_max_raises_bad_request`
- [ ] `test_doctor_service_check_in_rejects_disabled_office`
- [ ] `test_doctor_service_get_available_offices_excludes_disabled_and_occupied`
- [ ] `test_doctor_controller_patch_office_returns_409_when_occupied`
- [ ] `test_consumer_doctor_repository_find_available_ignores_disabled_offices`
- [ ] Agregar pruebas e2e producer para flujo admin de catálogo y regresión de `GET /doctors/available-offices`

### Frontend

#### Implementación

- [ ] Crear `officeService.ts` con `getOffices`, `applyOfficeCapacity` y `updateOfficeEnabled`
- [ ] Crear `useOfficeCatalog.ts` para estado del catálogo de consultorios
- [ ] Crear `OfficeManager` reutilizando el patrón visual/operativo de `SpecialtyManager`
- [ ] Integrar `OfficeManager` en `/admin/profiles` con toggle o bloque dedicado
- [ ] Mostrar resumen operativo: total, habilitados, deshabilitados, ocupados y libres
- [ ] Implementar control de capacidad objetivo con validación UI que explique la regla “reducir = deshabilitar”
- [ ] Mantener `DoctorDashboardPage` y `OfficeSelector` con el mismo contrato, pero alimentados por el catálogo habilitado y libre
- [ ] Refrescar lista de consultorios elegibles cuando un check-in falle por conflicto de ocupación o deshabilitación

#### Tests Frontend

- [ ] `OfficeManager renders catalog rows with enabled and occupied status`
- [ ] `OfficeManager disables toggle when office is occupied`
- [ ] `OfficeManager applies target capacity and renders created offices after refetch`
- [ ] `OfficeManager shows validation message when target capacity is below current max`
- [ ] `DoctorDashboard shows no offices message when there are no enabled free offices`
- [ ] `DoctorDashboard refreshes available offices after check-in conflict`

### QA

- [ ] Ejecutar skill `/gherkin-case-generator` para HU-01, HU-02 y HU-03
- [ ] Ejecutar skill `/risk-identifier` con foco en concurrencia admin/doctor y compatibilidad histórica
- [ ] Validar migración inicial del catálogo `1..5` sin regresión sobre SPEC-015
- [ ] Verificar que un consultorio ocupado no pueda deshabilitarse bajo ninguna condición
- [ ] Verificar que un consultorio deshabilitado no aparezca en check-in ni sea asignable en operación
- [ ] Validar que los turnos históricos con `office` previo sigan visibles e inmutables
- [ ] Confirmar cobertura de regresión sobre `/doctor/dashboard`, `/admin/profiles` y el motor de asignación
- [ ] Actualizar estado de la spec cuando la implementación y validación estén cerradas
