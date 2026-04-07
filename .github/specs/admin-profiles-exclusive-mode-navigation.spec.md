---
id: SPEC-017
status: IMPLEMENTED
feature: admin-profiles-exclusive-mode-navigation
created: 2026-04-06
updated: 2026-04-06
author: spec-generator
version: "1.0"
related-specs: [SPEC-004, SPEC-014, SPEC-015, SPEC-016]
---

# Spec: Navegación exclusiva de modos en perfiles admin

> **Estado:** `IMPLEMENTED`.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Refinar la UX de `/admin/profiles` para que deje de operar como una pantalla multipanel y pase a ser un selector de modo exclusivo entre gestión de perfiles, especialidades y consultorios. El objetivo es reducir ruido visual y errores operativos sin perder ninguna capacidad ya implementada en las specs previas.

### Requerimiento de Negocio

Fuente: aprobado por el usuario en conversación directa. No existe todavía un archivo dedicado en `.github/requirements/` para este feature.

- Rediseño visual/funcional de la pantalla de perfiles.
- Solo debe haber una tabla o acción principal visible por vez.
- Si el usuario selecciona "Gestionar consultorios", deben desaparecer las demás opciones y quedar solo esa vista.
- Si entra a gestión de perfiles, debe mostrarse solo la tabla y acciones de perfiles.
- La página debe pasar de multipanel a selector de modo exclusivo.
- Cambiar el nombre del botón "+ Nuevo perfil" por "Gestión de perfiles".
- Debe preservarse la funcionalidad existente, pero con navegación de vistas exclusivas entre perfiles, especialidades y consultorios.
- Decisiones fijadas por esta spec:
  - La vista por defecto al entrar a `/admin/profiles` será `Gestión de perfiles`.
  - El cambio es frontend-first y no requiere endpoints nuevos en esta iteración.
  - La solución debe mantener compatibilidad funcional con SPEC-015 y SPEC-016.

### Historias de Usuario

#### HU-01: Selector exclusivo de modo para la gestión administrativa

```
Como:        Administrador
Quiero:      Elegir un modo de trabajo exclusivo dentro de /admin/profiles
Para:        Ver solo la tabla y acciones relevantes del contexto actual sin distracciones de otras gestiones

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-004, SPEC-015, SPEC-016
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: La vista por defecto es Gestión de perfiles
  Dado que:  el Administrador autenticado entra a /admin/profiles
  Cuando:    la página termina de cargar
  Entonces:  la UI muestra solo la tabla y acciones de perfiles
  Y:         la opción "Gestión de perfiles" aparece como modo activo
  Y:         no se muestran al mismo tiempo la gestión de especialidades ni la gestión de consultorios
```

```gherkin
CRITERIO-1.2: El Administrador cambia a gestión de consultorios
  Dado que:  el Administrador está viendo /admin/profiles
  Cuando:    selecciona "Gestionar consultorios"
  Entonces:  la UI muestra solo la vista de consultorios
  Y:         oculta la tabla de perfiles, el formulario contextual de perfiles y la gestión de especialidades
  Y:         mantiene visible el selector de modo para poder cambiar de vista nuevamente
```

```gherkin
CRITERIO-1.3: El Administrador cambia a gestión de especialidades
  Dado que:  el Administrador está viendo /admin/profiles
  Cuando:    selecciona "Gestionar especialidades"
  Entonces:  la UI muestra solo la vista de especialidades
  Y:         oculta la tabla de perfiles, sus acciones contextuales y la gestión de consultorios
  Y:         resalta "Gestionar especialidades" como modo activo
```

**Error Path**

```gherkin
CRITERIO-1.4: Error de carga acotado a la vista activa
  Dado que:  el selector de modo está disponible
  Y:         la carga de una vista activa falla, por ejemplo la gestión de consultorios
  Cuando:    la UI muestra el error de esa vista
  Entonces:  el error se presenta solo dentro del modo activo
  Y:         el selector de modo sigue operativo para volver a perfiles o especialidades
  Y:         no se muestran tablas ni acciones de otras vistas junto con el error
```

**Edge Case**

```gherkin
CRITERIO-1.5: Reingresar al modo perfiles restaura el contexto principal
  Dado que:  el Administrador navegó previamente a especialidades o consultorios
  Cuando:    selecciona "Gestión de perfiles"
  Entonces:  la UI vuelve a mostrar solo la tabla y acciones de perfiles
  Y:         mantiene las capacidades ya existentes de crear, editar y refrescar perfiles
```

#### HU-02: Acciones contextuales preservando la funcionalidad existente

```
Como:        Administrador
Quiero:      Seguir gestionando perfiles, especialidades y consultorios sin perder capacidades existentes
Para:        Aprovechar el rediseño sin regresiones funcionales respecto de SPEC-015 y SPEC-016

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01, SPEC-014, SPEC-015, SPEC-016
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

**Happy Path**

```gherkin
CRITERIO-2.1: El botón principal de perfiles pasa a ser selector de modo
  Dado que:  la pantalla admin de perfiles fue rediseñada
  Cuando:    el Administrador observa las acciones principales del encabezado
  Entonces:  el botón que antes decía "+ Nuevo perfil" ahora se muestra como "Gestión de perfiles"
  Y:         ese control funciona como selector del modo perfiles
  Y:         la creación de un nuevo Perfil sigue disponible dentro del contexto exclusivo de perfiles
```

```gherkin
CRITERIO-2.2: Crear un perfil sigue siendo posible dentro del modo perfiles
  Dado que:  el modo activo es "Gestión de perfiles"
  Cuando:    el Administrador inicia la creación de un nuevo Perfil
  Entonces:  la UI abre el flujo existente de alta de Perfil
  Y:         la creación mantiene compatibilidad con el modal y validaciones actuales
  Y:         la acción de creación no se muestra en modos de especialidades ni consultorios
```

```gherkin
CRITERIO-2.3: Las gestiones de especialidades y consultorios mantienen sus acciones existentes
  Dado que:  el Administrador cambia al modo "Gestionar especialidades" o "Gestionar consultorios"
  Cuando:    la vista activa se renderiza
  Entonces:  la UI conserva el CRUD y las acciones operativas ya definidas por SPEC-015 y SPEC-016
  Y:         esas acciones se muestran solo dentro del modo correspondiente
```

**Error Path**

```gherkin
CRITERIO-2.4: La UI no expone acciones de perfiles fuera del modo perfiles
  Dado que:  el modo activo es "Gestionar consultorios" o "Gestionar especialidades"
  Cuando:    el Administrador interactúa con la pantalla
  Entonces:  la UI no muestra el CTA de crear Perfil ni la tabla de perfiles
  Y:         no mantiene un estado visible mixto entre modos
```

**Edge Case**

```gherkin
CRITERIO-2.5: El cambio de modo elimina estados visuales mixtos
  Dado que:  la vista de perfiles mostraba estados propios como loading, empty state o errores contextuales
  Cuando:    el Administrador cambia a otra vista exclusiva
  Entonces:  la UI renderiza solo el estado correspondiente al modo seleccionado
  Y:         no arrastra barras de acciones, tablas ni mensajes visibles de la vista anterior
```

### Reglas de Negocio

1. `/admin/profiles` debe operar con un único modo activo de UI a la vez: `profiles`, `specialties` u `offices`.
2. El modo por defecto al cargar la página es `profiles`.
3. La exclusividad aplica a tablas, toolbars, empty states, loading, errores y acciones contextuales de cada gestión.
4. El selector de modo permanece visible para permitir navegación entre vistas; la exclusividad aplica al contenido operativo, no a la navegación.
5. El control que hoy abre la creación directa de perfiles y se etiqueta como `+ Nuevo perfil` se repurposa como selector del modo `Gestión de perfiles`.
6. Para preservar la funcionalidad existente, la creación de perfiles se mantiene como acción contextual interna del modo perfiles, con label recomendado `Crear perfil`.
7. No se agregan rutas nuevas, nested routes ni endpoints nuevos en esta iteración.
8. `ProfileFormModal`, `SpecialtyManager` y `OfficeManager` conservan sus contratos funcionales; cambia solo su composición visible dentro de `/admin/profiles`.
9. La autorización admin-only mediante `useRoleGuard(["admin"])` y el consumo de autenticación vía `useAuth()` permanecen sin cambios.
10. La compatibilidad funcional con SPEC-015 y SPEC-016 es obligatoria: especialidades y consultorios siguen disponibles, pero ya no coexisten visualmente en paralelo.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad                 | Almacén                 | Cambios              | Descripción                                                             |
| ----------------------- | ----------------------- | -------------------- | ----------------------------------------------------------------------- |
| `Profile`               | colección `profiles`    | sin cambio de schema | Datos operativos listados y editados en el modo de perfiles             |
| `Specialty`             | colección `specialties` | sin cambio de schema | Catálogo administrado en el modo de especialidades                      |
| `Office`                | colección `offices`     | sin cambio de schema | Catálogo administrado en el modo de consultorios                        |
| `AdminProfilesViewMode` | estado local frontend   | nuevo                | Estado exclusivo de UI con valores `profiles`, `specialties`, `offices` |

#### Campos del modelo

| Campo           | Tipo   | Obligatorio | Validación                               | Descripción                                             |
| --------------- | ------ | ----------- | ---------------------------------------- | ------------------------------------------------------- |
| `mode`          | string | sí          | `profiles` \| `specialties` \| `offices` | Modo activo exclusivo de la pantalla admin              |
| `default_mode`  | string | sí          | valor fijo `profiles` al cargar la ruta  | Convención de arranque de la UI; no se persiste         |
| `Profile.uid`   | string | sí          | contrato existente                       | Identificador del Perfil mostrado y editado en la tabla |
| `Specialty.id`  | string | sí          | contrato existente                       | Identificador del catálogo de especialidades            |
| `Office.number` | string | sí          | contrato existente                       | Número estable del consultorio administrado             |

#### Índices / Constraints

- No se agregan índices ni constraints nuevos en base de datos.
- La unicidad del modo activo se resuelve en frontend usando un único estado fuente de verdad, no con múltiples booleanos independientes.
- Los contratos y constraints existentes de `profiles`, `specialties` y `offices` se reutilizan sin cambios.

### API Endpoints

> Esta spec no introduce endpoints nuevos. Reutiliza contratos existentes para cada modo visible.

#### GET /profiles

- **Descripción**: Lista Perfiles para el modo `Gestión de perfiles`.
- **Auth requerida**: sí, `admin`
- **Cambio en esta spec**: ninguno
- **Response 200**:
  ```json
  [
    {
      "uid": "firebase_uid_123",
      "email": "admin@clinic.local",
      "display_name": "Admin Central",
      "role": "admin",
      "status": "active",
      "doctor_id": null
    }
  ]
  ```
- **Response 401**: token ausente o inválido
- **Response 403**: rol no autorizado

#### POST /profiles

- **Descripción**: Mantiene el alta de Perfil desde el contexto exclusivo de perfiles.
- **Auth requerida**: sí, `admin`
- **Cambio en esta spec**: ninguno
- **Request Body**:
  ```json
  {
    "email": "doctor@clinic.local",
    "password": "SecureP@ss123",
    "display_name": "Dra. Ana Pérez",
    "role": "doctor",
    "specialty_id": "specialty_123"
  }
  ```
- **Response 201**: Perfil creado según contrato vigente
- **Response 400**: payload inválido
- **Response 401**: token ausente o inválido

#### PATCH /profiles/{uid}

- **Descripción**: Mantiene la edición de Perfil desde el modo perfiles.
- **Auth requerida**: sí, `admin`
- **Cambio en esta spec**: ninguno
- **Request Body**: campos editables vigentes del Perfil
- **Response 200**: Perfil actualizado
- **Response 404**: Perfil no encontrado

#### GET /specialties

- **Descripción**: Lista el catálogo de especialidades para el modo `Gestionar especialidades`.
- **Auth requerida**: sí
- **Cambio en esta spec**: ninguno
- **Response 200**:
  ```json
  [
    { "id": "specialty_123", "name": "Cardiología" },
    { "id": "specialty_456", "name": "Pediatría" }
  ]
  ```

#### POST /specialties

- **Descripción**: Crea una nueva especialidad desde la vista exclusiva de especialidades.
- **Auth requerida**: sí, `admin`
- **Cambio en esta spec**: ninguno
- **Request Body**:
  ```json
  { "name": "Neurología" }
  ```
- **Response 201**: especialidad creada
- **Response 409**: especialidad duplicada

#### PATCH /specialties/{id}

- **Descripción**: Actualiza una especialidad existente.
- **Auth requerida**: sí, `admin`
- **Cambio en esta spec**: ninguno
- **Request Body**:
  ```json
  { "name": "Medicina General" }
  ```
- **Response 200**: especialidad actualizada
- **Response 404**: no encontrada

#### DELETE /specialties/{id}

- **Descripción**: Elimina una especialidad según reglas ya vigentes.
- **Auth requerida**: sí, `admin`
- **Cambio en esta spec**: ninguno
- **Response 204**: eliminada
- **Response 400**: especialidad con doctores vinculados

#### GET /offices

- **Descripción**: Lista el catálogo operativo de consultorios para el modo `Gestionar consultorios`.
- **Auth requerida**: sí, `admin`
- **Cambio en esta spec**: ninguno
- **Response 200**:
  ```json
  [
    {
      "number": "1",
      "enabled": true,
      "occupied": false,
      "occupied_by_doctor_id": null,
      "occupied_by_doctor_name": null,
      "occupied_by_status": null,
      "can_disable": true
    }
  ]
  ```

#### PATCH /offices/capacity

- **Descripción**: Ajusta capacidad objetivo del catálogo de consultorios.
- **Auth requerida**: sí, `admin`
- **Cambio en esta spec**: ninguno
- **Request Body**:
  ```json
  { "target_total": 8 }
  ```
- **Response 200**: capacidad aplicada según contrato vigente
- **Response 400**: reducción inválida o payload incorrecto

#### PATCH /offices/{number}

- **Descripción**: Habilita o deshabilita un consultorio existente.
- **Auth requerida**: sí, `admin`
- **Cambio en esta spec**: ninguno
- **Request Body**:
  ```json
  { "enabled": false }
  ```
- **Response 200**: consultorio actualizado
- **Response 409**: consultorio ocupado

### Diseño Frontend

#### Componentes nuevos / modificados

| Componente                  | Archivo                                                                           | Cambio      | Descripción                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `AdminProfilesPage`         | `app/admin/profiles/page.tsx`                                                     | modificado  | Reemplaza el patrón multipanel basado en toggles por un selector de modo exclusivo con una sola vista principal visible |
| `AdminProfilesModeSelector` | `components/AdminProfilesModeSelector/AdminProfilesModeSelector.tsx` _(opcional)_ | nuevo       | Encapsula la navegación entre `Gestión de perfiles`, `Gestionar especialidades` y `Gestionar consultorios`              |
| `ProfileFormModal`          | `components/ProfileFormModal/ProfileFormModal.tsx`                                | reutilizado | Mantiene alta y edición de Perfiles, pero solo se invoca desde el contexto exclusivo de perfiles                        |
| `SpecialtyManager`          | `components/SpecialtyManager/SpecialtyManager.tsx`                                | reutilizado | Se renderiza solo cuando el modo activo es especialidades                                                               |
| `OfficeManager`             | `components/OfficeManager/OfficeManager.tsx`                                      | reutilizado | Se renderiza solo cuando el modo activo es consultorios                                                                 |

#### Páginas nuevas / modificadas

| Página              | Archivo                       | Ruta              | Cambio                                                                            |
| ------------------- | ----------------------------- | ----------------- | --------------------------------------------------------------------------------- |
| `AdminProfilesPage` | `app/admin/profiles/page.tsx` | `/admin/profiles` | Pasa de layout multipanel a navegación exclusiva por modo dentro de la misma ruta |

#### Hooks y State

| Hook / State       | Archivo                       | Retorna                              | Descripción                                               |
| ------------------ | ----------------------------- | ------------------------------------ | --------------------------------------------------------- |
| `activeView`       | `app/admin/profiles/page.tsx` | `profiles \| specialties \| offices` | Fuente única de verdad para decidir qué vista renderizar  |
| `useProfiles`      | `hooks/useProfiles.ts`        | contrato existente                   | Mantiene listado, creación, edición y refresh de Perfiles |
| `useSpecialties`   | `hooks/useSpecialties.ts`     | contrato existente                   | Mantiene CRUD de especialidades sin cambios de API        |
| `useOfficeCatalog` | `hooks/useOfficeCatalog.ts`   | contrato existente                   | Mantiene listado y acciones del catálogo de consultorios  |
| `useRoleGuard`     | `hooks/useRoleGuard.ts`       | contrato existente                   | Conserva la protección admin-only de la ruta              |

#### Services (llamadas API)

| Función                                    | Archivo                        | Endpoint                   |
| ------------------------------------------ | ------------------------------ | -------------------------- |
| `getProfiles(filters, token)`              | `services/profileService.ts`   | `GET /profiles`            |
| `createProfile(data, token)`               | `services/profileService.ts`   | `POST /profiles`           |
| `updateProfile(uid, data, token)`          | `services/profileService.ts`   | `PATCH /profiles/{uid}`    |
| `getSpecialties(token)`                    | `services/specialtyService.ts` | `GET /specialties`         |
| `createSpecialty(data, token)`             | `services/specialtyService.ts` | `POST /specialties`        |
| `updateSpecialty(id, data, token)`         | `services/specialtyService.ts` | `PATCH /specialties/{id}`  |
| `deleteSpecialty(id, token)`               | `services/specialtyService.ts` | `DELETE /specialties/{id}` |
| `getOffices(token)`                        | `services/officeService.ts`    | `GET /offices`             |
| `applyOfficeCapacity(data, token)`         | `services/officeService.ts`    | `PATCH /offices/capacity`  |
| `updateOfficeEnabled(number, data, token)` | `services/officeService.ts`    | `PATCH /offices/{number}`  |

### Arquitectura y Dependencias

- Paquetes nuevos requeridos: ninguno.
- Servicios externos: ninguno nuevo; se reutilizan autenticación Firebase y APIs backend existentes.
- Impacto en punto de entrada de la app: ninguno fuera de `/admin/profiles`.
- No se agregan nuevas rutas; la navegación entre vistas ocurre dentro de la misma página protegida.
- Se mantiene el uso de CSS Modules y los hooks actuales como fuente de verdad de autenticación y datos.

### Notas de Implementación

1. La causa raíz del estado visual mixto actual es el uso de múltiples toggles booleanos independientes (`showSpecialties`, `showOffices`). Esta spec lo reemplaza por un único estado discriminado `activeView`.
2. La exclusividad debe aplicarse a todo el contenido operativo: tablas, toolbars, empty states, loading, errores y CTAs contextuales.
3. El selector de modo debe permanecer visible para permitir cambiar de vista sin recargar ni crear rutas nuevas.
4. Para resolver la ambigüedad del cambio de label, el control actual `+ Nuevo perfil` se convierte en selector `Gestión de perfiles`, mientras la acción real de alta queda dentro del modo perfiles con label recomendado `Crear perfil`.
5. No se persiste el modo seleccionado en URL, query params ni storage en esta iteración; al entrar a la ruta siempre inicia en `profiles`.
6. Las pruebas existentes asociadas al patrón de toggle de SPEC-016 deben actualizarse para validar exclusividad real de vistas, no visibilidad acumulativa.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación

- [ ] Confirmar que el selector exclusivo de modo no requiere endpoints nuevos ni cambios de payload en `profiles`, `specialties` y `offices`
- [ ] Verificar compatibilidad de contratos existentes consumidos por `/admin/profiles` tras el rediseño frontend

#### Tests Backend

- [ ] No aplica lógica nueva de backend; ejecutar smoke de contratos existentes si la implementación frontend detecta desalineaciones

### Frontend

#### Implementación

- [ ] Refactorizar `app/admin/profiles/page.tsx` para usar un único estado de vista activa (`profiles`, `specialties`, `offices`)
- [ ] Reemplazar el patrón multipanel basado en toggles booleanos por renderizado exclusivo de una sola vista principal
- [ ] Renombrar el control `+ Nuevo perfil` a `Gestión de perfiles` y convertirlo en selector del modo perfiles
- [ ] Mantener el selector de modo visible y resaltar el modo activo
- [ ] Mover la acción de alta de Perfil al contexto exclusivo de perfiles con CTA contextual `Crear perfil`
- [ ] Conservar `ProfileFormModal`, `SpecialtyManager` y `OfficeManager` reutilizando sus contratos actuales
- [ ] Aislar loading, empty states, errores y acciones al modo activo
- [ ] Mantener protección admin con `useRoleGuard(["admin"])`

#### Tests Frontend

- [ ] `AdminProfilesPage renders profile mode as default`
- [ ] `AdminProfilesPage switches to office mode and hides profiles and specialties`
- [ ] `AdminProfilesPage switches to specialty mode and hides profiles and offices`
- [ ] `AdminProfilesPage keeps profile creation CTA only inside profile mode`
- [ ] `AdminProfilesPage scopes loading and error states to the active mode`
- [ ] `AdminProfilesPage keeps selector visible while rendering only one management view`

### QA

- [ ] Ejecutar skill `/gherkin-case-generator` sobre HU-01 y HU-02
- [ ] Ejecutar skill `/risk-identifier` enfocando regresiones en `/admin/profiles`
- [ ] Validar compatibilidad funcional con SPEC-015 y SPEC-016
- [ ] Verificar que nunca haya más de una tabla o barra de acciones principal visible a la vez
- [ ] Validar que la creación y edición de perfiles siga disponible solo dentro del modo perfiles
- [ ] Mantener `status: DRAFT` hasta aprobación explícita del usuario
