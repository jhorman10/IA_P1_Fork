# Escenarios Gherkin — SPEC-027: Rediseño Visual macOS Sonoma

> **Spec:** `.github/specs/macos-sonoma-visual-overhaul.spec.md`
> **Fecha:** 2026-04-09
> **Tipo de cambio:** Visual puro (22 archivos CSS). Cero cambios funcionales.
> **Tests existentes:** 573 pasando sin regresiones.

---

## Flujos Críticos Identificados

| # | Flujo | Tipo | Tags | HU |
|---|-------|------|------|----|
| 1 | Paleta macOS en tema claro | Happy path | `@happy-path @critico` | HU-01 |
| 2 | Glassmorphism navbar y modales (light) | Happy path | `@happy-path @critico` | HU-01 |
| 3 | Botones acento Apple blue | Happy path | `@happy-path @critico` | HU-01 |
| 4 | Tema oscuro capas macOS | Happy path | `@happy-path @critico` | HU-02 |
| 5 | Contraste WCAG AA en dark mode | Happy path | `@happy-path @accesibilidad` | HU-02 |
| 6 | Glassmorphism en dark mode | Happy path | `@happy-path @critico` | HU-02 |
| 7 | Hover con elevación sutil | Happy path | `@happy-path` | HU-03 |
| 8 | Focus ring Apple-style | Happy path | `@happy-path @accesibilidad` | HU-03 |
| 9 | Transición claro↔oscuro | Edge case | `@edge-case @critico` | HU-01/02 |
| 10 | Responsive multi-breakpoint | Edge case | `@edge-case @critico` | HU-01/02/03 |
| 11 | Compatibilidad backdrop-filter | Edge case | `@edge-case` | HU-01/02 |
| 12 | Cero regresión funcional | Regresión | `@smoke @regresion` | Todas |

---

## Escenarios Gherkin

```gherkin
#language: es
Característica: Rediseño Visual macOS Sonoma — Tema Claro

  Contexto:
    Dado que el usuario está autenticado en el sistema
    Y el tema claro está activado

  @happy-path @critico
  Escenario: Paleta macOS Sonoma en tema claro
    Cuando el usuario navega por cualquier pantalla del sistema
    Entonces el fondo global de la aplicación es "#F5F5F7"
    Y las superficies y cards tienen fondo "#FFFFFF"
    Y los bordes genéricos usan el color "#D1D1D6"
    Y el color de acento principal es "#007AFF" (Apple system blue)
    Y las sombras son ultra-difusas con opacidad menor o igual a 0.12
    Y el texto principal usa el color "#1D1D1F"
    Y el texto secundario usa el color "#86868B"

  @happy-path @critico
  Escenario: Navbar con glassmorphism en tema claro
    Dado que el usuario ve la barra de navegación
    Cuando hace scroll en la página
    Entonces el navbar muestra un fondo translúcido semitransparente
    Y el contenido por detrás del navbar se difumina con efecto blur
    Y el navbar NO tiene borde inferior dorado
    Y los links de navegación tienen bordes redondeados

  @happy-path @critico
  Escenario: Botones primarios con acento Apple blue
    Cuando el usuario observa cualquier botón primario (login, registrar, check-in)
    Entonces el botón usa fondo azul Apple como color base
    Y el botón NO muestra gradiente dorado
    Y el botón tiene bordes redondeados estilo Apple
    Y la tipografía del botón es semi-bold

  @happy-path
  Escenario: Hover en botón primario
    Cuando el usuario pasa el cursor sobre un botón primario
    Entonces el botón incrementa ligeramente su brillo
    Y el botón se eleva sutilmente con una transición suave
    Y la transición es menor o igual a 0.3 segundos

  @happy-path
  Escenario: Sombras difusas multi-capa en cards (light)
    Cuando el usuario observa las tarjetas del dashboard
    Entonces cada card muestra sombras difusas de múltiples capas
    Y las sombras tienen opacidad baja que no genera contraste duro
    Y los bordes de las cards son redondeados con radio consistente
```

```gherkin
#language: es
Característica: Rediseño Visual macOS Sonoma — Tema Oscuro

  Contexto:
    Dado que el usuario está autenticado en el sistema
    Y el tema oscuro está activado

  @happy-path @critico
  Escenario: Capas macOS en tema oscuro
    Cuando el usuario navega por cualquier pantalla del sistema
    Entonces el fondo base de la aplicación es "#000000"
    Y las superficies de capa 1 (cards) usan "#1C1C1E"
    Y las superficies de capa 2 usan "#2C2C2E"
    Y los bordes usan un tono luminoso sutil semitransparente blanco
    Y NO se usan sombras oscuras convencionales sino bordes luminosos

  @happy-path @critico
  Escenario: Acento azul adaptado para dark mode
    Cuando el usuario observa botones primarios, links activos y focus rings
    Entonces el color de acento es "#0A84FF" (Apple dark-adapted blue)
    Y el acento NO es "#007AFF" sin adaptar
    Y los elementos interactivos mantienen suficiente contraste sobre fondos oscuros

  @happy-path @accesibilidad
  Escenario: Contraste WCAG AA en cards oscuras
    Cuando el usuario observa tarjetas de citas en dark mode
    Entonces el texto normal tiene un ratio de contraste mayor o igual a 4.5:1
    Y el texto grande y elementos UI tienen un ratio de contraste mayor o igual a 3:1
    Y los badges de estado usan versiones de color adaptadas para fondos oscuros
    Y todos los textos son legibles sin esfuerzo visual

  @happy-path @critico
  Escenario: Glassmorphism en navbar dark mode
    Dado que el usuario ve la barra de navegación en dark mode
    Cuando hace scroll en la página
    Entonces el navbar muestra un fondo translúcido oscuro
    Y el contenido se difumina por detrás con efecto blur
    Y el borde usa un tono luminoso sutil semitransparente

  @happy-path @critico
  Escenario: Glassmorphism en modales dark mode
    Cuando el usuario abre el modal de perfil en dark mode
    Entonces el overlay de fondo tiene opacidad del 40%
    Y el modal muestra efecto glassmorphism con fondo translúcido oscuro
    Y el botón primario del modal usa acento azul adaptado

  @happy-path
  Escenario: Sombras reemplazadas por bordes luminosos en dark mode
    Cuando el usuario observa las cards del dashboard en dark mode
    Entonces las cards NO muestran sombras oscuras convencionales
    Y en su lugar usan bordes luminosos ultra-sutiles semitransparentes
    Y el efecto visual genera sensación de profundidad sin oscurecer los fondos
```

```gherkin
#language: es
Característica: Micro-interacciones Apple-style

  Contexto:
    Dado que el usuario está autenticado en el sistema

  @happy-path
  Escenario: Hover con elevación sutil en cards
    Cuando el usuario pasa el cursor sobre una tarjeta del dashboard
    Entonces la card se eleva visualmente 2 píxeles hacia arriba
    Y la sombra se intensifica progresivamente
    Y la transición usa una curva de animación natural tipo Apple
    Y la duración de la transición es menor o igual a 0.3 segundos

  @happy-path @accesibilidad
  Escenario: Focus ring Apple-style con teclado
    Dado que el usuario navega con el teclado
    Cuando hace focus en un input o botón
    Entonces se muestra un anillo de enfoque azul con separación de 2 píxeles
    Y el ring tiene color azul Apple semitransparente
    Y el anillo NO es el outline default del navegador

  @happy-path
  Escenario: Inputs con transición de focus
    Cuando el usuario hace click en un campo de texto
    Entonces el borde del input cambia a azul Apple
    Y se muestra un halo azul sutil alrededor del input
    Y la transición del borde es suave y natural

  @happy-path
  Escenario: Estado activo (pressed) en botones
    Cuando el usuario presiona un botón primario
    Entonces el botón reduce ligeramente su brillo
    Y regresa a su posición original (sin elevación)
    Y la respuesta visual es inmediata
```

```gherkin
#language: es
Característica: Transición de Temas y Consistencia Visual

  Contexto:
    Dado que el usuario está autenticado en el sistema

  @edge-case @critico
  Escenario: Transición de tema claro a oscuro sin artefactos
    Dado que el usuario tiene el tema claro activado
    Cuando cambia al tema oscuro
    Entonces todos los colores transicionan correctamente al tema oscuro
    Y no se observan destellos blancos ni parpadeos durante la transición
    Y no quedan elementos con colores del tema anterior
    Y el glassmorphism del navbar se adapta al nuevo tema
    Y los badges de estado actualizan sus colores adaptados

  @edge-case @critico
  Escenario: Transición de tema oscuro a claro sin artefactos
    Dado que el usuario tiene el tema oscuro activado
    Cuando cambia al tema claro
    Entonces todos los colores transicionan correctamente al tema claro
    Y no se observan flashes oscuros ni parpadeos
    Y las sombras difusas reemplazan los bordes luminosos
    Y el fondo vuelve a "#F5F5F7"

  @edge-case
  Escenario: Persistencia del tema seleccionado
    Dado que el usuario selecciona el tema oscuro
    Cuando recarga la página
    Entonces el tema oscuro se mantiene activo
    Y no se muestra un flash del tema claro antes de cargar el oscuro
```

```gherkin
#language: es
Característica: Responsive — Validación Multi-breakpoint

  Contexto:
    Dado que el usuario está autenticado en el sistema

  @edge-case @critico
  Esquema del escenario: Diseño macOS en viewport <ancho>px
    Dado que el navegador tiene un ancho de <ancho> píxeles
    Cuando el usuario navega por el dashboard
    Entonces los tokens de color macOS se aplican correctamente
    Y las cards mantienen sus bordes redondeados y sombras difusas
    Y el navbar muestra glassmorphism
    Y no hay elementos desbordados ni cortados
    Y el texto permanece legible
    Ejemplos:
      | ancho |
      | 375   |
      | 768   |
      | 1024  |
      | 1440  |

  @edge-case
  Escenario: Glassmorphism navbar en móvil (375px)
    Dado que el navegador tiene un ancho de 375 píxeles
    Cuando el usuario ve la barra de navegación
    Entonces el efecto glassmorphism se aplica correctamente
    Y los links de navegación son accesibles y legibles
    Y el menú se adapta al espacio disponible

  @edge-case
  Escenario: Cards del dashboard en tablet (768px)
    Dado que el navegador tiene un ancho de 768 píxeles
    Cuando el usuario ve el dashboard
    Entonces las metric cards se reorganizan según el grid responsive
    Y las sombras difusas y bordes redondeados se mantienen
    Y el hover de elevación funciona correctamente
```

```gherkin
#language: es
Característica: Compatibilidad de backdrop-filter

  @edge-case
  Escenario: Glassmorphism en navegador con soporte de backdrop-filter
    Dado que el usuario usa Chrome, Edge o Safari actualizado
    Cuando navega por la aplicación
    Entonces el navbar y modales muestran el efecto blur glassmorphism
    Y los fondos translúcidos se renderizan correctamente

  @edge-case
  Escenario: Fallback en navegador sin soporte de backdrop-filter
    Dado que el usuario usa un navegador que no soporta backdrop-filter
    Cuando navega por la aplicación
    Entonces el navbar y modales muestran un fondo sólido opaco como fallback
    Y la funcionalidad no se ve afectada
    Y la interfaz permanece usable
```

```gherkin
#language: es
Característica: Cero Regresión Funcional

  Contexto:
    Dado que el rediseño visual NO modifica lógica, IDs ni atributos data-*

  @smoke @regresion
  Escenario: Flujo de login sin regresión
    Dado que el usuario no está autenticado
    Cuando ingresa credenciales válidas y presiona el botón de login
    Entonces el sistema autentica al usuario correctamente
    Y lo redirige al dashboard
    Y el botón de login usa el nuevo estilo azul Apple

  @smoke @regresion
  Escenario: Flujo de dashboard sin regresión
    Dado que el usuario está autenticado como administrador
    Cuando accede al dashboard
    Entonces las métricas se cargan y muestran correctamente
    Y las tarjetas de citas se renderizan con datos reales
    Y los filtros y controles funcionan sin errores

  @smoke @regresion
  Escenario: Flujo de auditoría sin regresión
    Dado que el usuario está autenticado como administrador
    Cuando accede a la vista de auditoría
    Entonces la tabla de logs se carga correctamente
    Y los filtros de auditoría funcionan
    Y la paginación navega entre páginas sin errores

  @smoke @regresion
  Escenario: Flujo de doctor sin regresión
    Dado que el usuario está autenticado como doctor
    Cuando accede a su vista de doctor
    Entonces la tarjeta de estado del doctor se muestra correctamente
    Y puede cambiar su estado (disponible/ocupado)
    Y el selector de oficina funciona sin errores

  @smoke @regresion
  Escenario: Flujo de administración sin regresión
    Dado que el usuario está autenticado como administrador
    Cuando accede a las vistas de gestión (especialidades, oficinas)
    Entonces los formularios de creación y edición funcionan
    Y los botones de acción ejecutan las operaciones correctamente
    Y las notificaciones se muestran apropiadamente

  @smoke @regresion
  Escenario: Modal de perfil sin regresión
    Dado que el usuario está autenticado
    Cuando abre el modal de perfil desde el navbar
    Entonces el formulario de perfil se carga con los datos del usuario
    Y puede editar y guardar cambios
    Y el modal se cierra correctamente

  @smoke @regresion
  Escenario: Suite de tests existente pasa sin cambios
    Dado que existen 573 tests automatizados
    Cuando se ejecuta la suite completa de tests
    Entonces todos los 573 tests pasan exitosamente
    Y no se reportan regresiones
```

---

## Datos de Prueba

| Escenario | Campo / Aspecto | Valor válido | Valor inválido | Borde |
|-----------|-----------------|--------------|----------------|-------|
| Paleta light | Fondo global | `#F5F5F7` | Cualquier otro color (ej. `#F6F8FB` anterior) | — |
| Paleta light | Acento primario | `#007AFF` | `#C6A96B` (dorado anterior) | — |
| Paleta dark | Fondo base | `#000000` | `#0A0A0A` (anterior) | — |
| Paleta dark | Surface capa 1 | `#1C1C1E` | `#1E293B` (anterior) | — |
| Paleta dark | Acento dark | `#0A84FF` | `#007AFF` (no adaptado) | — |
| Contraste AA | Ratio texto normal | ≥ 4.5:1 | < 4.5:1 | 4.5:1 exacto |
| Contraste AA | Ratio texto grande | ≥ 3:1 | < 3:1 | 3:1 exacto |
| Hover cards | Elevación | `-2px` (translateY) | `0px` (sin elevación) | — |
| Transición | Duración hover | ≤ 0.3s | > 0.5s (perceptible) | 0.3s |
| Focus ring | Offset | `2px–3px` | `0px` (sin ring) | — |
| Glassmorphism | Blur | `20px` | `0px` (sin blur) | — |
| Responsive | Viewport 375px | Sin desbordamiento | Elementos cortados | 320px |
| Responsive | Viewport 1440px | Grid completo | — | — |

---

## Resumen de Cobertura

| Tipo | Cantidad | Tags |
|------|----------|------|
| Happy path | 14 | `@happy-path`, `@critico` |
| Edge case | 8 | `@edge-case` |
| Regresión | 7 | `@smoke`, `@regresion` |
| Accesibilidad | 3 | `@accesibilidad` |
| **Total** | **32** | — |
