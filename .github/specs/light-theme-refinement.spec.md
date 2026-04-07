---
id: SPEC-019
status: IMPLEMENTED
feature: light-theme-refinement
created: 2026-04-07
updated: 2026-04-07
author: spec-generator
version: "1.0"
related-specs: []
---

# Spec: Refinamiento del Light Theme – Reducción de Fatiga Visual

> **Estado:** `IMPLEMENTED`.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Ajustar los tokens de color del light theme para reducir la fatiga visual causada por superficies excesivamente brillantes. El cambio debe ser homogéneo, afectando únicamente a tokens de luz compartidos en `frontend/src/styles/globals.css`, sin introducir overrides por página ni afectar el dark theme innecesariamente.

### Requerimiento de Negocio

El aplicativo presenta un light theme ("modo claro") que es percibido como "demasiado brillante y causa fatiga visual en los usuarios". Se requiere un refinamiento visual que:

- Reduzca la intensidad del blanco base sin afectar legibilidad ni contraste
- Mantenga consistencia visual homogénea en toda la aplicación
- Preserve la jerarquía cromática existente (oro, azul, verde, etc.)
- No introduzca fragmentación visual mediante overrides ad-hoc por página o componente

### Historias de Usuario

#### HU-01: Ajustar Background y Surfaces del Light Theme

```
Como:        Usuario del aplicativo (cualquier rol autenticado)
Quiero:      que el background y las superficies de la app sean menos brillantes
Para:        reducir la fatiga visual durante sesiones prolongadas de uso

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Light theme muestra superficies suavizadas en modo claro
  Dado que:  el usuario está conectado en modo claro
  Cuando:    accede a cualquier página del aplicativo (admin, public, auth)
  Entonces:  percibe un background y surfaces con intensidad reducida respecto al blanco puro
  Y:         la transición visual es homogénea en todos los componentes (cards, inputs, modales, tablas, navbar)
```

**Alpha / Validation**

```gherkin
CRITERIO-1.2: Tokens luz se aplican globalmente sin overrides por página
  Dado que:  se han ajustado los tokens --background, --color-surface, --color-surface-alt en :root
  Cuando:    la app se renderiza en light theme
  Entonces:  ningún archivo .module.css contiene hardcoded hex valores para background o surface
  Y:         no existen overrides oscuros innecesarios en html[data-theme="dark"] para estos tokens
```

**Edge Case**

```gherkin
CRITERIO-1.3: Contraste texto-fondo cumple WCAG AA en light theme refinado
  Dado que:  se han suavizado los backgrounds (ej. #f8fafc → #f5f7fa o similar)
  Cuando:    un usuario con visión normal verifica pares texto-fondo (text primario sobre surface)
  Entonces:  el ratio de contraste sigue cumpliendo WCAG AA (4.5:1 mínimo para texto normal, 3:1 para texto grande)
```

#### Criterios de Aceptación — HU-02: Validación Visual en Admin

```
Como:        Administrador del sistema
Quiero:      visualizar las páginas admin del sistema con el light theme refinado
Para:        validar que la fatiga visual se ha reducido y la consistencia es correcta
```

**Validation**

```gherkin
CRITERIO-2.1: Admin pages render con light theme refinado
  Dado que:  el usuario accede a /admin/profiles, /admin/turnos, /admin/appointments, /admin/offices
  Cuando:    estas páginas se renderizan en light theme
  Entonces:  el background y las surfaces (tables, cards, filtros) muestran la paleta refinada
  Y:         no hay elementos con blanco puro (#ffffff) visibles en contraste con el background (salvo excepciones justificadas como badges o elementos brand)
```

### Reglas de Negocio

1. **Homogeneidad**: Los tokens de luz ajustados (`--background`, `--color-surface`, `--color-surface-alt`, `--color-surface-tertiary`) se definen UNA SOLA VEZ en `:root` — no se permiten overrides hardcodeados en archivos `.module.css`.

2. **Contraste WCAG**: El ratio de contraste entre `--color-text-primary` y `--color-surface` debe ser ≥ 4.5:1 (normal text). Entre `--color-text-secondary` y `--color-surface` debe ser ≥ 3:1.

3. **Dark Theme Intocado**: El bloque `html[data-theme="dark"]` no se modifica salvo si la coherencia técnica lo exige (ej. si se detecta que un valor heredado es inconsistente con los nuevos lights).

4. **Sin Fragmentación por Página**: No se crean variantes visuales estilo `.page-profile-light { background: #f9f9f9; }` u overrides contextuales. El cambio debe ser completamente centralizado en `globals.css`.

5. **Componentes Afectados**: El ajuste impacta globalmente a: navbar, cards, tables, inputs, modales, tooltips, toasts, badges, filtros y cualquier superficie que herede de los tokens base.

---

## 2. DISEÑO

### Modelos de Datos

N/A — Este es un refinamiento puramente visual sin cambios en esquema de datos, API o lógica de negocio.

### Tokens de Color — Light Theme Refinado

#### Propuesta de Ajuste

| Token                      | Valor Actual | Valor Propuesto | Justificación                                |
| -------------------------- | ------------ | --------------- | -------------------------------------------- |
| `--background`             | `#f8fafc`    | `#f6f8fb`       | Suavizar blanco base sin perder legibilidad  |
| `--color-surface`          | `#ffffff`    | `#fcfcfd`       | Reducir brillo de cards, modales, tablas     |
| `--color-surface-alt`      | `#f8fafc`    | `#f1f4f8`       | Diferenciar headers/filtros con menos brillo |
| `--color-surface-tertiary` | `#f1f5f9`    | `#eef2f7`       | Intensidad intermedia para código y hints    |

#### Nota sobre selección de valores

La opción aprobada por el usuario es **Opción B (menos agresiva)**:

- `#f6f8fb`
- `#fcfcfd`
- `#f1f4f8`
- `#eef2f7`

La implementación debe usar exclusivamente esta paleta para el refinamiento del light theme.

#### Validación de Contraste

Ratios (ejemplo con Opción A):

- `--color-text-primary` (`#0b1324`) sobre `--color-surface` (`#fafbfc`): ~ **19:1** ✓ (exceeds WCAG AAA)
- `--color-text-secondary` (`#475569`) sobre `--color-surface` (`#fafbfc`): ~ **9:1** ✓ (exceeds WCAG AA)

### Componentes Impactados

| Componente         | Token Afectado                                | Cambio Visual                                     |
| ------------------ | --------------------------------------------- | ------------------------------------------------- |
| Navbar             | `--color-nav-bg` (hereda `--color-surface`)   | Fondo menos brillante                             |
| Cards (admin)      | `--color-surface`                             | Menos blanco puro                                 |
| Tables             | `--color-surface`, `--color-surface-alt`      | Filas alternadas menos contrastadas pero legibles |
| Inputs             | `--color-input-bg` (hereda `--color-surface`) | Fondo suavizado                                   |
| Modales            | `--color-surface`                             | Menos brillo en overlay                           |
| Filtros/Headers    | `--color-surface-alt`                         | Área neutral suavizada                            |
| Tooltips / Toasts  | `--color-surface`                             | Consistencia con cards                            |
| Badges             | `--color-surface-tertiary`                    | Fondo neutro suavizado                            |
| Links / Focus Ring | Preservar `--gold` y `--color-primary`        | Sin cambios (ya optimizados)                      |

### Arquitectura y Dependencias

- **Artefacto único a modificar**: `frontend/src/styles/globals.css` (bloque `:root`)
- **Archivos que NO se tocan**:
  - Ningún `.module.css` individual
  - Archivos de componentes React
  - Archivos de layouts
  - Configuración de tema en context o providers (si existe)
- **Dependencias externas**: Ninguna — cambio puramente CSS
- **Retrocompatibilidad**: Mantiene 100% retrocompatibilidad; no rompe componentes existentes

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.

### Frontend

#### Diseño e Investigación

- [ ] **Prueba de contraste**: Verificar ratios WCAG con herramienta (ej. WebAIM Color Contrast) para todos los pares texto-fondo propuestos
- [ ] **Documentar decisión**: Registrar en la spec o nota de implementación que se aprobó Opción B

#### Implementación

- [ ] **Ajustar `:root` en `globals.css`**:
  - [ ] `--background`: cambiar de `#f8fafc` a `#f6f8fb`
  - [ ] `--color-surface`: cambiar de `#ffffff` a `#fcfcfd`
  - [ ] `--color-surface-alt`: cambiar de `#f8fafc` a `#f1f4f8`
  - [ ] `--color-surface-tertiary`: cambiar de `#f1f5f9` a `#eef2f7`
- [ ] **Verificar consistencia**: Revisar que `html[data-theme="dark"]` NO se duplica innecesariamente
- [ ] **Preservar animaciones**: Confirmar transiciones en cambio de tema siguen funcionando (`transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease`)
- [ ] **Compilación**: Asegurar que `npm run build` (frontend) pass sin errores

#### Validación Visual en Vivo

- [ ] **Navbar**: verificar background, links, hover states en light mode
- [ ] **Admin Profiles**: tabla, cards, filtros, modal de edición
- [ ] **Admin Turnos**: tabla turnos, modal creación, badges de estado
- [ ] **Admin Appointments**: tabla, modal detalles, botones
- [ ] **Admin Offices**: cards, form, inputs, botones de acción
- [ ] **Public Pages** (si aplican): mantener legibilidad en login, perfil público, etc.
- [ ] **Inputs y Formularios**: focus states, error states con borders claros
- [ ] **Modales**: overlay, card interna, botones, contacto visual correcto
- [ ] **Tooltip / Toasts**: legibilidad de texto sobre fondo suavizado
- [ ] **Badges / Tags**: contraste adecuado vs fondo

#### Smoke Testing

- [ ] **Cambio de tema**: verificar transición de light ↔ dark sin artefactos visuales
- [ ] **Navegación**: todas las rutas cargan con estilos correctos
- [ ] **Responsive**: validar en mobile (375px) que la intensidad de color sigue siendo legible

### QA / Validación Visual

#### Criterios de Aceptación

- [ ] **WCAG Compliance**: Todos los pares texto-fondo en light theme cumplen WCAG AA mínimo
- [ ] **Consistencia**: No existen "islas" visuales con colores diferentes por sección
- [ ] **Feedback visual**: Focus states (gold outline), hover states, active states siguen siendo claros
- [ ] **Dark theme intacto**: Las páginas en dark mode no se ven afectadas (sin regresiones)
- [ ] **No hardcodes detectados**: `grep -r "#ffffff\|#f8fafc" frontend/src/**/*.module.css` retorna 0 coincidencias en contextos que deberían heredar de tokens

---

## Notas de Implementación

### Supuestos

1. Se asume que `frontend/src/styles/globals.css` es la única fuente de verdad para light theme tokens.
2. Se asume que no existen overrides de tema en libraries externas (Tailwind, Bootstrap) — el proyecto usa CSS Modules exclusivamente (per `.github/instructions/frontend.instructions.md`).
3. Se asume que la opción B ya fue aprobada por el usuario antes de la implementación formal.

### Preguntas Abiertas

1. **¿Existen overrides de tema en providers o context de React que no sean globales?**
   - Si es así, verificar que NO conflictúen con los tokens CSS.
2. **¿La navbar tiene reglas especiales de brillo para mantener contraste con logo/texto?**
   - Confirmar que `--color-nav-bg` (que hereda de `--color-surface`) es tolerable.
3. **¿Se requiere validación A/B con usuarios finales antes de merge?**
   - Definir criterio de aceptación cuantitativo (ej. "sin quejas de fatiga en 95% de usuarios en sesión de 1h").

### Riesgos Técnicos (Bajo)

- **Mínimo**: No hay cambios en DB, API o lógica. Impacto puramente visual.
- **Regresión visual**: Mitigado con validación manual en todas las páginas admin + public.
- **Contraste fallido**: Mitigado con validación WCAG previa a implementación.

### Decisiones de Diseño

- Se elige ajustar tokens luz (en lugar de oscurecer dark theme) porque el requerimiento específico es "light theme demasiado brillante".
- Se elige una estrategia de "reducción suave" (no cambio radical) para minimizar sorpresas visuales a usuarios.
- Se prefiere centralizar todos los cambios en `:root` para garantizar coherencia y facilitar reversión si fuese necesario.

---

**Próximos pasos:**

1. **Frontend Developer:** Implementar la paleta Opción B en los tokens de light theme.
2. **Test Engineer Frontend:** Validar que no haya regresiones visuales o de estilos base.
3. **QA:** Validar visual en todas las páginas per checklist en sección 3.
