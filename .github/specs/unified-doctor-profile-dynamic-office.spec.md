---
id: SPEC-015
status: IMPLEMENTED
feature: unified-doctor-profile-dynamic-office
created: 2026-04-06
updated: 2026-04-06
author: spec-generator
version: "1.0"
related-specs: [SPEC-003, SPEC-004, SPEC-008, SPEC-014]
---

# Spec: Creación Unificada de Doctor y Consultorio Dinámico

> **Estado:** `IMPLEMENTED`.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Rediseñar el flujo de creación de médicos para que el admin cree todo desde un solo formulario de perfil (email + contraseña + nombre + especialidad), sin asignar consultorio. El consultorio deja de ser fijo: el doctor lo elige al hacer check-in desde su dashboard, seleccionando entre los consultorios libres en ese momento. Al hacer check-out, el consultorio se libera. Se introduce un catálogo editable de especialidades médicas para estandarizar la selección.

### Requerimiento de Negocio

Fuente: aprobado por el usuario en conversación directa.

1. El formulario de "Nuevo Perfil" con rol doctor debe permitir crear el usuario (email + contraseña), el perfil operativo y la entidad Doctor de forma transparente, sin que el admin conozca IDs internos.
2. La especialidad del doctor se selecciona desde un catálogo editable por el admin.
3. El consultorio NO se asigna al crear el doctor. Se crea sin consultorio.
4. El doctor elige consultorio al hacer check-in desde su dashboard, seleccionando entre los consultorios que estén libres en ese momento.
5. Al hacer check-out, el consultorio se libera y queda disponible para otro doctor.
6. Un doctor puede elegir un consultorio diferente cada vez que hace check-in.
7. El admin puede activar o desactivar perfiles doctor desde la pantalla de perfiles.

### Historias de Usuario

#### HU-01: Creación unificada de perfil doctor con especialidad

```
Como:        Administrador
Quiero:      Crear un perfil doctor ingresando email, contraseña, nombre y especialidad desde un catálogo
Para:        Registrar médicos sin conocer IDs técnicos ni asignar consultorio por anticipado

Prioridad:   Alta
Estimación:  L
Dependencias: Catálogo de especialidades (HU-03)
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Admin crea perfil doctor con especialidad del catálogo
  Dado que:  el admin está en el modal "Nuevo Perfil" y selecciona rol "doctor"
  Y:         existen especialidades en el catálogo
  Cuando:    ingresa email, contraseña, nombre visible y selecciona una especialidad
  Entonces:  el sistema crea el usuario Firebase, el perfil operativo y la entidad Doctor
  Y:         el Doctor se crea con status "offline" y office null
  Y:         el perfil queda vinculado al Doctor mediante doctor_id
  Y:         no se solicita consultorio en el formulario
```

```gherkin
CRITERIO-1.2: Edición de perfil doctor muestra especialidad actual
  Dado que:  existe un perfil doctor con especialidad "Pediatría"
  Cuando:    el admin abre el modal de edición
  Entonces:  la especialidad aparece preseleccionada en el selector
  Y:         el admin puede cambiarla por otra del catálogo
```

**Error Path**

```gherkin
CRITERIO-1.3: Error al crear perfil doctor sin especialidad
  Dado que:  el admin seleccionó rol "doctor" en el formulario
  Cuando:    intenta guardar sin seleccionar especialidad
  Entonces:  la UI bloquea el envío y muestra "Debe seleccionar una especialidad"
```

```gherkin
CRITERIO-1.4: Error al crear perfil doctor sin especialidades disponibles
  Dado que:  el catálogo de especialidades está vacío
  Cuando:    el admin selecciona rol "doctor"
  Entonces:  la UI muestra "No hay especialidades registradas. Crear una primero."
  Y:         deshabilita el guardado para rol doctor
```

---

#### HU-02: Consultorio dinámico en check-in del doctor

```
Como:        Doctor autenticado
Quiero:      Elegir en qué consultorio libre voy a operar al hacer check-in
Para:        Tener flexibilidad de cambiar de consultorio según disponibilidad diaria

Prioridad:   Alta
Estimación:  L
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**

```gherkin
CRITERIO-2.1: Doctor hace check-in eligiendo consultorio libre
  Dado que:  el doctor está en su dashboard con estado "offline"
  Y:         hay consultorios libres (sin doctor con status available/busy asignado)
  Cuando:    selecciona un consultorio libre y pulsa "Reportar disponibilidad"
  Entonces:  el sistema actualiza Doctor.office al consultorio elegido
  Y:         el sistema cambia Doctor.status a "available"
  Y:         el doctor ve su estado actualizado con el consultorio seleccionado
```

```gherkin
CRITERIO-2.2: Doctor hace check-out y el consultorio se libera
  Dado que:  el doctor tiene status "available" en el consultorio 3
  Y:         no tiene paciente asignado
  Cuando:    pulsa "Salir de consultorio"
  Entonces:  el sistema cambia Doctor.status a "offline"
  Y:         el sistema pone Doctor.office a null
  Y:         el consultorio 3 queda disponible para otros doctores
```

```gherkin
CRITERIO-2.3: Doctor elige consultorio diferente en segundo check-in
  Dado que:  el doctor hizo check-out del consultorio 3
  Y:         los consultorios 1 y 4 están libres
  Cuando:    hace check-in seleccionando el consultorio 1
  Entonces:  el sistema asigna office "1" al doctor
  Y:         el doctor opera desde el consultorio 1
```

**Error Path**

```gherkin
CRITERIO-2.4: No hay consultorios libres al hacer check-in
  Dado que:  todos los consultorios tienen un doctor con status available o busy
  Cuando:    el doctor intenta hacer check-in
  Entonces:  la UI muestra "No hay consultorios disponibles en este momento"
  Y:         deshabilita el botón de check-in
```

```gherkin
CRITERIO-2.5: Consultorio elegido fue ocupado por otro doctor (race condition)
  Dado que:  el doctor seleccionó el consultorio 2 que estaba libre
  Y:         otro doctor se hizo check-in en el consultorio 2 milisegundos antes
  Cuando:    el primer doctor envía su check-in
  Entonces:  el backend rechaza con 409 "El consultorio ya está ocupado"
  Y:         la UI muestra el error y refresca la lista de consultorios libres
```

---

#### HU-03: Catálogo editable de especialidades médicas

```
Como:        Administrador
Quiero:      Gestionar un catálogo de especialidades (CRUD) desde la UI
Para:        Estandarizar las opciones de especialidad y poder agregar nuevas sin tocar código

Prioridad:   Media
Estimación:  M
Dependencias: Ninguna
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**

```gherkin
CRITERIO-3.1: Admin crea una nueva especialidad
  Dado que:  el admin está en la sección de gestión de especialidades
  Cuando:    ingresa "Cardiología" y pulsa guardar
  Entonces:  la especialidad se persiste en el catálogo
  Y:         aparece en la lista y en los selectores de especialidad del formulario de perfiles
```

```gherkin
CRITERIO-3.2: Admin edita una especialidad existente
  Dado que:  existe "Medicina Gral" en el catálogo
  Cuando:    el admin la edita a "Medicina General"
  Entonces:  el nombre se actualiza en el catálogo
  Y:         los doctores que tenían esa especialidad siguen vinculados (por ID, no por nombre)
```

```gherkin
CRITERIO-3.3: Admin elimina una especialidad sin doctores vinculados
  Dado que:  "Odontología" no tiene doctores asociados
  Cuando:    el admin la elimina
  Entonces:  desaparece del catálogo y de los selectores
```

**Error Path**

```gherkin
CRITERIO-3.4: Admin intenta eliminar especialidad con doctores vinculados
  Dado que:  "Pediatría" tiene 2 doctores asignados
  Cuando:    el admin intenta eliminarla
  Entonces:  el sistema rechaza con "No se puede eliminar: hay doctores vinculados"
```

```gherkin
CRITERIO-3.5: Admin intenta crear especialidad duplicada
  Dado que:  "Pediatría" ya existe
  Cuando:    intenta crear otra con el mismo nombre
  Entonces:  el sistema rechaza con 409 "La especialidad ya existe"
```

### Reglas de Negocio

1. Al crear un perfil con rol `doctor`, el sistema crea transparentemente la entidad Doctor + Firebase user + Profile, vinculándolos automáticamente.
2. El Doctor se crea con `status: "offline"` y `office: null`. No tiene consultorio fijo.
3. `office` en Doctor es ahora nullable. Se asigna dinámicamente durante check-in y se libera (null) durante check-out.
4. Un consultorio solo puede estar ocupado por un doctor a la vez (`available` o `busy`). Check-in debe validar unicidad atómica.
5. La especialidad del doctor se almacena como referencia al catálogo (por ID). El catálogo es CRUD admin-only.
6. El catálogo de especialidades tiene unicidad por nombre (case-insensitive).
7. No se puede eliminar una especialidad que tenga doctores vinculados.
8. Los consultorios válidos siguen siendo "1" a "5" (constante `VALID_DOCTOR_OFFICES`).
9. El consumer (motor de asignación) debe considerar que `office` puede ser null para doctores offline; solo doctores con `status: available` y `office != null` son candidatos para asignación.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad     | Almacén                 | Cambios              | Descripción                                                                       |
| ----------- | ----------------------- | -------------------- | --------------------------------------------------------------------------------- |
| `Doctor`    | colección `doctors`     | modificada           | `office` pasa a ser nullable, se agrega `specialtyId` como referencia al catálogo |
| `Specialty` | colección `specialties` | **nueva**            | Catálogo editable de especialidades médicas                                       |
| `Profile`   | colección `profiles`    | sin cambio de schema | Se reutiliza `doctor_id` para la vinculación transparente                         |

#### Campos — Doctor (cambios)

| Campo         | Tipo           | Obligatorio       | Antes                      | Después                                           | Descripción                                   |
| ------------- | -------------- | ----------------- | -------------------------- | ------------------------------------------------- | --------------------------------------------- |
| `office`      | string \| null | **no** (antes sí) | required, unique, enum 1-5 | nullable, sin unique constraint                   | Se asigna en check-in, se libera en check-out |
| `specialty`   | string         | sí                | texto libre                | texto libre (se mantiene por retrocompatibilidad) | Nombre de la especialidad del doctor          |
| `specialtyId` | string \| null | no                | no existía                 | referencia opcional a `Specialty._id`             | Vinculación con catálogo para nuevos doctores |

> **Nota de migración**: `specialty` (string) se mantiene para retrocompatibilidad con doctores existentes. Los nuevos doctores tendrán tanto `specialty` (nombre resuelto) como `specialtyId` (referencia). No es breaking change.

#### Campos — Specialty (nueva)

| Campo        | Tipo           | Obligatorio | Validación                               | Descripción                        |
| ------------ | -------------- | ----------- | ---------------------------------------- | ---------------------------------- |
| `_id`        | ObjectId       | sí          | auto-generado                            | Identificador único                |
| `name`       | string         | sí          | max 100 chars, unique (case-insensitive) | Nombre canónico de la especialidad |
| `created_at` | datetime (UTC) | sí          | auto-generado                            | Timestamp creación                 |
| `updated_at` | datetime (UTC) | sí          | auto-generado                            | Timestamp actualización            |

#### Índices / Constraints

- **Doctor**: eliminar unique constraint de `office`. Agregar índice sparse `{ office: 1 }` para buscar consultorios ocupados.
- **Specialty**: unique index sobre `name` (collation case-insensitive).

### API Endpoints

#### POST /specialties (nuevo)

- **Descripción**: Crea una nueva especialidad en el catálogo
- **Auth requerida**: sí, admin
- **Request Body**:
  ```json
  { "name": "Cardiología" }
  ```
- **Response 201**:
  ```json
  {
    "id": "abc123",
    "name": "Cardiología",
    "created_at": "...",
    "updated_at": "..."
  }
  ```
- **Response 409**: ya existe una especialidad con ese nombre

#### GET /specialties (nuevo)

- **Descripción**: Lista todas las especialidades del catálogo
- **Auth requerida**: sí (cualquier rol autenticado, para poblar selectores)
- **Response 200**:
  ```json
  [
    { "id": "abc123", "name": "Cardiología" },
    { "id": "def456", "name": "Pediatría" }
  ]
  ```

#### PATCH /specialties/:id (nuevo)

- **Descripción**: Actualiza el nombre de una especialidad
- **Auth requerida**: sí, admin
- **Request Body**:
  ```json
  { "name": "Medicina General" }
  ```
- **Response 200**: especialidad actualizada
- **Response 404**: no encontrada
- **Response 409**: nombre duplicado

#### DELETE /specialties/:id (nuevo)

- **Descripción**: Elimina una especialidad del catálogo
- **Auth requerida**: sí, admin
- **Response 204**: eliminada
- **Response 400**: tiene doctores vinculados
- **Response 404**: no encontrada

#### PATCH /doctors/:id/check-in (modificado)

- **Descripción**: Check-in del doctor **con selección de consultorio**
- **Auth requerida**: sí, doctor o admin
- **Request Body** (nuevo):
  ```json
  { "office": "3" }
  ```
- **Response 200**: doctor con status `available` y `office` asignado
- **Response 400**: consultorio no válido (fuera de rango 1-5)
- **Response 409**: consultorio ya ocupado por otro doctor

#### PATCH /doctors/:id/check-out (modificado)

- **Descripción**: Check-out del doctor, libera el consultorio
- **Cambio**: además de poner status `offline`, pone `office: null`
- **Response 200**: doctor con status `offline` y `office: null`

#### GET /doctors/available-offices (nuevo)

- **Descripción**: Devuelve los consultorios actualmente libres (sin doctor `available` o `busy`)
- **Auth requerida**: sí (doctor o admin)
- **Response 200**:
  ```json
  { "availableOffices": ["1", "3", "5"] }
  ```

#### POST /profiles (modificado)

- **Cambio**: cuando `role === "doctor"`, el payload incluye `specialty_id` en vez de `doctor_id`. El controller:
  1. Crea el Firebase user (email + password) → obtiene UID
  2. Resuelve el nombre de la especialidad desde el catálogo
  3. Crea la entidad Doctor (name, specialty, specialtyId, office: null, status: offline)
  4. Crea el Profile (uid, email, display_name, role: doctor, doctor_id: doctor.\_id)
- **Request Body** (doctor):
  ```json
  {
    "email": "doctor@clinica.com",
    "password": "SecureP@ss123",
    "display_name": "Dr. Juan Pérez",
    "role": "doctor",
    "specialty_id": "abc123"
  }
  ```
- **Response 201**: Profile creado con doctor_id vinculado

### Diseño Frontend

#### Componentes nuevos / modificados

| Componente         | Archivo                                            | Cambio     | Descripción                                                                                  |
| ------------------ | -------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `ProfileFormModal` | `components/ProfileFormModal/ProfileFormModal.tsx` | modificado | Reemplaza selector de médico por selector de especialidad del catálogo. No pide consultorio. |
| `OfficeSelector`   | `components/DoctorStatusCard/OfficeSelector.tsx`   | **nuevo**  | Selector de consultorio libre que aparece cuando el doctor va a hacer check-in               |
| `DoctorStatusCard` | `components/DoctorStatusCard/DoctorStatusCard.tsx` | modificado | Muestra consultorio actual o "Sin consultorio asignado". Integra OfficeSelector en check-in. |
| `SpecialtyManager` | `components/SpecialtyManager/SpecialtyManager.tsx` | **nuevo**  | CRUD inline de especialidades (tabla + form) para el admin                                   |

#### Páginas nuevas / modificadas

| Página                | Archivo                         | Ruta                | Cambio                                              |
| --------------------- | ------------------------------- | ------------------- | --------------------------------------------------- |
| `AdminProfilesPage`   | `app/admin/profiles/page.tsx`   | `/admin/profiles`   | Agrega sección o link para gestionar especialidades |
| `DoctorDashboardPage` | `app/doctor/dashboard/page.tsx` | `/doctor/dashboard` | Integra selección de consultorio en check-in        |

#### Hooks y State

| Hook                  | Archivo                        | Retorna                                                      | Descripción                               |
| --------------------- | ------------------------------ | ------------------------------------------------------------ | ----------------------------------------- |
| `useSpecialties`      | `hooks/useSpecialties.ts`      | `{ items, loading, error, create, update, remove, refetch }` | CRUD del catálogo de especialidades       |
| `useAvailableOffices` | `hooks/useAvailableOffices.ts` | `{ offices, loading, error, refetch }`                       | Obtiene consultorios libres para check-in |

#### Services (llamadas API)

| Función                            | Archivo                        | Endpoint                                           |
| ---------------------------------- | ------------------------------ | -------------------------------------------------- |
| `getSpecialties(token)`            | `services/specialtyService.ts` | `GET /specialties`                                 |
| `createSpecialty(data, token)`     | `services/specialtyService.ts` | `POST /specialties`                                |
| `updateSpecialty(id, data, token)` | `services/specialtyService.ts` | `PATCH /specialties/:id`                           |
| `deleteSpecialty(id, token)`       | `services/specialtyService.ts` | `DELETE /specialties/:id`                          |
| `getAvailableOffices(token)`       | `services/doctorService.ts`    | `GET /doctors/available-offices`                   |
| `checkInDoctor(id, office, token)` | `services/doctorService.ts`    | `PATCH /doctors/:id/check-in` (body: `{ office }`) |

### Arquitectura y Dependencias

- Paquetes nuevos requeridos: ninguno.
- Nuevo módulo NestJS: `SpecialtiesModule` (schema, repository, service, controller).
- Cambios en `DoctorModule`: check-in acepta body con `office`, check-out resetea `office` a null.
- Cambios en `ProfilesModule`: controller crea Doctor transparentemente cuando rol es doctor.
- Consumer: la lógica de asignación ya busca doctores `available`; debe verificar que `office != null` antes de asignar.

### Notas de Implementación

1. **Migración no destructiva**: `office` pasa de required a opcional. Los doctores existentes que ya tienen consultorio fijo siguen funcionando. No hay migración activa necesaria.
2. **Race condition en check-in**: usar `findOneAndUpdate` con filtro `{ office: selectedOffice, status: { $in: ["available", "busy"] } }` para validar atómicamente que el consultorio no esté ocupado.
3. **Consumer**: el motor de asignación (`AssignAvailableOfficesUseCaseImpl`) busca oficinas libres comparando contra appointments activos. Debe ajustarse para también considerar `doctors.office` de doctores available/busy.
4. **El campo `specialty` (string) se mantiene denormalizado** en Doctor para evitar joins en lecturas frecuentes. Se llena automáticamente al resolver `specialtyId` durante la creación.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación — Catálogo de especialidades

- [ ] Crear schema `Specialty` con name (unique case-insensitive) + timestamps
- [ ] Crear `SpecialtyRepository` (outbound port + Mongoose adapter)
- [ ] Crear `SpecialtyService` (inbound port + use case)
- [ ] Crear `SpecialtyController` — CRUD admin-only + GET para todos los roles auth
- [ ] Crear DTOs: `CreateSpecialtyDto`, `UpdateSpecialtyDto`, `SpecialtyResponseDto`
- [ ] Registrar `SpecialtiesModule` en `AppModule`

#### Implementación — Doctor con office dinámico

- [ ] Modificar Doctor schema: `office` nullable (quitar required + unique constraint)
- [ ] Modificar Consumer Doctor schema: `office` nullable
- [ ] Agregar `specialtyId` (opcional, string) al Doctor schema
- [ ] Modificar `DoctorService.checkIn(id, office)`: aceptar office en parámetro, validar que esté libre
- [ ] Modificar `DoctorService.checkOut(id)`: resetear `office` a null además de status a offline
- [ ] Agregar endpoint `GET /doctors/available-offices`: devuelve consultorios sin doctor available/busy
- [ ] Modificar `DoctorController.checkIn`: leer `office` del body
- [ ] Agregar `DoctorRepository.updateStatusAndOffice(id, status, office)` para operación atómica
- [ ] Agregar `DoctorRepository.findOccupiedOffices()` para resolver oficinas libres

#### Implementación — Creación transparente de Doctor en perfiles

- [ ] Modificar `CreateProfileDto`: agregar `specialty_id` (opcional, requerido si rol es doctor)
- [ ] Modificar `ProfilesController.createProfile`: si rol es doctor, crear Doctor + vincular doctor_id
- [ ] Inyectar `SpecialtyService` y `DoctorService` en `ProfilesController` (o crear un use case compuesto)

#### Tests Backend

- [ ] `test_specialty_create_success` — CRUD happy path
- [ ] `test_specialty_create_duplicate_409` — nombre duplicado
- [ ] `test_specialty_delete_with_doctors_400` — protección referencial
- [ ] `test_doctor_checkin_with_office_success` — check-in con consultorio
- [ ] `test_doctor_checkin_office_occupied_409` — race condition
- [ ] `test_doctor_checkout_clears_office` — check-out limpia office
- [ ] `test_available_offices_returns_free` — endpoint de consultorios libres
- [ ] `test_create_profile_doctor_creates_doctor_transparently` — flujo unificado

### Frontend

#### Implementación

- [ ] Crear `services/specialtyService.ts` — CRUD de especialidades
- [ ] Crear `hooks/useSpecialties.ts` — estado del catálogo
- [ ] Crear `hooks/useAvailableOffices.ts` — consultorios libres
- [ ] Crear `components/SpecialtyManager/SpecialtyManager.tsx` — CRUD inline para admin
- [ ] Crear `components/DoctorStatusCard/OfficeSelector.tsx` — selector de consultorio libre
- [ ] Modificar `ProfileFormModal`: si rol es doctor, mostrar selector de especialidad (no consultorio, no doctor_id)
- [ ] Modificar `DoctorStatusCard`: integrar `OfficeSelector` cuando estado es offline
- [ ] Modificar `useDoctorDashboard`: `checkIn` envía `office` en el body
- [ ] Modificar `doctorService.checkInDoctor`: aceptar y enviar `office`
- [ ] Modificar `DoctorDashboardPage`: pasar selección de consultorio al check-in
- [ ] Agregar sección de gestión de especialidades en admin (nueva ruta o sección en perfiles)

#### Tests Frontend

- [ ] `SpecialtyManager CRUD operations render and work`
- [ ] `OfficeSelector shows only free offices and disables when none`
- [ ] `ProfileFormModal shows specialty selector for doctor role`
- [ ] `DoctorStatusCard integrates office selection on check-in`
- [ ] `useAvailableOffices loads offices with auth`
- [ ] `useSpecialties CRUD operations`

### QA

- [ ] Ejecutar `/gherkin-case-generator` para HU-01, HU-02 y HU-03
- [ ] Ejecutar `/risk-identifier` — validar race condition en check-in, integridad referencial en especialidades
- [ ] Validar flujo E2E: admin crea doctor → doctor hace check-in con consultorio → paciente asignado → check-out libera consultorio
- [ ] Validar CRUD de especialidades con protección referencial
- [ ] Actualizar estado spec: `status: IMPLEMENTED`
