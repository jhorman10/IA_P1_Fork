---
id: SPEC-027
status: IMPLEMENTED
feature: macos-sonoma-visual-overhaul
created: 2025-07-15
updated: 2025-07-15
author: spec-generator
version: "1.0"
related-specs:
  - SPEC-019
  - SPEC-026
---

# Spec: Rediseño Visual macOS Sonoma / Sequoia

> **Estado:** `DRAFT` → aprobar con `status: APPROVED` antes de iniciar implementación.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Rediseño visual completo (overhaul) del frontend para que luzca extremadamente moderno, estético, refinado y profesional, imitando la experiencia de usuario (UX) y la interfaz de usuario (UI) nativa de macOS Sonoma/Sequoia. El cambio es **exclusivamente estético** — cero modificaciones funcionales, de lógica, IDs, atributos `data-*` o flujos de usuario. Solo se modifican archivos CSS (tokens y CSS Modules).

### Requerimiento de Negocio
Transformar la identidad visual del frontend, reemplazando la paleta actual (dorada/slate) por el lenguaje de diseño de Apple: glassmorphism, tipografía SF Pro-like, paleta fría con acento azul `#007AFF`, sombras ultra-difusas, superficies translúcidas con `backdrop-filter: blur()`, bordes continuos redondeados y micro-interacciones sutiles.

### Historias de Usuario

#### HU-01: Percepción visual macOS en tema claro

```
Como:        Usuario autenticado
Quiero:      que la interfaz en modo claro luzca como una app nativa de macOS Sonoma
Para:        sentir una experiencia premium, moderna y confiable

Prioridad:   Alta
Estimación:  L
Dependencias: Ninguna
Capa:        Frontend (solo CSS)
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: Tema claro con paleta macOS
  Dado que:  el usuario tiene el tema claro activado
  Cuando:    navega por cualquier pantalla del sistema
  Entonces:  el fondo es #F5F5F7, las superficies/cards son #FFFFFF,
             los bordes son #D1D1D6, el acento principal es #007AFF,
             las sombras son ultra-difusas con baja opacidad
```

```gherkin
CRITERIO-1.2: Navbar con glassmorphism
  Dado que:  el usuario está autenticado y ve el navbar
  Cuando:    hace scroll en la página
  Entonces:  el navbar muestra un fondo translúcido (rgba(255,255,255,0.72))
             con backdrop-filter: blur(20px) y el contenido se difumina por detrás
```

```gherkin
CRITERIO-1.3: Botones con acento Apple blue
  Dado que:  se muestra cualquier botón primario (login, registrar, check-in)
  Cuando:    el usuario lo observa
  Entonces:  el botón usa fondo #007AFF (no gradiente dorado),
             border-radius Apple-style, y hover con brightness/opacity sutil
```

#### HU-02: Percepción visual macOS en tema oscuro

```
Como:        Usuario autenticado
Quiero:      que la interfaz en modo oscuro luzca como macOS Sonoma en dark mode
Para:        tener una experiencia visual coherente y de alta calidad en baja luminosidad

Prioridad:   Alta
Estimación:  L
Dependencias: HU-01
Capa:        Frontend (solo CSS)
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: Tema oscuro con capas macOS
  Dado que:  el usuario tiene el tema oscuro activado
  Cuando:    navega por cualquier pantalla
  Entonces:  el fondo base es #000000, las superficies son #1C1C1E (nivel 1)
             y #2C2C2E (nivel 2), los bordes usan rgba(255,255,255,0.1),
             NO se usan sombras oscuras sino bordes luminosos sutiles
```

```gherkin
CRITERIO-2.2: Cards oscuras sin mala legibilidad
  Dado que:  el usuario ve tarjetas de citas en dark mode
  Cuando:    observa el texto y los badges de estado
  Entonces:  el contraste cumple WCAG AA (ratio ≥ 4.5:1 para texto normal)
             y los colores de estado usan versiones oscuras designadas
```

```gherkin
CRITERIO-2.3: Glassmorphism en dark mode
  Dado que:  el usuario está en dark mode
  Cuando:    ve el navbar y modales
  Entonces:  los elementos glass usan rgba(28,28,30,0.72) con blur(20px)
             y bordes rgba(255,255,255,0.08)
```

#### HU-03: Micro-interacciones Apple-style

```
Como:        Usuario autenticado
Quiero:      que los elementos interactivos tengan transiciones sutiles y naturales
Para:        sentir fluidez y pulido similar a macOS

Prioridad:   Media
Estimación:  M
Dependencias: HU-01
Capa:        Frontend (solo CSS)
```

#### Criterios de Aceptación — HU-03

```gherkin
CRITERIO-3.1: Hover con elevación sutil
  Dado que:  el usuario pasa el cursor sobre una card
  Cuando:    el hover se activa
  Entonces:  la card se eleva con translateY(-2px) + sombra progresiva,
             la transición usa cubic-bezier Apple (0.25,0.1,0.25,1), ≤ 0.3s
```

```gherkin
CRITERIO-3.2: Focus ring Apple-style
  Dado que:  el usuario navega con teclado o hace focus en un input
  Cuando:    el focus ring se muestra
  Entonces:  se renderiza un ring offset de 2px con color rgba(0,122,255,0.35)
             en vez del outline default del browser
```

### Reglas de Negocio
1. **CERO cambios funcionales**: no alterar ni eliminar lógica, IDs (`id`), atributos de datos (`data-*`), clases CSS referenciadas en TSX por nombre de módulo, ni flujos de usuario.
2. **Solo archivos CSS**: se modifican `.css` existentes; no se crean ni eliminan archivos TSX.
3. **Acento principal**: `#007AFF` (Apple system blue) reemplaza `--gold: #c6a96b` como acento de botones, links activos, focus rings y badges primarios.
4. **Glassmorphism**: navbar y modales usan `backdrop-filter: blur(20px)` con fondos semi-transparentes; en dark mode se usa `rgba(28,28,30,0.72)`.
5. **Sombras difusas**: light mode usa sombras multi-capas con opacidad ≤ 0.12; dark mode reemplaza sombras por bordes luminosos `rgba(255,255,255,0.06-0.1)`.
6. **Tipografía**: stack de fuentes `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", sans-serif`.
7. **Contraste mínimo WCAG AA**: ratio ≥ 4.5:1 para texto normal, ≥ 3:1 para texto grande y elementos UI.
8. **Responsive**: todos los breakpoints actuales se preservan sin cambios.

---

## 2. DISEÑO

### Modelos de Datos
_No aplica — este feature es exclusivamente visual/CSS. Cero cambios en backend, API, base de datos o modelos._

### API Endpoints
_No aplica._

### Diseño Frontend

#### Paleta de Color — Design Tokens

##### Tema Claro (`:root`)
| Token | Valor actual | Valor nuevo | Uso |
|-------|-------------|-------------|-----|
| `--background` | `#f6f8fb` | `#f5f5f7` | Fondo global |
| `--foreground` | `#111827` | `#1d1d1f` | Texto body |
| `--gold` | `#c6a96b` | `#007aff` | Acento principal (Apple blue) |
| `--border` | `#e5e7eb` | `#d1d1d6` | Bordes genéricos |
| `--color-surface` | `#fcfcfd` | `#ffffff` | Cards y superficies |
| `--color-surface-alt` | `#f1f4f8` | `#f2f2f7` | Superficies secundarias |
| `--color-surface-tertiary` | `#eef2f7` | `#e5e5ea` | Superficies terciarias |
| `--color-text-primary` | `#0b1324` | `#1d1d1f` | Texto principal |
| `--color-text-secondary` | `#475569` | `#86868b` | Texto secundario |
| `--color-text-tertiary` | `#94a3b8` | `#aeaeb2` | Texto terciario |
| `--color-border` | `#e2e8f0` | `#d1d1d6` | Bordes semánticos |
| `--color-border-light` | `#f1f5f9` | `#e5e5ea` | Bordes ligeros |
| `--color-primary` | `#2563eb` | `#007aff` | Color primario |
| `--color-blue-600` | `#2563eb` | `#007aff` | Azul brand |
| `--color-green-500` | `#22c55e` | `#30d158` | Verde Apple |
| `--color-red-600` | `#dc2626` | `#ff3b30` | Rojo Apple |
| `--color-amber-500` | `#f59e0b` | `#ff9f0a` | Ámbar Apple |

##### Tema Oscuro (`html[data-theme="dark"]`)
| Token | Valor actual | Valor nuevo | Uso |
|-------|-------------|-------------|-----|
| `--background` | `#0a0a0a` | `#000000` | Fondo base |
| `--foreground` | `#ededed` | `#f5f5f7` | Texto body |
| `--border` | `#334155` | `rgba(255,255,255,0.1)` | Bordes luminosos |
| `--color-surface` | `#1e293b` | `#1c1c1e` | Cards capa 1 |
| `--color-surface-alt` | `#0f172a` | `#2c2c2e` | Superficies capa 2 |
| `--color-surface-tertiary` | `#334155` | `#3a3a3c` | Superficies capa 3 |
| `--color-text-primary` | `#f1f5f9` | `#f5f5f7` | Texto sobre dark |
| `--color-text-secondary` | `#94a3b8` | `#98989d` | Texto secundario |
| `--color-text-tertiary` | `#64748b` | `#636366` | Texto terciario |
| `--color-border` | `#334155` | `rgba(255,255,255,0.1)` | Bordes luminosos sutiles |
| `--color-primary` | `#3b82f6` | `#0a84ff` | Azul primario dark |
| `--color-blue-600` | _no override_ | `#0a84ff` | Azul dark-adapted |
| `--color-red-600` | _no override_ | `#ff453a` | Rojo dark-adapted |

##### Sombras macOS
| Token | Valor actual | Valor nuevo (light) |
|-------|-------------|---------------------|
| `--shadow-sm` | `0 2px 8px rgba(15,23,42,0.06)` | `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)` |
| `--shadow-md` | `0 4px 16px rgba(15,23,42,0.08)` | `0 4px 14px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)` |
| `--shadow-lg` | `0 8px 28px rgba(15,23,42,0.1)` | `0 10px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)` |
| `--shadow-xl` | `0 12px 48px rgba(15,23,42,0.12)` | `0 24px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.06)` |

| Token | Valor actual (dark) | Valor nuevo (dark) |
|-------|--------------------|--------------------|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.3)` | `0 0 0 0.5px rgba(255,255,255,0.06)` |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.4)` | `0 0 0 0.5px rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.3)` |
| `--shadow-lg` | `0 8px 28px rgba(0,0,0,0.5)` | `0 0 0 0.5px rgba(255,255,255,0.08), 0 10px 40px rgba(0,0,0,0.35)` |
| `--shadow-xl` | `0 12px 48px rgba(0,0,0,0.6)` | `0 0 0 0.5px rgba(255,255,255,0.1), 0 24px 60px rgba(0,0,0,0.45)` |

##### Nuevos tokens a agregar
| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--radius-xl` | `22px` | ­— | Radio extra-grande para modales |
| `--glass-bg` | `rgba(255,255,255,0.72)` | `rgba(28,28,30,0.72)` | Fondo glassmorphism |
| `--glass-bg-heavy` | `rgba(255,255,255,0.88)` | `rgba(44,44,46,0.88)` | Fondo glass opaco |
| `--glass-border` | `rgba(255,255,255,0.5)` | `rgba(255,255,255,0.08)` | Borde glass |
| `--glass-blur` | `20px` | `20px` | Intensidad de blur |

##### Navbar tokens actualizados
| Token | Light nuevo | Dark nuevo |
|-------|------------|------------|
| `--color-nav-bg` | `rgba(255,255,255,0.72)` | `rgba(28,28,30,0.72)` |
| `--color-nav-link-hover-bg` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` |
| `--color-nav-link-active-bg` | `rgba(0,122,255,0.1)` | `rgba(0,122,255,0.18)` |
| `--color-nav-link-active-text` | `#007aff` | `#0a84ff` |

##### Dashboard semantic tokens actualizados
Misma estructura de 16 tokens, recalculados con la paleta Apple:
- **Info**: surface `#e8f2ff`, border `#b3d4ff`, text `#0055b3` (dark: `rgba(0,122,255,0.12)` / `#64b5ff`)
- **Warning**: surface `#fff8eb`, border `#fde68a`, text `#92400e` (dark: `rgba(255,159,10,0.12)` / `#ffd60a`)
- **Success**: surface `#edfcf2`, border `#a8f0c4`, text `#1b6d30` (dark: `rgba(48,209,88,0.12)` / `#30d158`)
- **Danger**: surface `#fff0f0`, border `#ffb3ae`, text `#d70015` (dark: `rgba(255,59,48,0.12)` / `#ff6961`)

#### Archivos CSS a modificar (inventario completo)

| # | Archivo | Cambios principales |
|---|---------|-------------------|
| 1 | `src/styles/globals.css` | Reescribir TODOS los design tokens según tablas anteriores |
| 2 | `src/styles/page.module.css` | Cards Apple-style, sombras difusas, radios continuos, badges con nueva paleta, hover `translateY(-2px)` + sombra progresiva |
| 3 | `src/components/Navbar/Navbar.module.css` | Glassmorphism (backdrop-filter blur), eliminar `border-bottom: 2px solid var(--gold)` → borde bottom `rgba` sutil, links redondeados |
| 4 | `src/components/LoginForm/LoginForm.module.css` | Botón `#007AFF` flat (no gradiente gold), glassmorphism en card, sombra xl difusa |
| 5 | `src/components/MetricCard/MetricCard.module.css` | Bordes redondeados 16px, sombras difusas, hover elevación 2px |
| 6 | `src/components/MetricsGrid/MetricsGrid.module.css` | Gap + padding aumentado para más whitespace |
| 7 | `src/components/AppointmentRegistrationForm/AppointmentRegistrationForm.module.css` | Botón #007AFF flat, focus ring azul, radius Apple |
| 8 | `src/components/DoctorStatusCard/DoctorStatusCard.module.css` | Buttons #007AFF, badge radius pill, sombras difusas |
| 9 | `src/components/DoctorStatusCard/OfficeSelector.module.css` | Focus ring Apple blue, botón #007AFF |
| 10 | `src/components/AuditLogTable/AuditLogTable.module.css` | Table border-radius, header fondo `--color-surface-alt`, paginación Apple-style |
| 11 | `src/components/AuditFilters/AuditFilters.module.css` | Focus ring `#007AFF`, inputs redondeados |
| 12 | `src/components/ProfileFormModal/ProfileFormModal.module.css` | Overlay oscuro 40%, modal con glassmorphism, botón #007AFF flat |
| 13 | `src/components/WebSocketStatus.module.css` | Pill badge con radios Apple, fondo glass sutil |
| 14 | `src/components/AssignmentNotification/AssignmentNotification.module.css` | Banner con glassmorphism + shadow xl |
| 15 | `src/components/AppointmentSkeleton.module.css` | Shimmer tokens Apple + radius uniformes |
| 16 | `src/components/DoctorInfo/DoctorInfo.module.css` | Surface-alt fondo, radius Apple |
| 17 | `src/components/QueuePositionBadge/QueuePositionBadge.module.css` | Pill badge Apple |
| 18 | `src/components/RoleGate/RoleGate.module.css` | Texto y fondo Apple |
| 19 | `src/components/FormLoadingOverlay.module.css` | Spinner con color #007AFF, fondo glass |
| 20 | `src/components/AuthHydrationBoundary/AuthHydrationBoundary.module.css` | Spinner #007AFF |
| 21 | `src/components/SpecialtyManager/SpecialtyManager.module.css` | Botones #007AFF flat, focus ring azul, radius Apple |
| 22 | `src/components/OfficeManager/OfficeManager.module.css` | Botones #007AFF flat, focus ring azul, input radius Apple |

#### Patrones de diseño recurrentes

**1. Botones primarios (reemplaza gradiente dorado)**
```css
/* ANTES */
background: linear-gradient(135deg, var(--gold), #b89652);
/* DESPUÉS */
background: var(--color-primary);
border-radius: var(--radius-md);
font-weight: var(--font-weight-semibold);
transition: filter var(--duration-short) var(--ease-standard);
/* Hover: */
filter: brightness(1.08);
transform: translateY(-1px);
/* Active: */
filter: brightness(0.95);
transform: translateY(0);
```

**2. Cards (patrón Apple card)**
```css
background: var(--color-surface);
border: 1px solid var(--color-border);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-sm);
transition: box-shadow var(--duration-standard) var(--ease-standard),
            transform var(--duration-standard) var(--ease-standard);
/* Hover: */
box-shadow: var(--shadow-md);
transform: translateY(-2px);
```

**3. Focus ring Apple-style**
```css
/* ANTES */
border-color: var(--gold);
box-shadow: 0 0 0 2px rgba(198, 169, 107, 0.15);
/* DESPUÉS */
border-color: var(--color-primary);
box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.25);
outline: none;
```

**4. Glassmorphism (navbar/modales)**
```css
background: var(--glass-bg);
-webkit-backdrop-filter: blur(var(--glass-blur));
backdrop-filter: blur(var(--glass-blur));
border-bottom: 0.5px solid var(--glass-border);
```

**5. Inputs Apple-style**
```css
border-radius: var(--radius-sm);
border: 1px solid var(--color-input-border);
padding: 10px 14px;
font-size: 14px;
transition: border-color var(--duration-short) var(--ease-standard),
            box-shadow var(--duration-short) var(--ease-standard);
/* Focus */
border-color: var(--color-primary);
box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.25);
```

#### Componentes nuevos
_Ninguno — solo se modifican CSS Modules existentes._

#### Páginas nuevas
_Ninguna._

#### Hooks y State
_Ninguno._

#### Services
_Ninguno._

### Arquitectura y Dependencias
- **Paquetes nuevos**: ninguno.
- **Servicios externos**: ninguno.
- **Impacto en punto de entrada**: ninguno. El `layout.tsx` no requiere cambios (Inter + ThemeProvider ya están configurados).
- **Compatibilidad**: `backdrop-filter` tiene soporte >95% en navegadores modernos; `-webkit-backdrop-filter` se incluye como fallback para Safari.

### Notas de Implementación

> **REGLA ESTRICTA — CERO CAMBIOS FUNCIONALES**
> - No alterar, eliminar ni añadir IDs, atributos `data-*`, clases CSS (nombres de selector), ni flujos de usuario.
> - No modificar archivos `.tsx`, `.ts`, `.js`, `.jsx`.
> - Solo modificar archivos `.css`.
> - Preservar TODOS los selectores CSS existentes; cambiar únicamente propiedades y valores.
> - Preservar TODOS los breakpoints responsivos; ajustar valores estéticos dentro de los mismos.
> - Preservar animaciones `@keyframes` existentes; ajustar timing/easing si aplica.

> **Orden de implementación recomendado:**
> 1. `globals.css` — fundamento de tokens que cascadean a toda la app.
> 2. `Navbar.module.css` — glassmorphism, primer impacto visual.
> 3. `page.module.css` — dashboard completo.
> 4. `LoginForm.module.css` — primera impresión del usuario.
> 5. Resto de componentes en cualquier orden.

> **Decisiones de diseño:**
> - `--gold` se redefine como `#007AFF` para mantener compatibilidad con todos los archivos CSS que ya lo referencian, sin necesidad de renombrar la variable en TSX.
> - En dark mode, el acento azul se adapta a `#0A84FF` (Apple dark-adapted blue) para mayor legibilidad en fondos oscuros.
> - Las sombras en dark mode se reemplazan por bordes luminosos ultra-sutiles (`0 0 0 0.5px rgba(255,255,255,...)`) en lugar de sombras oscuras que se pierden.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.

### Backend
_No aplica — cero cambios de backend._

### Frontend

#### Implementación — Tokens
- [ ] Reescribir `:root` en `globals.css` con paleta macOS Sonoma light (tabla de tokens)
- [ ] Reescribir `html[data-theme="dark"]` en `globals.css` con paleta macOS Sonoma dark
- [ ] Agregar nuevos tokens glassmorphism (`--glass-bg`, `--glass-bg-heavy`, `--glass-border`, `--glass-blur`)
- [ ] Agregar `--radius-xl: 22px`
- [ ] Actualizar curvas de animación a Apple spring (`--ease-standard`, `--ease-emphasized`)
- [ ] Actualizar sombras light (multi-capa difusas) y dark (bordes luminosos)
- [ ] Actualizar dashboard semantic tokens con paleta Apple
- [ ] Actualizar skeleton tokens con paleta Apple
- [ ] Agregar `font-family: var(--font-stack)` al body

#### Implementación — Componentes (22 archivos CSS)
- [ ] `Navbar.module.css` — glassmorphism, eliminar gold border, links Apple-style
- [ ] `page.module.css` — cards Apple, badges nueva paleta, sombras difusas, hover `-2px`
- [ ] `LoginForm.module.css` — botón `#007AFF` flat, card glass, sombra xl
- [ ] `MetricCard.module.css` — radius 16px, sombras difusas, hover elevación
- [ ] `MetricsGrid.module.css` — incrementar gap/padding whitespace
- [ ] `AppointmentRegistrationForm.module.css` — botón #007AFF flat, focus ring azul
- [ ] `DoctorStatusCard.module.css` — buttons #007AFF, pill badges, sombras difusas
- [ ] `OfficeSelector.module.css` — focus ring Apple blue, botón #007AFF
- [ ] `AuditLogTable.module.css` — table radius, header surface-alt, paginación Apple
- [ ] `AuditFilters.module.css` — focus ring #007AFF, inputs redondeados
- [ ] `ProfileFormModal.module.css` — overlay 40%, modal glass, botón #007AFF flat
- [ ] `WebSocketStatus.module.css` — pill badge Apple, fondo glass sutil
- [ ] `AssignmentNotification.module.css` — banner glass + shadow xl
- [ ] `AppointmentSkeleton.module.css` — shimmer Apple + radius uniformes
- [ ] `DoctorInfo.module.css` — surface-alt, radius Apple
- [ ] `QueuePositionBadge.module.css` — pill badge Apple
- [ ] `RoleGate.module.css` — texto y fondo Apple
- [ ] `FormLoadingOverlay.module.css` — spinner #007AFF, fondo glass
- [ ] `AuthHydrationBoundary.module.css` — spinner #007AFF
- [ ] `SpecialtyManager.module.css` — botones #007AFF flat, focus ring azul
- [ ] `OfficeManager.module.css` — botones #007AFF flat, focus ring azul

### Tests Frontend
- [ ] Ejecutar suite completa de tests — verificar que ningún test se rompe (solo cambios CSS)
- [ ] Verificar contraste WCAG AA en light mode (ratio ≥ 4.5:1 texto normal)
- [ ] Verificar contraste WCAG AA en dark mode (ratio ≥ 4.5:1 texto normal)
- [ ] Verificar que `backdrop-filter` se renderiza en Chrome, Firefox y Safari
- [ ] Verificar responsive en viewport 375px, 768px, 1024px, 1440px

### QA
- [ ] Inspección visual en tema claro — todas las pantallas
- [ ] Inspección visual en tema oscuro — todas las pantallas
- [ ] Verificar transición claro ↔ oscuro sin artefactos
- [ ] Verificar que ningún flujo funcional se alteró
- [ ] Verificar legibilidad de badges de estado en ambos temas
- [ ] Verificar glassmorphism navbar al hacer scroll
- [ ] Verificar glassmorphism modal al abrir ProfileFormModal
