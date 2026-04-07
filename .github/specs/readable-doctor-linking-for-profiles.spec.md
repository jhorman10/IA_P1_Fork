---
id: SPEC-014
status: IMPLEMENTED
feature: readable-doctor-linking-for-profiles
created: 2026-04-06
updated: 2026-04-06
author: spec-generator
version: "1.0"
related-specs: [SPEC-004, SPEC-008]
---

# Spec: Vinculación legible de médicos en perfiles doctor

> **Estado:** `IMPLEMENTED` → refinamiento UX implementado, cubierto con pruebas frontend focalizadas y sin bloqueos QA activos.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Refinar el módulo de perfiles para que la creación y edición de perfiles con rol `doctor` no exponga un campo técnico de entrada libre para `doctor_id`. El administrador debe poder seleccionar un médico existente desde una lista legible con nombre, especialidad y, cuando aporte contexto, consultorio, mientras el sistema continúa persistiendo `doctor_id` internamente.

### Requerimiento de Negocio

Fuente: contexto aprobado por el usuario. No se encontró un archivo dedicado en `.github/requirements/` para este feature.

- En la creación de usuarios con rol doctor, la UI actual pide un campo técnico llamado `Doctor ID`.
- Eso es incorrecto para un administrador: no debe ingresar IDs internos.
- El admin necesita seleccionar un médico existente por información legible.
- La UI debe mostrar nombre del médico y su especialidad; si es útil, también consultorio.
- El valor que se persiste sigue siendo `doctor_id` internamente, pero no debe exponerse como input libre.
- El objetivo es que la creación y vinculación de perfiles doctor sea entendible y consistente con la información del médico.

### Historias de Usuario

#### HU-01: Crear y editar perfiles doctor con selección legible de médico

```
Como:        Administrador
Quiero:      Crear o editar un Perfil con rol doctor seleccionando un médico existente desde una lista legible
Para:        Vincular correctamente el Perfil sin conocer ni digitar IDs internos

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-004, catálogo de médicos existente
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Selección de médico desde lista legible al crear perfil doctor
  Dado que:  el Administrador autenticado abre el modal de creación de Perfil
  Y:         existen médicos registrados en el sistema
  Cuando:    selecciona el rol "doctor"
  Y:         elige una opción legible como "Dr. Juan Pérez · Pediatría · Consultorio 2"
  Entonces:  la UI persiste internamente el `doctor_id` del médico seleccionado
  Y:         no muestra un input libre para ingresar IDs técnicos
  Y:         envía `doctor_id` en el payload de `POST /profiles`
```

```gherkin
CRITERIO-1.2: Edición de perfil doctor mostrando el médico vinculado
  Dado que:  existe un Perfil con rol "doctor" y `doctor_id` previamente vinculado
  Cuando:    el Administrador abre el modal de edición de ese Perfil
  Entonces:  la UI resuelve el médico asociado desde `GET /doctors`
  Y:         muestra preseleccionada la opción legible correspondiente
  Y:         mantiene el valor interno de `doctor_id` mientras no se cambie la selección
```

**Error Path**

```gherkin
CRITERIO-1.3: Validación al intentar guardar un perfil doctor sin seleccionar médico
  Dado que:  el Administrador seleccionó el rol "doctor"
  Y:         la lista de médicos fue cargada correctamente
  Cuando:    intenta guardar el formulario sin elegir un médico
  Entonces:  la UI bloquea el envío
  Y:         muestra un mensaje de validación indicando que debe seleccionar un médico existente
  Y:         no envía `POST /profiles` ni `PATCH /profiles/{uid}`
  Y:         si el request fuera forzado por fuera de la UI, el backend mantiene la validación actual de `doctor_id` obligatorio
```

**Edge Case** _(si aplica)_

```gherkin
CRITERIO-1.4: Estado vacío cuando no hay médicos disponibles
  Dado que:  el Administrador abre el formulario de Perfil
  Y:         no existen médicos registrados o `GET /doctors` devuelve una lista vacía
  Cuando:    selecciona el rol "doctor"
  Entonces:  la UI muestra un estado vacío informando que no hay médicos disponibles para vincular
  Y:         deshabilita o bloquea el guardado del Perfil doctor
  Y:         sugiere crear un médico antes de continuar con la vinculación
```

### Reglas de Negocio

1. `doctor_id` sigue siendo obligatorio para el rol `doctor` tanto en creación como en edición.
2. El Administrador no debe ingresar `doctor_id` manualmente; la UI lo obtiene a partir de la selección de un médico existente.
3. La etiqueta visible de cada opción debe incluir `name` y `specialty`; `office` debe agregarse cuando aporte contexto operativo. Formato recomendado: `Dr. Juan Pérez · Pediatría · Consultorio 2`.
4. Si el rol seleccionado no es `doctor`, el campo de selección de médico no se muestra y la UI mantiene el comportamiento actual de enviar `doctor_id` como `null` o no enviarlo según el contrato vigente.
5. Este refinamiento no debe introducir cambios de base de datos ni alterar el storage actual de `doctor_id` en `profiles`.
6. La fuente de verdad para las opciones del selector es el catálogo existente de médicos expuesto por backend.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad   | Almacén              | Cambios                           | Descripción                                                                           |
| --------- | -------------------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| `Profile` | colección `profiles` | reutilizada, sin cambio de schema | Mantiene `doctor_id` como referencia interna para perfiles con rol `doctor`           |
| `Doctor`  | colección `doctors`  | reutilizada, sin cambio de schema | Provee `id`, `name`, `specialty` y `office` para construir opciones legibles en la UI |

#### Campos del modelo

| Campo               | Tipo           | Obligatorio          | Validación                                                             | Descripción                                               |
| ------------------- | -------------- | -------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| `Profile.role`      | string         | sí                   | `admin` \| `recepcionista` \| `doctor`                                 | Determina si la vinculación con médico es requerida       |
| `Profile.doctor_id` | string \| null | sí para rol `doctor` | Debe corresponder al `id` de un médico existente seleccionado en la UI | Valor persistido internamente en el Perfil                |
| `Doctor.id`         | string         | sí                   | ID expuesto por `GET /doctors`                                         | Valor enviado como `doctor_id` en create/update de Perfil |
| `Doctor.name`       | string         | sí                   | contrato existente                                                     | Parte principal de la etiqueta legible                    |
| `Doctor.specialty`  | string         | sí                   | contrato existente                                                     | Contexto clínico visible para el Administrador            |
| `Doctor.office`     | string         | sí                   | contrato existente                                                     | Contexto operativo opcional en la etiqueta visible        |

#### Índices / Constraints

- No se agregan índices ni constraints nuevos para este refinamiento.
- Se reutilizan los modelos y colecciones actuales; no hay migraciones ni cambios de base de datos.
- La integridad entre `Profile.doctor_id` y `Doctor.id` permanece a nivel de aplicación; este refinamiento no introduce validación referencial en DB.

### API Endpoints

#### GET /doctors

- **Descripción**: Lista médicos existentes para poblar el selector legible del formulario de perfiles.
- **Auth requerida**: sí, mediante Bearer token. Para este flujo se consume desde el contexto admin.
- **Evaluación de suficiencia**: el endpoint existente es suficiente para este feature porque ya expone `id`, `name`, `specialty`, `office` y `status`. No se requiere un endpoint nuevo.
- **Request Query**:
  ```json
  {}
  ```
- **Response 200**:
  ```json
  [
    {
      "id": "67f01abc1234def567890123",
      "name": "Dr. Juan Pérez",
      "specialty": "Pediatría",
      "office": "2",
      "status": "offline"
    }
  ]
  ```
- **Response 401**: token ausente o inválido
- **Response 403**: rol no autorizado

#### POST /profiles

- **Descripción**: Crea un nuevo Perfil operativo reutilizando el contrato actual.
- **Auth requerida**: sí, admin
- **Request Body**:
  ```json
  {
    "email": "doctor@clinic.local",
    "password": "SecureP@ss123",
    "display_name": "Dr. Juan Pérez",
    "role": "doctor",
    "doctor_id": "67f01abc1234def567890123"
  }
  ```
- **Response 201**:
  ```json
  {
    "uid": "firebase_uid_123",
    "email": "doctor@clinic.local",
    "display_name": "Dr. Juan Pérez",
    "role": "doctor",
    "status": "active",
    "doctor_id": "67f01abc1234def567890123"
  }
  ```
- **Response 400**: `doctor_id` faltante o combinación inválida para rol `doctor`
- **Response 401**: token ausente o expirado
- **Response 409**: perfil duplicado por `uid` o `email`

#### PATCH /profiles/{uid}

- **Descripción**: Actualiza un Perfil existente reutilizando el contrato actual.
- **Auth requerida**: sí, admin
- **Request Body**:
  ```json
  {
    "role": "doctor",
    "status": "active",
    "doctor_id": "67f01abc1234def567890123"
  }
  ```
- **Response 200**: Perfil actualizado con el `doctor_id` seleccionado
- **Response 400**: `doctor_id` faltante o combinación inválida
- **Response 404**: Perfil no encontrado

### Diseño Frontend

#### Componentes nuevos

| Componente            | Archivo                                               | Props principales                                    | Descripción                                                                                           |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `DoctorSelectorField` | `components/ProfileFormModal/DoctorSelectorField.tsx` | `options, value, onChange, loading, empty, disabled` | Subcomponente opcional para encapsular el selector legible de médicos dentro del formulario de Perfil |

#### Páginas nuevas

| Página              | Archivo                       | Ruta              | Protegida                                                                                    |
| ------------------- | ----------------------------- | ----------------- | -------------------------------------------------------------------------------------------- |
| `AdminProfilesPage` | `app/admin/profiles/page.tsx` | `/admin/profiles` | sí — se refina la página existente para cargar catálogo de médicos y alimentar el formulario |

#### Hooks y State

| Hook               | Archivo                     | Retorna                                                  | Descripción                                                                                             |
| ------------------ | --------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `useDoctorOptions` | `hooks/useDoctorOptions.ts` | `{ options, doctors, loading, error, isEmpty, refetch }` | Carga médicos con autenticación, transforma `Doctor[]` en opciones legibles y expone estado vacío/error |

#### Services (llamadas API)

| Función                           | Archivo                      | Endpoint                |
| --------------------------------- | ---------------------------- | ----------------------- |
| `getDoctors(idToken, status?)`    | `services/doctorService.ts`  | `GET /doctors`          |
| `createProfile(data, token)`      | `services/profileService.ts` | `POST /profiles`        |
| `updateProfile(uid, data, token)` | `services/profileService.ts` | `PATCH /profiles/{uid}` |

### Arquitectura y Dependencias

- Paquetes nuevos requeridos: ninguno
- Servicios externos: Firebase Auth ya existente para el contexto admin; API backend ya existente para `profiles` y `doctors`
- Impacto en punto de entrada de la app: ninguno; se modifica la carga de datos y el formulario del módulo de perfiles existente

### Notas de Implementación

> Observaciones técnicas, decisiones de diseño o advertencias para los agentes de desarrollo.

- El campo libre `Doctor ID` de `ProfileFormModal` debe ser reemplazado por un selector legible; el valor persistido sigue siendo `doctor_id`.
- Para minimizar complejidad y no agregar dependencias, el baseline recomendado es un `select` autenticado; un autocomplete queda como evolución futura si el volumen de médicos crece.
- `GET /doctors` debe consumirse sin filtro `status` en este flujo, para no ocultar médicos `offline` o `busy` que siguen siendo válidos para vinculación administrativa.
- La edición debe resolver `initialData.doctor_id` contra el catálogo cargado y mostrar la opción correspondiente como valor seleccionado.
- No se requiere cambio de backend para cumplir la UX solicitada. Como hardening opcional futuro, puede evaluarse validar en backend que `doctor_id` exista antes de persistirlo.
- El servicio frontend actual para listar médicos debe alinearse con el contrato protegido del backend y enviar Bearer token.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación

- [x] Confirmar que `GET /doctors`, `POST /profiles` y `PATCH /profiles/{uid}` cubren el flujo sin cambios de contrato
- [x] No introducir endpoints nuevos ni cambios de base de datos para este alcance
- [x] Documentar como hardening opcional, no bloqueante, la validación de existencia de `doctor_id` en backend

#### Tests Backend

- [x] No agregar tests backend mientras no se altere el contrato actual
- [ ] Si se implementa el hardening opcional, cubrir create/update con `doctor_id` inexistente

### Frontend

#### Implementación

- [x] Ajustar `services/doctorService.ts` para que `getDoctors` envíe Bearer token y reutilice el endpoint autenticado existente
- [x] Crear `useDoctorOptions` para cargar y transformar el catálogo de médicos en opciones legibles
- [x] Reemplazar el input libre `Doctor ID` en `ProfileFormModal` por un selector legible con label `nombre · especialidad · consultorio`
- [x] Mostrar loading, error y estado vacío del catálogo de médicos cuando el rol seleccionado sea `doctor`
- [x] Precargar en edición la opción correspondiente al `doctor_id` ya vinculado
- [x] Mantener el payload actual de `createProfile` y `updateProfile`, enviando únicamente el `doctor_id` del médico seleccionado

#### Tests Frontend

- [x] `ProfileFormModal renders readable doctor options when role is doctor`
- [x] `ProfileFormModal blocks submit when no doctor is selected for doctor role`
- [x] `ProfileFormModal preselects linked doctor when editing an existing doctor profile`
- [x] `ProfileFormModal renders empty state when doctors list is empty`
- [x] `useDoctorOptions loads doctors with auth token and maps labels correctly`

### QA

- [x] Ejecutar skill `/gherkin-case-generator` para CRITERIO-1.1, CRITERIO-1.2, CRITERIO-1.3 y CRITERIO-1.4
- [x] Ejecutar skill `/risk-identifier` para clasificar el riesgo del refinamiento en el módulo de perfiles
- [ ] Validar manualmente que la UI ya no expone un input libre de `Doctor ID`
- [ ] Validar que la creación y edición persisten el `doctor_id` correcto sin cambios de base de datos
- [x] Actualizar estado spec: `status: IMPLEMENTED`
