---
id: SPEC-020
status: APPROVED
feature: audit-table-pagination-limit-selector
created: 2026-04-07
updated: 2026-04-07
author: spec-generator
version: "1.0"
related-specs:
  - SPEC-011
---

# Spec: Paginador funcional y selector de filas en Trazabilidad Operativa

> **Estado:** `APPROVED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Mejorar la tabla de Trazabilidad Operativa (`AuditLogTable`) para que el paginador sea completamente funcional y se agregue un selector (`<select>`) que permita al Administrador elegir cuántas filas por página desea visualizar, con opciones fijas de **5, 10 y 15** (incrementos de 5). Actualmente el hook `useAuditLogs` usa un `DEFAULT_LIMIT` fijo de 20 sin posibilidad de que el usuario lo modifique desde la UI. Esta spec es un cambio **exclusivamente frontend**; el backend (`GET /audit-logs`) ya acepta el query param `limit` (1–100).

### Requerimiento de Negocio

En la pantalla de Trazabilidad Operativa (`/admin/audit`), la tabla debe tener:

1. Un paginador funcional con botones "Anterior" y "Siguiente" (ya existe, operativo).
2. Un selector de cuántas filas pueden verse por página, con opciones de **5, 10 y 15** filas (incrementos de 5).
3. El valor por defecto al ingresar a la página debe ser **5 filas**.
4. Al cambiar el número de filas, la tabla debe volver a la página 1 y recargar los datos.

### Historias de Usuario

#### HU-01: Selector de filas por página en Trazabilidad Operativa

```
Como:        Administrador
Quiero:      Poder seleccionar cuántas filas mostrar en la tabla de auditoría (5, 10 o 15)
Para:        Ajustar la densidad de información según mi preferencia y el tamaño de pantalla

Prioridad:   Media
Estimación:  S
Dependencias: SPEC-011 (implementado)
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Selector de filas visible con opciones 5, 10, 15
  Dado que:  el Administrador está en la página /admin/audit
  Cuando:    la tabla carga registros
  Entonces:  se muestra un selector (<select>) en la barra de paginación con las opciones "5", "10" y "15"
    Y        el valor por defecto es "5"
    Y        la tabla muestra un máximo de 5 filas
```

```gherkin
CRITERIO-1.2: Cambiar filas por página recarga la tabla desde la página 1
  Dado que:  el Administrador está en la página 3 visualizando 5 filas
  Cuando:    selecciona "10" en el selector de filas
  Entonces:  la tabla se recarga mostrando la página 1 con hasta 10 filas
    Y        el paginador refleja el nuevo total de páginas
    Y        el indicador muestra "Página 1 de N (X registros)"
```

```gherkin
CRITERIO-1.3: Paginación funciona con el límite seleccionado
  Dado que:  el Administrador tiene seleccionado "15" filas y hay más de 15 registros
  Cuando:    hace clic en "Siguiente →"
  Entonces:  la tabla carga la página 2 con hasta 15 filas
    Y        el query param enviado al backend contiene limit=15&page=2
```

**Edge Case**

```gherkin
CRITERIO-1.4: Selector con pocos registros
  Dado que:  solo hay 3 registros de auditoría
  Cuando:    el Administrador selecciona "10" filas
  Entonces:  la tabla muestra los 3 registros en la página 1
    Y        los botones "Anterior" y "Siguiente" están deshabilitados
    Y        el indicador muestra "Página 1 de 1 (3 registros)"
```

### Reglas de Negocio

1. Las opciones del selector de filas son exclusivamente **5, 10, 15** — no se permiten valores arbitrarios.
2. El valor por defecto al cargar la página es **5**.
3. Al cambiar el límite de filas, la paginación se reinicia a la página 1.
4. El backend ya soporta `limit` (1–100); no requiere cambios.
5. El selector debe ser accesible (poseer `aria-label`) y mantener la coherencia visual con el design system existente.
6. Los botones de paginación y el selector de filas deben ser legibles tanto en modo claro como en modo oscuro.

---

## 2. DISEÑO

### Modelos de Datos

Sin cambios. El backend ya retorna `AuditLogPage` con `{ data, total, page, limit, totalPages }`.

### API Endpoints

Sin cambios. `GET /audit-logs` ya acepta `?limit=N&page=N`.

### Diseño Frontend

#### Análisis de estado actual vs. delta

| Elemento                     | Estado actual                                              | Delta requerido                                                                 |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `useAuditLogs` hook          | `DEFAULT_LIMIT = 20` fijo, no expone `limit` ni `setLimit` | Agregar estado `limit` (default 5), exponer `limit`, `limitOptions`, `setLimit` |
| `AuditLogTable` props        | No recibe `limit`, `limitOptions`, `onLimitChange`         | Agregar 3 props nuevas                                                          |
| `AuditLogTable` markup       | Paginador con solo Anterior / Info / Siguiente             | Agregar `<select>` con opciones 5, 10, 15 a la izquierda del info de página     |
| `AuditLogTable.module.css`   | Sin estilos para selector de filas                         | Agregar `.limitSelector`, `.limitSelect`, `.limitLabel`                         |
| `AdminAuditPage`             | No desestructura `limit`/`setLimit` del hook               | Pasar `limit`, `limitOptions`, `onLimitChange` a `AuditLogTable`                |
| `globals.css` dark overrides | `--color-slate-300/700` no se redefinen en dark mode       | Agregar overrides: `--color-slate-300: #475569`, `--color-slate-700: #e2e8f0`   |

#### Componentes modificados

| Componente       | Archivo                                      | Cambio                                                                                                  |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `AuditLogTable`  | `components/AuditLogTable/AuditLogTable.tsx` | Agregar props `limit`, `limitOptions`, `onLimitChange`; renderizar `<select>` en la barra de paginación |
| `AdminAuditPage` | `app/admin/audit/page.tsx`                   | Desestructurar `limit`, `limitOptions`, `setLimit` del hook y pasarlos como props                       |

#### Hooks modificados

| Hook           | Archivo                 | Cambio                                                                                                                                                                                        |
| -------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useAuditLogs` | `hooks/useAuditLogs.ts` | `DEFAULT_LIMIT` → 5; agregar `LIMIT_OPTIONS = [5, 10, 15]`; agregar estado `limit` y callback `setLimit`; incluir `limit` en deps de `fetchLogs`; exponer `limit`, `limitOptions`, `setLimit` |

#### Estilos modificados

| Archivo                    | Cambio                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `AuditLogTable.module.css` | Agregar `.limitSelector` (contenedor flex), `.limitLabel` (texto), `.limitSelect` (select nativo)                               |
| `globals.css`              | Agregar dark mode overrides para `--color-slate-300` (`#475569`) y `--color-slate-700` (`#e2e8f0`) en `html[data-theme="dark"]` |

#### Detalle de cambios por archivo

**`frontend/src/hooks/useAuditLogs.ts`**

1. Cambiar `DEFAULT_LIMIT` de `20` a `5`.
2. Agregar constante `LIMIT_OPTIONS = [5, 10, 15]`.
3. Agregar `useState(DEFAULT_LIMIT)` para `limit`.
4. En `fetchLogs`, usar `limit` (estado) en lugar de `DEFAULT_LIMIT` constante.
5. Agregar `limit` al array de dependencias de `fetchLogs`.
6. Agregar callback `setLimit` que actualiza `limit` y resetea `page` a 1.
7. Exponer en return: `limit`, `limitOptions: LIMIT_OPTIONS`, `setLimit`.

**`frontend/src/components/AuditLogTable/AuditLogTable.tsx`**

1. Agregar a `AuditLogTableProps`: `limit: number`, `limitOptions: number[]`, `onLimitChange: (limit: number) => void`.
2. En la sección de paginación, agregar antes del bloque de botones:
   ```tsx
   <div className={styles.limitSelector}>
     <label className={styles.limitLabel} htmlFor="audit-limit-select">
       Filas por página:
     </label>
     <select
       id="audit-limit-select"
       className={styles.limitSelect}
       value={limit}
       onChange={(e) => onLimitChange(Number(e.target.value))}
       data-testid="audit-limit-select"
       aria-label="Filas por página"
     >
       {limitOptions.map((opt) => (
         <option key={opt} value={opt}>
           {opt}
         </option>
       ))}
     </select>
   </div>
   ```

**`frontend/src/components/AuditLogTable/AuditLogTable.module.css`**

1. Agregar estilos `.limitSelector`, `.limitLabel`, `.limitSelect` coherentes con el design system (`--color-input-*`, `--color-text-*`).

**`frontend/src/app/admin/audit/page.tsx`**

1. Desestructurar `limit`, `limitOptions`, `setLimit` del hook `useAuditLogs()`.
2. Pasar `limit={limit}`, `limitOptions={limitOptions}`, `onLimitChange={setLimit}` a `<AuditLogTable>`.

### Arquitectura y Dependencias

- Paquetes nuevos requeridos: ninguno.
- Servicios externos: sin cambios.
- Impacto en backend: ninguno — el endpoint `GET /audit-logs` ya acepta `limit` (1–100).

### Notas de Implementación

- El backend DTO `AuditLogQueryDto` tiene `@Max(100)` en `limit`. Las opciones 5, 10, 15 están dentro del rango permitido.
- Al cambiar `DEFAULT_LIMIT` de 20 a 5, el `useEffect` que llama `fetchLogs(1)` se disparará con el nuevo límite automáticamente gracias al array de dependencias `[token, filters, limit]`.
- El `setLimit` debe resetear `page` a 1 para evitar quedar en una página inexistente.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.

### Backend

No aplica — sin cambios en backend.

### Frontend

#### Implementación

- [ ] Modificar `useAuditLogs` — `DEFAULT_LIMIT` → 5, agregar `LIMIT_OPTIONS`, estado `limit`, callback `setLimit`, incluir `limit` en deps de `fetchLogs`, exponer en return
- [ ] Modificar `AuditLogTable` — agregar props `limit`, `limitOptions`, `onLimitChange`; renderizar `<select>` en paginación con opciones 5/10/15
- [ ] Modificar `AuditLogTable.module.css` — agregar estilos `.limitSelector`, `.limitLabel`, `.limitSelect`
- [ ] Modificar `AdminAuditPage` — desestructurar y pasar nuevas props a `AuditLogTable`
- [ ] Modificar `globals.css` — agregar dark mode overrides para `--color-slate-300` (`#475569`) y `--color-slate-700` (`#e2e8f0`) en `html[data-theme="dark"]`

#### Tests Frontend

- [ ] `[AuditLogTable] renders limit selector with options 5, 10, 15`
- [ ] `[AuditLogTable] default selected limit is 5`
- [ ] `[AuditLogTable] calls onLimitChange when selector value changes`
- [ ] `[useAuditLogs] setLimit resets page to 1 and re-fetches`
- [ ] `[useAuditLogs] fetchLogs sends correct limit param`
- [ ] `[AdminAuditPage] passes limit props to AuditLogTable`

### QA

- [ ] Verificar CRITERIO-1.1: selector visible con opciones 5, 10, 15 y default 5
- [ ] Verificar CRITERIO-1.2: cambiar selector recarga tabla desde página 1
- [ ] Verificar CRITERIO-1.3: paginación envía limit correcto al backend
- [ ] Verificar CRITERIO-1.4: pocos registros deshabilitan botones de paginación
- [ ] Verificar compatibilidad dark mode (estilos del select usan tokens del design system)
- [ ] Verificar botones "Anterior" / "Siguiente" son legibles en dark mode (texto claro sobre fondo oscuro)
- [ ] Actualizar estado spec: `status: IMPLEMENTED`
