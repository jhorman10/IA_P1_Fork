# Matriz de Riesgos ASD — SPEC-027: Rediseño Visual macOS Sonoma

> **Spec:** `.github/specs/macos-sonoma-visual-overhaul.spec.md`
> **Fecha:** 2026-04-09
> **Tipo de cambio:** Visual puro (22 archivos CSS). Cero cambios funcionales.

---

## Resumen

| Nivel | Cantidad | Acción |
|-------|----------|--------|
| **Alto (A)** | 3 | Testing OBLIGATORIO — bloquea release |
| **Medio (S)** | 4 | Testing RECOMENDADO — documentar si se omite |
| **Bajo (D)** | 2 | Testing OPCIONAL — priorizar en backlog |
| **Total** | **9** | — |

---

## Detalle de Riesgos

| ID | HU | Descripción del Riesgo | Factores | Probabilidad | Impacto | Nivel | Testing |
|----|-----|------------------------|----------|-------------|---------|-------|---------|
| R-001 | HU-01/02 | Regresión visual masiva por modificación simultánea de 22 archivos CSS | Código nuevo sin historial, muchas dependencias, alta frecuencia de uso | Alta | Alto | **A** | Obligatorio |
| R-002 | HU-01/02 | Incumplimiento de contraste WCAG AA con la nueva paleta | Obligación de accesibilidad, nueva paleta no validada en todos los contextos | Media | Alto | **A** | Obligatorio |
| R-003 | HU-01/02 | Ruptura funcional involuntaria (IDs, data-*, selectores CSS) | 22 archivos cambiados, riesgo de alterar selector por error | Baja | Crítico | **A** | Obligatorio |
| R-004 | HU-01/02 | Incompatibilidad de `backdrop-filter` en navegadores antiguos | Dependencia de feature CSS no universal | Media | Medio | **S** | Recomendado |
| R-005 | HU-03 | Degradación de rendimiento por `backdrop-filter: blur()` en dispositivos de gama baja | Composición GPU intensiva, múltiples elementos glass | Media | Medio | **S** | Recomendado |
| R-006 | HU-01/02 | Artefactos visuales en transición claro↔oscuro | Tokens CSS que no transicionan (backdrop-filter, sombras complejas) | Media | Bajo | **S** | Recomendado |
| R-007 | HU-01/02 | Inconsistencia de tokens entre globals.css y CSS Modules | 22 archivos deben referenciar los mismos tokens consistentemente | Media | Medio | **S** | Recomendado |
| R-008 | HU-03 | Micro-interacciones imperceptibles o excesivas en diferentes pantallas | Percepción subjetiva, varía por monitor/dispositivo | Baja | Bajo | **D** | Opcional |
| R-009 | HU-01 | Diferencias sutiles en renderizado de sombras/blur entre Chrome, Firefox y Safari | Implementaciones de rendering engine distintas | Baja | Bajo | **D** | Opcional |

---

## Plan de Mitigación — Riesgos ALTO (A)

### R-001: Regresión visual masiva por modificación simultánea de 22 archivos CSS

**Descripción detallada:**
El cambio afecta 22 archivos CSS simultáneamente, incluyendo `globals.css` (tokens raíz que cascadean a toda la aplicación). Un error en un token podría propagarse a todos los componentes. Al ser código nuevo sin historial de estabilidad, no hay baseline visual previa con la paleta macOS.

**Mitigación:**
- Ejecutar la suite completa de 573 tests antes y después del cambio para detectar regresiones funcionales indirectas
- Realizar inspección visual manual de TODAS las pantallas en ambos temas (claro y oscuro)
- Verificar cada uno de los 22 archivos CSS contra la spec (tabla de tokens)
- Usar screenshots comparativos antes/después por pantalla y breakpoint
- Implementar en orden: `globals.css` primero, verificar cascada, luego componentes uno a uno

**Tests obligatorios:**
- Smoke test visual: todas las pantallas en tema claro
- Smoke test visual: todas las pantallas en tema oscuro
- Suite automatizada completa (573 tests — 0 fallos)
- Inspección de tokens CSS: verificar que cada token nuevo tiene el valor correcto

**Bloqueante para release:** ✅ Sí

---

### R-002: Incumplimiento de contraste WCAG AA con la nueva paleta

**Descripción detallada:**
La paleta macOS Sonoma introduce nuevos colores de texto (`#86868B` secundario, `#AEAEB2` terciario) y fondos (`#F5F5F7`, `#1C1C1E`). Combinaciones específicas podrían no alcanzar el ratio mínimo WCAG AA (4.5:1 texto normal, 3:1 texto grande/UI). En dark mode, el texto secundario `#98989D` sobre `#1C1C1E` y `#636366` terciario sobre `#2C2C2E` son las combinaciones de mayor riesgo.

**Análisis de combinaciones críticas:**

| Combinación | Texto | Fondo | Ratio estimado | Cumple AA |
|-------------|-------|-------|----------------|-----------|
| Texto principal light | `#1D1D1F` | `#F5F5F7` | ~17.2:1 | ✅ Sí |
| Texto secundario light | `#86868B` | `#FFFFFF` | ~3.9:1 | ⚠️ Límite — falla para texto normal |
| Texto terciario light | `#AEAEB2` | `#FFFFFF` | ~2.6:1 | ❌ Falla para texto normal |
| Texto principal dark | `#F5F5F7` | `#000000` | ~19.4:1 | ✅ Sí |
| Texto secundario dark | `#98989D` | `#1C1C1E` | ~4.7:1 | ✅ Sí (ajustado) |
| Texto terciario dark | `#636366` | `#2C2C2E` | ~2.5:1 | ❌ Falla para texto normal |

**Mitigación:**
- Auditar TODAS las combinaciones texto/fondo con herramienta de contraste (axe, Lighthouse, WebAIM Contrast Checker)
- Para texto terciario (`#AEAEB2` light / `#636366` dark): verificar que solo se use en texto grande (≥18px o ≥14px bold) donde el umbral es 3:1
- Para texto secundario light (`#86868B`): verificar que sobre `#F5F5F7` fondo (no `#FFFFFF`) el ratio mejora a ~4.3:1 — puede requerir ajuste a un gris más oscuro
- Documentar cada combinación con su ratio medido
- Si alguna combinación falla, proponer alternativa más oscura/clara manteniendo la estética macOS

**Tests obligatorios:**
- Auditoría de contraste con axe-core o Lighthouse en TODAS las pantallas (light y dark)
- Verificación manual de badges de estado en ambos temas
- Verificación de texto terciario: confirmar que solo se usa en tamaños ≥18px

**Bloqueante para release:** ✅ Sí

---

### R-003: Ruptura funcional involuntaria

**Descripción detallada:**
Aunque la spec indica explícitamente "cero cambios funcionales" y solo archivos CSS, la modificación de 22 archivos aumenta la probabilidad de un error accidental: eliminar una clase CSS que se referencia en TSX por CSS Modules, renombrar un selector, o alterar un `display`/`visibility` que afecte la lógica de UI. Además, cambios en `z-index`, `pointer-events` o `overflow` podrían bloquear interacciones.

**Mitigación:**
- Ejecutar los 573 tests automatizados como gate de validación — cualquier fallo bloquea
- Verificar que NINGÚN archivo `.tsx`, `.ts`, `.js` o `.jsx` fue modificado
- Revisión de diff: verificar que solo se cambiaron propiedades CSS de estilo (color, background, border, shadow, radius, filter, transform) y NO propiedades funcionales (display, visibility, pointer-events, z-index, overflow, position)
- Smoke test manual de flujos críticos: login, dashboard, auditoría, doctor, admin, perfil

**Tests obligatorios:**
- Suite automatizada completa (573 tests — 0 fallos esperados)
- Smoke test funcional: login con credenciales válidas e inválidas
- Smoke test funcional: navegación entre todas las vistas
- Smoke test funcional: operaciones CRUD en admin (especialidades, oficinas)
- Verificación: `git diff --name-only` solo muestra archivos `.css`

**Bloqueante para release:** ✅ Sí

---

## Plan de Mitigación — Riesgos MEDIO (S)

### R-004: Incompatibilidad de `backdrop-filter` en navegadores antiguos

**Descripción:**
`backdrop-filter` tiene soporte >95% en navegadores modernos pero falla en Firefox < 103 y navegadores legacy. Usuarios con navegadores antiguos verían navbar y modales sin efecto blur.

**Probabilidad:** Media — depende del perfil de usuarios del sistema.

**Mitigación:**
- Incluir prefijo `-webkit-backdrop-filter` como fallback para Safari (ya contemplado en spec)
- Verificar que los fondos `rgba` semi-transparentes son usables sin blur (el contenido no se vuelve ilegible)
- Implementar `@supports (backdrop-filter: blur(1px))` para aplicar estilos glass solo si hay soporte
- Documentar navegadores mínimos soportados

**Tests recomendados:**
- Verificar glassmorphism en Chrome, Firefox (≥103) y Safari
- Verificar fallback visual deshabilitando `backdrop-filter` en DevTools

---

### R-005: Degradación de rendimiento por `backdrop-filter: blur()` en dispositivos de gama baja

**Descripción:**
`backdrop-filter: blur(20px)` requiere composición GPU. Aplicado a navbar (persistente en viewport) y modales, puede causar jank/stuttering durante scroll en dispositivos con GPU limitada (laptops antiguas, tablets económicas).

**Probabilidad:** Media — el navbar glass es visible constantemente durante scroll.

**Mitigación:**
- Medir FPS durante scroll con DevTools Performance en dispositivo de referencia de gama baja
- Considerar `will-change: transform` en elementos glass para hint de GPU
- Si se detecta degradación: reducir blur a `10px` o usar `@media (prefers-reduced-motion)` para desactivar blur
- Verificar que no hay layout thrashing (recalculations) por las sombras multi-capa

**Tests recomendados:**
- Profile de rendimiento en Chrome DevTools: scroll FPS con navbar glass
- Verificar que no hay repaints excesivos en la capa del navbar

---

### R-006: Artefactos visuales en transición claro↔oscuro

**Descripción:**
Los tokens de `backdrop-filter`, sombras multi-capa y bordes `rgba` pueden no transicionar suavemente entre temas si el cambio es instantáneo (swap de atributo `data-theme`). Posibles flashes blancos/negros durante 1-2 frames.

**Probabilidad:** Media — depende de cómo ThemeProvider actualiza el atributo.

**Mitigación:**
- Verificar que `transition` en `:root` cubre `background-color`, `color`, `border-color`
- Probar transición en ambas direcciones (claro→oscuro y oscuro→claro) en dispositivo real
- Verificar que no hay FOUC (Flash of Unstyled Content) al recargar con tema oscuro

**Tests recomendados:**
- Toggle rápido de tema 5 veces consecutivas — verificar ausencia de artefactos
- Recarga de página con tema oscuro activo — sin flash de tema claro

---

### R-007: Inconsistencia de tokens entre globals.css y CSS Modules

**Descripción:**
22 archivos CSS deben referenciar tokens definidos en `globals.css`. Si algún archivo usa un valor hardcodeado en vez del token, o referencia un token eliminado/renombrado, habrá inconsistencia visual.

**Probabilidad:** Media — 22 archivos es un surface area amplio.

**Mitigación:**
- Grep de valores hardcodeados en todos los CSS Modules: buscar `#c6a96b`, `#2563eb`, `#f6f8fb` (valores anteriores)
- Verificar que todos los archivos usan `var(--token)` en lugar de valores directos para colores, sombras y radios
- Checklist de revisión por archivo vs tabla de tokens de la spec

**Tests recomendados:**
- Búsqueda automatizada de valores hex de la paleta anterior en todos los `.css`
- Revisión visual de cada componente para verificar consistencia de colores

---

## Plan de Mitigación — Riesgos BAJO (D)

### R-008: Micro-interacciones imperceptibles o excesivas

**Descripción:**
La elevación de `translateY(-2px)` y el `brightness(1.08)` pueden ser imperceptibles en pantallas grandes o excesivos en pantallas pequeñas de alta densidad. Es un riesgo estético sin impacto funcional.

**Probabilidad:** Baja.  
**Impacto:** Bajo — solo afecta la percepción estética.

**Mitigación opcional:**
- Revisión visual subjetiva en al menos 2 resoluciones diferentes

---

### R-009: Diferencias de renderizado cross-browser

**Descripción:**
Las sombras multi-capa, `backdrop-filter: blur()`, y bordes `0.5px` pueden renderizarse ligeramente diferente entre Chrome (Blink), Firefox (Gecko) y Safari (WebKit). Los bordes de `0.5px` podrían no renderizarse en algunos engines.

**Probabilidad:** Baja.  
**Impacto:** Bajo — diferencias cosméticas menores.

**Mitigación opcional:**
- Verificación visual en Chrome y Firefox como mínimo
- Documentar diferencias aceptables

---

## Resumen de Testing Requerido

| Prioridad | Tipo de Test | Riesgos cubiertos | Obligatorio |
|-----------|-------------|-------------------|-------------|
| 1 | Suite automatizada (573 tests) | R-001, R-003 | ✅ |
| 2 | Inspección visual light + dark (todas las pantallas) | R-001, R-007 | ✅ |
| 3 | Auditoría de contraste WCAG AA | R-002 | ✅ |
| 4 | Smoke test funcional (login, dashboard, audit, doctor, admin) | R-003 | ✅ |
| 5 | Verificación de diff (solo archivos .css) | R-003 | ✅ |
| 6 | Test cross-browser glassmorphism | R-004, R-009 | Recomendado |
| 7 | Profile de rendimiento scroll + blur | R-005 | Recomendado |
| 8 | Test transición de temas | R-006 | Recomendado |
| 9 | Grep de valores hardcodeados (paleta anterior) | R-007 | Recomendado |

---

## Criterio de Release

- **GO:** 573 tests pasan + 0 riesgos ALTO abiertos + auditoría WCAG AA aprobada + inspección visual completa
- **NO-GO:** Cualquier test falla + ratio WCAG AA < 4.5:1 en texto normal + archivo no-CSS modificado
