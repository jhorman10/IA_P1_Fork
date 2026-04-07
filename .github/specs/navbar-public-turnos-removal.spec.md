---
id: SPEC-018
status: IMPLEMENTED
feature: authenticated-navigation-and-operational-management-alignment
created: 2026-04-06
updated: 2026-04-06
author: spec-generator
version: "1.0"
related-specs: ["SPEC-004", "SPEC-009", "SPEC-016", "SPEC-017"]
---

# Spec: Ajustes de Navegación Autenticada y Gestión Operativa

> **Estado:** `IMPLEMENTED`.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

La navegación autenticada y la sección `Gestión Operativa` requieren un ajuste fino para reflejar mejor la separación entre lo público y lo operativo. Esta spec define tres refinamientos coordinados: remover `Turnos` del navbar autenticado, renombrar el selector general de `Gestión Operativa` a `Selector de gestión`, y preservar explícitamente la regla operativa vigente donde un consultorio libre sí puede deshabilitarse y un consultorio ocupado no. El alcance se limita a frontend, documentación y regresión funcional sobre contratos ya existentes.

Seguimiento posterior: el item de navegación autenticada que apunta a `/admin/profiles` debe mostrarse como `Gestión Operativa` en lugar de `Perfiles`, manteniendo la misma ruta y restricción de rol `admin`.

### Requerimiento de Negocio

Fuente: requerimiento directo del usuario. No existe archivo en `.github/requirements/` para este cambio.

- "Elimina el selector de 'Turnos' del navbar, al ser publica la seccion, no es necesario tenerla en ninguno de los perfiles"
- "En la seccion de 'Gestión Operativa' tambien debes cambiar el nombre del selector"
- "cuando un consultorio este libre el administrador lo puede deshabilitar, solamente cuando esta ocupado no es posible deshabilitarlo"
- "{ href: \"/admin/profiles\", label: \"Perfiles\", roles: [\"admin\"] }, Debe ser gestion operativa"

### Historias de Usuario

#### HU-01: Ocultar Turnos en el navbar autenticado

```
Como:        Usuario autenticado con Perfil operativo
Quiero:      Que el navbar autenticado no muestre la opción Turnos
Para:        Mantener una navegación consistente con que la pantalla pública de turnos no pertenece a ningún Perfil

Prioridad:   Media
Estimación:  XS
Dependencias: Ninguna
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Turnos no se muestra en el navbar autenticado
  Dado que:  un Usuario autenticado tiene un Perfil `admin`, `recepcionista` o `doctor`
  Cuando:    se renderiza el navbar autenticado
  Entonces:  la opción `Turnos` no aparece como enlace visible en la navegación
```

**Error Path**

```gherkin
CRITERIO-1.2: Dashboard se preserva tras el ajuste del navbar
  Dado que:  un Usuario autenticado con Perfil válido visualiza el navbar
  Cuando:    se aplica la nueva composición visible del menú
  Entonces:  la opción `Dashboard` permanece visible y navegable, sin eliminar los accesos específicos del Perfil
```

**Edge Case** _(si aplica)_

```gherkin
CRITERIO-1.3: El acceso directo a la ruta pública de turnos sigue disponible
  Dado que:  la ruta `/` continúa siendo pública
  Cuando:    un Usuario autenticado o no autenticado navega directamente a `/`
  Entonces:  la pantalla pública de turnos carga sin cambios de autorización ni dependencia del enlace removido del navbar
```

#### HU-02: Renombrar el selector general de Gestión Operativa

```
Como:        Administrador
Quiero:      Que el selector general de Gestión Operativa se identifique como `Selector de gestión`
Para:        Tener una navegación interna más consistente con el propósito operativo de la pantalla

Prioridad:   Media
Estimación:  XS
Dependencias: SPEC-017
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

**Happy Path**

```gherkin
CRITERIO-2.1: El selector general usa el nuevo nombre en Gestión Operativa
  Dado que:  el Administrador autenticado entra a `/admin/profiles`
  Cuando:    se renderiza la navegación interna de la pantalla
  Entonces:  el selector general se identifica como `Selector de gestión`
  Y:         las opciones visibles mantienen la navegación entre perfiles, especialidades y consultorios
```

**Error Path**

```gherkin
CRITERIO-2.2: El rename del selector no altera el comportamiento del modo activo
  Dado que:  existe un modo activo en Gestión Operativa
  Cuando:    se aplica el cambio de nombre del selector
  Entonces:  la navegación exclusiva entre vistas conserva su comportamiento actual
  Y:         no se introducen cambios de rutas, permisos ni mezcla visual entre modos
```

**Edge Case**

```gherkin
CRITERIO-2.3: El rename afecta solo el nombre general del selector
  Dado que:  el selector interno ya expone opciones operativas
  Cuando:    se aplica el ajuste solicitado
  Entonces:  solo cambia el nombre general del selector a `Selector de gestión`
  Y:         las etiquetas de las opciones permanecen sin cambios salvo decisión posterior del usuario
```

#### HU-03: Preservar la regla operativa de deshabilitación de consultorios

```
Como:        Administrador
Quiero:      Poder deshabilitar un consultorio cuando esté libre y no poder hacerlo cuando esté ocupado
Para:        Mantener la capacidad operativa sin romper la ocupación activa de doctores

Prioridad:   Alta
Estimación:  XS
Dependencias: SPEC-016
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**

```gherkin
CRITERIO-3.1: El Administrador puede deshabilitar un consultorio libre
  Dado que:  un consultorio está habilitado y no tiene un doctor activo asignado
  Cuando:    el Administrador ejecuta la acción de deshabilitarlo desde Gestión Operativa
  Entonces:  la operación se permite y el consultorio pasa a estado deshabilitado
```

**Error Path**

```gherkin
CRITERIO-3.2: El Administrador no puede deshabilitar un consultorio ocupado
  Dado que:  un consultorio está ocupado por un doctor con estado operativo activo
  Cuando:    el Administrador intenta deshabilitarlo
  Entonces:  la UI bloquea la acción operativa
  Y:         el backend preserva el rechazo con `409 "No se puede deshabilitar: el consultorio está ocupado"`
```

**Edge Case**

```gherkin
CRITERIO-3.3: La regla de consultorios se preserva sin introducir contratos nuevos
  Dado que:  la gestión de consultorios ya implementa la regla operativa definida en SPEC-016
  Cuando:    se ejecutan los refinamientos de navegación y naming de esta spec
  Entonces:  la regla libre/ocupado sigue vigente sin agregar endpoints ni cambios de autorización
```

### Reglas de Negocio

1. El navbar autenticado no debe mostrar la opción `Turnos` para ningún Perfil operativo (`admin`, `recepcionista`, `doctor`).
2. La opción `Dashboard` del navbar autenticado debe mantenerse visible y funcional como acceso a `/dashboard`.
3. La ruta `/` debe seguir siendo pública; este ajuste no modifica autorización, guards, middleware ni rutas del frontend o backend.
4. El item de navegación autenticada hacia `/admin/profiles` debe mostrarse como `Gestión Operativa` para el rol `admin`.
5. El selector general de `Gestión Operativa` debe renombrarse a `Selector de gestión`.
6. El rename del selector general no modifica las etiquetas de las opciones internas de navegación salvo una decisión posterior explícita.
7. Un consultorio libre puede deshabilitarse; un consultorio ocupado no puede deshabilitarse.
8. La regla de deshabilitación de consultorios ocupados se preserva como contrato vigente de SPEC-016; esta spec no introduce nuevos endpoints ni nuevas reglas backend para ese comportamiento.
9. La documentación operativa debe dejar de listar `Turnos` como opción de navegación para perfiles autenticados y debe reflejar `Gestión Operativa` como nombre visible del acceso admin a `/admin/profiles`.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad     | Almacén | Cambios     | Descripción                                                                                        |
| ----------- | ------- | ----------- | -------------------------------------------------------------------------------------------------- |
| `No aplica` | —       | sin cambios | La spec no introduce ni modifica entidades persistidas, colecciones, tablas ni contratos de datos. |

#### Campos del modelo

| Campo       | Tipo | Obligatorio | Validación | Descripción                                |
| ----------- | ---- | ----------- | ---------- | ------------------------------------------ |
| `No aplica` | —    | —           | —          | No se agregan ni alteran campos de modelo. |

#### Índices / Constraints

- No aplica — sin cambios en persistencia, unicidad o integridad de datos.

### API Endpoints

- No hay cambios en endpoints API para esta spec.
- No se agregan, eliminan ni modifican rutas backend, request/response, headers o códigos HTTP.
- No cambia la autorización backend; los ajustes nuevos son de composición visible y naming en frontend.
- La regla de consultorios libres/ocupados reutiliza el contrato vigente de SPEC-016, incluyendo el rechazo existente al intentar deshabilitar un consultorio ocupado.

### Diseño Frontend

#### Componentes nuevos

| Componente          | Archivo                                                   | Props principales                                           | Descripción                                                                                                                                                  |
| ------------------- | --------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Navbar`            | `frontend/src/components/Navbar/Navbar.tsx`               | ninguna                                                     | Componente existente a ajustar para remover el enlace `Turnos`, preservar `Dashboard` y renombrar a `Gestión Operativa` el acceso admin a `/admin/profiles`. |
| `AdminProfilesPage` | `frontend/src/app/admin/profiles/page.tsx`                | ninguna                                                     | Página existente de `Gestión Operativa` a ajustar para renombrar el nombre general del selector interno a `Selector de gestión`, sin cambiar sus opciones.   |
| `OfficeManager`     | `frontend/src/components/OfficeManager/OfficeManager.tsx` | `items`, `loading`, `error`, `onToggle`, `onExpandCapacity` | Componente existente cuya regla de bloqueo para consultorios ocupados debe preservarse y cubrirse con regresión.                                             |

#### Páginas nuevas

| Página               | Archivo                               | Ruta         | Protegida |
| -------------------- | ------------------------------------- | ------------ | --------- |
| `Pantalla de turnos` | `frontend/src/app/page.tsx`           | `/`          | no        |
| `Dashboard`          | `frontend/src/app/dashboard/page.tsx` | `/dashboard` | no        |

#### Hooks y State

| Hook               | Archivo                                  | Retorna                                                                     | Descripción                                                                                                        |
| ------------------ | ---------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `useAuth`          | `frontend/src/hooks/useAuth.ts`          | estado de `user`, `profile`, `token`, `loading` y acciones de autenticación | Fuente de verdad para determinar si el navbar se renderiza y qué enlaces son visibles según el Perfil autenticado. |
| `useOfficeCatalog` | `frontend/src/hooks/useOfficeCatalog.ts` | catálogo, loading, error y acciones de gestión de consultorios              | Hook existente cuyo contrato visible debe seguir reflejando cuándo un consultorio puede o no deshabilitarse.       |

#### Services (llamadas API)

| Función     | Archivo | Endpoint                                             |
| ----------- | ------- | ---------------------------------------------------- |
| `No aplica` | —       | Sin cambios de servicios ni endpoints para esta spec |

### Arquitectura y Dependencias

- Paquetes nuevos requeridos: ninguno
- Servicios externos: ninguno nuevo; se mantienen Firebase/Auth y dependencias actuales sin cambios contractuales
- Impacto en punto de entrada de la app: `Navbar` continúa montado desde `frontend/src/app/layout.tsx`; no se altera el wiring global
- `Gestión Operativa` conserva la navegación exclusiva definida por SPEC-017; este ajuste solo cambia el nombre general del selector interno.

### Notas de Implementación

> Remover únicamente el ítem `{ href: "/", label: "Turnos", roles: "public" }` de la composición visible del navbar autenticado. Mantener `{ href: "/dashboard", label: "Dashboard", roles: "public" }`, la condición que oculta el navbar cuando no existe `profile` y la accesibilidad directa a `/` como pantalla pública.
>
> Ajustar el item de navegación autenticada `{ href: "/admin/profiles", ... }` para que su label visible sea `Gestión Operativa`, manteniendo la misma ruta y visibilidad solo para `admin`.
>
> En `frontend/src/app/admin/profiles/page.tsx`, cambiar solo el nombre general del selector interno de `Gestión Operativa` a `Selector de gestión`, sin cambiar las etiquetas actuales de las opciones.
>
> La regla de deshabilitación de consultorios ya implementada por SPEC-016 debe preservarse sin introducir contratos nuevos: un consultorio libre puede deshabilitarse y uno ocupado mantiene el bloqueo visual y el rechazo backend existente.
>
> Actualizar `docs/MANUAL_DE_OPERACION.md` para alinear la navegación autenticada y, si se documenta el selector interno de `Gestión Operativa`, usar el nombre `Selector de gestión`.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación

- [x] No aplica — esta spec no introduce backend nuevo; solo requiere preservar el contrato vigente de consultorios definido en SPEC-016.

#### Tests Backend

- [x] Verificar por regresión que `PATCH /offices/:number` sigue rechazando con 409 la deshabilitación de consultorios ocupados.

### Frontend

#### Implementación

- [x] Ajustar `frontend/src/components/Navbar/Navbar.tsx` para excluir el enlace `Turnos` del navbar autenticado para cualquier Perfil.
- [x] Preservar `Dashboard` como opción visible del navbar autenticado y mantener sin cambios los enlaces específicos por Perfil.
- [x] Mantener sin cambios la lógica actual que oculta el navbar cuando no existe `profile`.
- [x] Renombrar a `Gestión Operativa` el item de navbar que apunta a `/admin/profiles` para el rol `admin`.
- [x] Ajustar `frontend/src/app/admin/profiles/page.tsx` para renombrar el nombre general del selector interno a `Selector de gestión`.
- [x] Mantener sin cambios las etiquetas visibles de las opciones del selector interno (`Gestión de perfiles`, `Gestionar especialidades`, `Gestionar consultorios`).
- [x] Confirmar que las rutas `/` y `/dashboard` continúan accesibles y sin cambios de autorización.
- [x] Validar que `OfficeManager` siga permitiendo deshabilitar consultorios libres y siga bloqueando la acción cuando el consultorio esté ocupado.
- [x] Actualizar `docs/MANUAL_DE_OPERACION.md` para reflejar `Gestión Operativa` como nombre visible del acceso admin a `/admin/profiles`.

#### Tests Frontend

- [x] Crear o actualizar `frontend/test/components/Navbar.spec.tsx` para verificar que `Turnos` no se renderiza con perfiles `admin`, `recepcionista` y `doctor`.
- [x] Crear o actualizar `frontend/test/components/Navbar.spec.tsx` para verificar que `Dashboard` permanece visible para perfiles autenticados.
- [x] Crear o actualizar `frontend/test/components/Navbar.spec.tsx` para verificar que el navbar sigue oculto cuando `loading` es `true` o no existe `profile`.
- [x] Crear o actualizar `frontend/test/components/Navbar.spec.tsx` para verificar que el acceso admin a `/admin/profiles` se muestra como `Gestión Operativa` y no como `Perfiles`.
- [x] Crear o actualizar `frontend/test/app/admin/profiles/page.spec.tsx` para verificar que el selector interno se identifica como `Selector de gestión`.
- [x] Crear o actualizar `frontend/test/components/OfficeManager.spec.tsx` para verificar que un consultorio libre puede deshabilitarse y uno ocupado sigue bloqueado.
- [x] Crear o actualizar `frontend/test/app/page.spec.tsx` para verificar que el acceso directo a `/` sigue renderizando la pantalla pública sin depender del enlace del navbar.

### QA

- [x] Ejecutar skill `/gherkin-case-generator` → criterios CRITERIO-1.1, CRITERIO-1.2, CRITERIO-1.3, CRITERIO-2.1, CRITERIO-2.2, CRITERIO-2.3, CRITERIO-3.1, CRITERIO-3.2 y CRITERIO-3.3
- [x] Ejecutar skill `/risk-identifier` → validar riesgo de regresión visual y de navegación autenticada
- [x] Revisar cobertura de tests contra la remoción de `Turnos`, la preservación de `Dashboard`, el rename a `Selector de gestión` y la regla libre/ocupado de consultorios
- [x] Validar que `docs/MANUAL_DE_OPERACION.md`, `Gestión Operativa` y la gestión de consultorios reflejan el mismo comportamiento esperado para navegación y bloqueo operativo
- [x] Actualizar estado spec: `status: IMPLEMENTED`
