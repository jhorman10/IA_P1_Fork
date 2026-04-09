# Design System — Plantilla de Diseño

> **Fuente de verdad visual** para todo el aplicativo.
> Cada sección, componente y página DEBE seguir esta plantilla sin excepciones.
> Los tokens CSS viven en `frontend/src/styles/globals.css` y son la única fuente de valores.

---

## 1. Tipografía

| Propiedad      | Valor                                                                                 |
| -------------- | ------------------------------------------------------------------------------------- |
| **Font stack** | `-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Roboto, sans-serif` |
| **Token**      | `var(--font-stack)`                                                                   |

### Escala tipográfica

| Uso                     | Tamaño  | Peso    | Token peso                                        | Ejemplo                                           |
| ----------------------- | ------- | ------- | ------------------------------------------------- | ------------------------------------------------- |
| Título de página        | 26px    | 600     | `--font-weight-semibold`                          | "Gestión Operativa", "Trazabilidad Operativa"     |
| Título de sección       | 16px    | 600     | `--font-weight-semibold`                          | "Turnos", "Médicos"                               |
| Texto de cuerpo         | 14px    | 400     | `--font-weight-normal`                            | Celdas de tabla, párrafos                         |
| Texto secundario        | 13–14px | 500     | `--font-weight-medium`                            | Subtítulos, hints                                 |
| Labels de formulario    | 12–13px | 500–600 | `--font-weight-medium` / `--font-weight-semibold` | Labels de inputs, filtros                         |
| Badges / tags           | 12px    | 500     | `--font-weight-medium`                            | Roles, estados                                    |
| Texto terciario / hints | 12–13px | 400     | `--font-weight-normal`                            | UIDs, timestamps                                  |
| Monospace (horas, IDs)  | 11–12px | 600     | `--font-weight-semibold`                          | `font-family: "Monaco", "Courier New", monospace` |

### Reglas de tipografía

- `letter-spacing: -0.5px` solo para `.title` de página (≥ 26px).
- No usar `text-transform: uppercase` en títulos. Solo en labels de filtros y badges de estado.
- Nunca hardcodear valores de peso: siempre `var(--font-weight-*)`.

---

## 2. Paleta de Colores

### Tema Claro (`:root`)

| Token                      | Hex                  | Uso                                                        |
| -------------------------- | -------------------- | ---------------------------------------------------------- |
| `--background`             | `#f8fafc`            | Fondo de body                                              |
| `--foreground`             | `#111827`            | Texto global default                                       |
| `--gold`                   | `#c6a96b`            | Acento primario / brand (navbar, botones CTA, focus rings) |
| `--color-primary`          | `#2563eb`            | Acento funcional (links activos, botones de acción)        |
| `--color-surface`          | `#ffffff`            | Fondo de cards, modales, tablas                            |
| `--color-surface-alt`      | `#f8fafc`            | Fondo alternativo (headers de tabla, filtros)              |
| `--color-surface-tertiary` | `#f1f5f9`            | Fondo terciario (código, hints, badges neutros)            |
| `--color-text-primary`     | `#0b1324`            | Texto principal                                            |
| `--color-text-secondary`   | `#475569`            | Texto secundario (subtítulos, labels)                      |
| `--color-text-tertiary`    | `#94a3b8`            | Texto terciario (placeholders, metadata)                   |
| `--color-text-inverted`    | `#ffffff`            | Texto sobre fondos oscuros/coloreados                      |
| `--color-border`           | `#e2e8f0`            | Bordes de cards, tablas, inputs                            |
| `--color-border-light`     | `#f1f5f9`            | Bordes suaves (separadores de fila)                        |
| `--color-overlay`          | `rgba(0, 0, 0, 0.5)` | Fondo de modales                                           |

#### Semánticos

| Familia   | 50        | 100       | 200       | 500       | 600       | 700       | 800       |
| --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| **Blue**  | `#eff6ff` | —         | `#bfdbfe` | `#3b82f6` | `#2563eb` | `#1d4ed8` | —         |
| **Amber** | `#fffbeb` | —         | `#fde68a` | `#f59e0b` | —         | `#b45309` | `#92400e` |
| **Green** | `#f0fdf4` | `#dcfce7` | `#bbf7d0` | `#22c55e` | `#16a34a` | —         | `#166534` |
| **Red**   | `#fee2e2` | `#fee2e2` | —         | —         | `#dc2626` | —         | —         |
| **Slate** | —         | —         | —         | —         | —         | `#334155` | —         |

### Tema Oscuro (`html[data-theme="dark"]`)

| Token                      | Hex Light → Hex Dark                      |
| -------------------------- | ----------------------------------------- |
| `--background`             | `#f8fafc` → `#0a0a0a`                     |
| `--foreground`             | `#111827` → `#ededed`                     |
| `--color-surface`          | `#ffffff` → `#1e293b`                     |
| `--color-surface-alt`      | `#f8fafc` → `#0f172a`                     |
| `--color-surface-tertiary` | `#f1f5f9` → `#334155`                     |
| `--color-text-primary`     | `#0b1324` → `#f1f5f9`                     |
| `--color-text-secondary`   | `#475569` → `#94a3b8`                     |
| `--color-text-tertiary`    | `#94a3b8` → `#64748b`                     |
| `--color-text-inverted`    | `#ffffff` → `#0b1324`                     |
| `--color-border`           | `#e2e8f0` → `#334155`                     |
| `--color-border-light`     | `#f1f5f9` → `#1e293b`                     |
| `--color-overlay`          | `rgba(0,0,0,0.5)` → `rgba(0,0,0,0.7)`     |
| `--color-primary`          | `#2563eb` → `#3b82f6`                     |
| `--shadow-sm`              | `rgba(15,23,42,0.06)` → `rgba(0,0,0,0.3)` |
| `--shadow-md`              | `rgba(15,23,42,0.08)` → `rgba(0,0,0,0.4)` |
| `--shadow-lg`              | `rgba(15,23,42,0.1)` → `rgba(0,0,0,0.5)`  |
| `--shadow-xl`              | `rgba(15,23,42,0.12)` → `rgba(0,0,0,0.6)` |

### Regla de oro de colores

- **NUNCA hardcodear un hex en un `.module.css`**. Siempre usar `var(--color-*)`.
- Excepción: gradientes del brand (`linear-gradient(135deg, var(--gold), #b89652)`).
- Todo componente que use `background`, `color` o `border-color` debe tener `transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease` para soporte de cambio de tema.

---

## 3. Espaciado, Radios y Sombras

### Tokens de radio

| Token         | Valor  | Uso                                                  |
| ------------- | ------ | ---------------------------------------------------- |
| `--radius-sm` | `8px`  | Badges, botones pequeños, inputs compactos           |
| `--radius-md` | `12px` | Cards, tablas, inputs, modales interiores            |
| `--radius-lg` | `16px` | Modales principales, paneles, formularios standalone |

### Tokens de sombra

| Token         | Uso                              |
| ------------- | -------------------------------- |
| `--shadow-sm` | Cards normales, inputs con foco  |
| `--shadow-md` | Formularios standalone, popovers |
| `--shadow-lg` | Cards elevados al hover          |
| `--shadow-xl` | Modales                          |

### Espaciado de página (admin)

```css
.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
}
```

### Espaciado de header de página

```css
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 16px;
  flex-wrap: wrap;
}
```

---

## 4. Estilos de Página Admin

Todas las páginas del área admin (`/admin/*`) siguen esta plantilla exacta:

### Header

```css
.heading {
  font-size: 26px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.subheading {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}
```

### Error

```css
.error {
  font-size: 14px;
  color: var(--color-red-600);
  background: var(--color-red-50);
  border: 1px solid var(--color-red-100);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}
```

### Empty state

```css
.emptyState {
  text-align: center;
  padding: 48px 0;
  color: var(--color-text-secondary);
  font-size: 15px;
}
```

### Loading

```css
.loading {
  font-size: 14px;
  color: var(--color-text-secondary);
  padding: 16px 0;
  margin: 0;
}
```

---

## 5. Formularios

Todos los inputs, selects y textareas del aplicativo siguen estas reglas.

### Inputs

```css
.input {
  padding: 10px 14px; /* Compact: forms inline */
  /* padding: 14px 16px;       /* Standalone: login, registro */
  font-size: 14px; /* 15px en standalone */
  border-radius: 8px; /* 10px en standalone */
  border: 1px solid var(--color-input-border);
  background: var(--color-input-bg);
  color: var(--color-input-text);
  transition: all 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: var(--gold);
  background: var(--color-surface);
  box-shadow: 0 0 0 2px rgba(198, 169, 107, 0.15);
}

.input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Labels

```css
.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-slate-700);
  margin-bottom: -6px; /* solo en modales/forms verticales */
}
```

Para filtros/forms inline con labels uppercase:

```css
.filterLabel {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-slate-700);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

### Selects

```css
.select {
  padding: 8px 12px;
  border-radius: 7px;
  border: 1px solid var(--color-input-border);
  background: var(--color-input-bg);
  font-size: 14px;
  color: var(--color-input-text);
  transition: border-color 0.15s ease;
  width: 100%;
}

.select:focus {
  outline: none;
  border-color: var(--gold);
}
```

### Error de formulario

```css
.formError {
  font-size: 13px;
  color: var(--color-red-600);
  background: var(--color-red-50);
  border: 1px solid var(--color-red-100);
  border-radius: 8px;
  padding: 10px 14px;
  margin: 0;
}
```

---

## 6. Botones

### Primario (CTA / brand)

```css
.btnPrimary {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, var(--gold), #b89652);
  color: var(--color-text-inverted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btnPrimary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(198, 169, 107, 0.3);
}

.btnPrimary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Secundario (neutro)

```css
.btnSecondary {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btnSecondary:hover:not(:disabled) {
  background: var(--color-surface-alt);
}

.btnSecondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Acción (funcional / azul)

```css
.btnAction {
  padding: 11px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: var(--color-blue-600);
  color: #fff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
  transition:
    background 0.2s ease,
    transform 0.15s ease,
    box-shadow 0.2s ease;
}

.btnAction:hover:not(:disabled) {
  background: var(--color-blue-700);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
}

.btnAction:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

### Destructivo (rojo)

```css
.btnDanger {
  padding: 7px 14px;
  border-radius: 7px;
  border: 1px solid var(--color-red-100);
  background: var(--color-red-50);
  color: var(--color-red-600);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btnDanger:hover:not(:disabled) {
  background: var(--color-red-100);
}

.btnDanger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Inline (texto link)

```css
.btnInline {
  background: none;
  border: none;
  color: var(--gold);
  font-size: 15px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}
```

---

## 7. Tablas

```css
.tableWrapper {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  transition:
    background 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table th {
  background: var(--color-surface-alt);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--color-slate-700);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.table td {
  padding: 12px 16px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border-light);
  vertical-align: top;
}

.table tr:last-child td {
  border-bottom: none;
}

.table tr:hover td {
  background: var(--color-surface-alt);
}
```

### Paginación

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  gap: 12px;
  flex-wrap: wrap;
}

.pageBtn {
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-slate-700);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pageBtn:hover:not(:disabled) {
  background: var(--color-surface-alt);
}

.pageBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pageInfo {
  font-size: 14px;
  color: var(--color-text-secondary);
}
```

---

## 8. Modales

```css
.overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  transition:
    background 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}

.modalHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.modalTitle {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.modalClose {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.modalClose:hover {
  background: var(--color-surface-tertiary);
  color: var(--color-text-primary);
}

.modalBody {
  padding: 20px 24px 24px;
}

.modalActions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}
```

---

## 9. Toast / Notificaciones

```css
.toast {
  position: fixed;
  bottom: 32px;
  right: 32px;
  background: var(--color-surface);
  padding: 16px 20px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  font-size: 14px;
  letter-spacing: 0.3px;
  color: var(--color-text-primary);
  border-left: 4px solid var(--color-green-500);
  font-weight: var(--font-weight-medium);
  z-index: 1000;
  animation: toastSlideIn var(--duration-standard) var(--ease-standard);
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(400px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### Variantes de toast

| Variante | `border-left` color                              |
| -------- | ------------------------------------------------ |
| Éxito    | `var(--color-green-500)`                         |
| Error    | `var(--color-red-600)`                           |
| Info     | `var(--color-primary)` / `var(--color-blue-600)` |
| Warning  | `var(--color-amber-500)`                         |

---

## 10. Tooltips

```css
.tooltip {
  position: absolute;
  background: var(--color-surface-tertiary);
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 500;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  white-space: nowrap;
  z-index: 50;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--duration-short) var(--ease-standard);
}

.tooltipVisible {
  opacity: 1;
}
```

---

## 11. Badges / Tags

### Badge genérico

```css
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
```

### Variantes de badge

| Variante      | Background                      | Color                         |
| ------------- | ------------------------------- | ----------------------------- |
| Admin         | `var(--color-blue-50)`          | `var(--color-blue-600)`       |
| Doctor        | `var(--color-amber-50)`         | `var(--color-amber-700)`      |
| Recepcionista | `var(--color-green-50)`         | `var(--color-green-600)`      |
| Activo        | `var(--color-green-50)`         | `var(--color-green-600)`      |
| Inactivo      | `var(--color-surface-alt)`      | `var(--color-text-secondary)` |
| Neutro        | `var(--color-surface-tertiary)` | `var(--color-slate-700)`      |

### Badge status (pill redondeado)

```css
.statusPill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

---

## 12. Cards

### Card estándar (contenedor)

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition:
    background 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}
```

### Card sección (agrupador inline, e.g. MetricsGrid)

```css
.sectionCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 20px;
  transition:
    background 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}
```

### Card con border-left (notificaciones, items de estado)

```css
.accentCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  border-radius: 10px;
  padding: 14px 16px;
  box-shadow: var(--shadow-sm);
  transition:
    background 0.3s ease,
    border-color 0.3s ease;
}
```

---

## 13. Navegación / Navbar

```css
.navbar {
  height: 56px;
  background: var(--color-nav-bg);
  color: var(--color-nav-text);
  border-bottom: 2px solid var(--gold);
  position: sticky;
  top: 0;
  z-index: 100;
}
```

- Brand: `color: var(--gold); font-weight: 700`
- Links: `color: var(--color-nav-link)`
- Link hover: `background: var(--color-nav-link-hover-bg)`
- Link activo: `background: var(--color-nav-link-active-bg); color: var(--color-nav-link-active-text); border-color: var(--color-nav-link-active-border)`

---

## 14. Animaciones y Transiciones

| Token                 | Valor                          | Uso                          |
| --------------------- | ------------------------------ | ---------------------------- |
| `--ease-standard`     | `cubic-bezier(0.4, 0, 0.2, 1)` | Transiciones generales       |
| `--ease-emphasized`   | `cubic-bezier(0.2, 0, 0, 1)`   | Apariciones, modales         |
| `--duration-short`    | `0.2s`                         | Hovers, toggles              |
| `--duration-standard` | `0.35s`                        | Toasts, transiciones de tema |

### Reglas

- `transition: all 0.15s ease` para botones y micro-interacciones.
- `transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease` para soporte de cambio de tema.
- `transform: translateY(-1px)` en hover de botones CTA (máximo desplazamiento).
- No animaciones que duren > 0.5s.

---

## 15. Responsive

### Breakpoint único

| Punto  | Valor              | Comportamiento                                   |
| ------ | ------------------ | ------------------------------------------------ |
| Mobile | `max-width: 768px` | Navbar wrap, grids → 1 columna, padding reducido |

### Grid estándar

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}
```

Para tarjetas grandes:

```css
.cardGrid {
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
}
```

---

## 16. Lista de Verificación (Checklist)

Antes de agregar CSS a cualquier componente, verificar:

- [ ] ¿Usa tokens `var(--color-*)` en lugar de hex hardcodeados?
- [ ] ¿Tiene `transition` para soporte de cambio de tema?
- [ ] ¿Los inputs siguen el patrón de focus ring con `var(--gold)`?
- [ ] ¿Los botones siguen una de las 5 variantes definidas?
- [ ] ¿El error sigue el patrón `red-600 / red-50 / red-100`?
- [ ] ¿El empty state usa `text-align: center; color: var(--color-text-secondary); padding: 48px 0`?
- [ ] ¿Los radios usan `var(--radius-*)` y no valores mágicos?
- [ ] ¿Los `font-weight` usan `var(--font-weight-*)`?
- [ ] ¿El header de página usa `26px / 600 / color-text-primary`?

---

## 17. Resumen de Inconsistencias Detectadas y Corregidas

| Componente                    | Problema                                                                 | Corrección                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `AppointmentRegistrationForm` | Hex hardcodeados (`#ffffff`, `#111827`, `#e5e7eb`, `#fafafa`, `#c6a96b`) | Migrar a `var(--color-surface)`, `var(--color-text-primary)`, `var(--color-border)`, `var(--color-input-bg)`, `var(--gold)` |
| Navbar role badges            | Hex hardcodeados (`#7c3aed`, `#0284c7`, `#059669`)                       | Migrar a tokens semánticos                                                                                                  |
| `LoginForm` `.error`          | `border: 1px solid #fecaca` hardcodeado                                  | Usar `var(--color-red-100)`                                                                                                 |

> Estos archivos deben migrase progresivamente. Cada PR que toque un componente listado DEBE incluir la corrección de tokens como parte del cambio.
