---
id: SPEC-026
status: IMPLEMENTED
feature: dashboard-dark-mode-card-legibility
created: 2026-04-09
updated: 2026-04-09
author: spec-generator
version: "1.0"
related-specs:
  - SPEC-003
  - SPEC-012
  - SPEC-019
---

# Spec: Legibilidad y Consistencia Visual de Cards del Dashboard en Dark Mode

> **Estado:** `IMPLEMENTED` → implementación, pruebas frontend y evidencia QA completadas para el follow-up visual.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Corregir la legibilidad y consistencia visual de las cards y superficies del Dashboard operativo en `/dashboard` cuando el tema activo es dark mode. El ajuste es exclusivamente de frontend: debe mejorar cards, badges, textos, bordes, skeletons, overlays y feedback visual asociados al Dashboard sin cambiar datos, comportamiento funcional, WebSocket, audio ni lógica de negocio.

### Requerimiento de Negocio

Fuente principal: solicitud explícita del usuario.

> "Las cards en el modo oscuro no se ven bien, pantalla /dashboard".

Observaciones derivadas del estado actual del frontend:

- `/dashboard` reutiliza estilos compartidos en `frontend/src/styles/page.module.css` para layout, cards y badges.
- Las cards de estados `waiting` y `called` mezclan `--color-surface` dark con tokens tonales claros como `--color-amber-50` y `--color-blue-50`, que hoy no tienen equivalentes calibrados en `html[data-theme="dark"]` para este caso de uso.
- El hover principal de las cards usa un overlay blanco translúcido hardcodeado (`rgba(255, 255, 255, 0.4)`), coherente en light mode pero intrusivo en dark mode.
- Componentes auxiliares del Dashboard (`WebSocketStatus`, `AssignmentNotification`, `AppointmentSkeleton`, `QueuePositionBadge`, `DoctorInfo`) dependen del mismo sistema de tokens y hoy pueden mostrar contrastes o superficies inconsistentes en dark mode.
- No existe un requirement dedicado en `.github/requirements/` para este follow-up; la spec se genera sobre la solicitud del usuario y la exploración del código existente.

### Análisis de Estado Actual vs. Delta

| Elemento                      | Estado actual                                                                                                                                                                                                           | Delta requerido                                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Superficie base del Dashboard | `frontend/src/styles/page.module.css` usa `--color-surface-alt`, `--color-surface` y `--color-surface-tertiary`; la separación general existe pero las cards de estado no mantienen consistencia cromática en dark mode | Mantener la estructura actual de layout, pero reforzar separación visual entre background, sección, card y sub-card en dark mode |
| Cards `waiting` / `called`    | Usan gradientes con `--color-amber-50` y `--color-blue-50`, tokens pensados para light mode                                                                                                                             | Reemplazar esos fondos por variantes dark-safe basadas en tokens globales o aliases semánticos de dashboard                      |
| Card `completed`              | `CompletedAppointmentCard.tsx` usa `styles.completed`, mientras el CSS compartido define `.appointmentCard.atendido`; la variante visual puede quedar inconsistente o caer al estilo base                               | Alinear nomenclatura y estilo de la variante completada para que tenga tratamiento explícito y coherente en dark mode            |
| Badges y metadata             | `countBadge`, `statusBadge`, `officeBadge`, `hora` y `QueuePositionBadge` usan combinaciones de fondos claros y textos medios que en dark mode reducen contraste o introducen parches visuales claros                   | Garantizar contraste WCAG AA y consistencia de semántica visual para información, warning, success y error                       |
| Hover / focus                 | Las cards aplican un sheen blanco hardcodeado en hover; el botón dismiss de notificación usa hover sobre `--color-border` sin foco visible explícito                                                                    | Reemplazar hover overlay por un affordance theme-aware y hacer visibles hover/focus en dark mode donde aplique                   |
| Estados de apoyo              | `WebSocketStatus`, `AssignmentNotification`, `AppointmentSkeleton` y `DoctorInfo` heredan superficies válidas, pero con badges, halos y fallbacks que no fueron calibrados específicamente para dark mode               | Alinear estos componentes con la misma gramática visual del Dashboard para evitar islas de estilo                                |
| Modo claro                    | El light theme ya fue refinado por `SPEC-019` y no forma parte del problema reportado                                                                                                                                   | No introducir regresión visual ni cromática en light mode                                                                        |

### Historias de Usuario

#### HU-01: Ver cards del Dashboard legibles en dark mode

```
Como:        Usuario autenticado
Quiero:      visualizar las cards del Dashboard con superficies, textos y badges legibles en dark mode
Para:        consultar el estado operativo de los turnos sin ambigüedad visual ni fatiga por contraste deficiente

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-003, SPEC-012, SPEC-019
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Dashboard renderiza cards legibles en dark mode
  Dado que:  el Usuario autenticado tiene activo el tema oscuro
  Cuando:    accede a /dashboard y se renderizan las secciones En consultorio, En espera y Completados
  Entonces:  cada card muestra una superficie oscura coherente con el tema
  Y:         el texto principal, el texto secundario, los badges y los bordes mantienen contraste suficiente para lectura
  Y:         no se observan fondos pastel o halos de light theme incrustados dentro de cards de dark mode
```

```gherkin
CRITERIO-1.2: Hover y foco se perciben correctamente en dark mode
  Dado que:  existen affordances visuales en cards o controles asociados al Dashboard
  Cuando:    el Usuario interactúa con hover o focus sobre esos elementos
  Entonces:  el estado interactivo se percibe sin overlay blanco invasivo
  Y:         cualquier control focusable conserva una señal visible de foco sobre superficie oscura
```

**Error Path**

```gherkin
CRITERIO-1.3: Estados de error, conexión y carga siguen siendo legibles
  Dado que:  el Dashboard puede mostrar estado de WebSocket, skeletons, empty states y mensajes de error
  Cuando:    estos estados se presentan en dark mode
  Entonces:  los chips de estado, placeholders, mensajes y contenedores mantienen jerarquía visual clara
  Y:         connected, connecting y disconnected siguen siendo distinguibles entre sí
```

**Edge Case**

```gherkin
CRITERIO-1.4: Ajuste visual no altera comportamiento existente
  Dado que:  /dashboard ya consume WebSocket, reproduce audio y renderiza notificaciones y agrupaciones por estado
  Cuando:    se aplica el refinamiento visual de dark mode
  Entonces:  no cambian la lógica de ordenamiento, filtrado, audio, notificaciones ni estructura funcional de la página
```

#### HU-02: Preservar consistencia de tokens y no regresión en light mode

```
Como:        Usuario autenticado
Quiero:      que la corrección de dark mode del Dashboard use tokens consistentes y preserve el modo claro
Para:        mantener homogeneidad visual sin introducir overrides aislados ni regresiones en otras vistas

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

**Happy Path**

```gherkin
CRITERIO-2.1: El ajuste se resuelve mediante tokens del design system
  Dado que:  el Dashboard y sus componentes auxiliares dependen de `globals.css` y de CSS Modules
  Cuando:    se implementa la corrección visual
  Entonces:  los valores nuevos de background, text, border y estados dark mode provienen de tokens globales
  Y:         no se agregan hex hardcodeados nuevos en `page.module.css` ni en los módulos CSS auxiliares del Dashboard
```

**Error Path**

```gherkin
CRITERIO-2.2: El modo claro no se degrada
  Dado que:  el Usuario autenticado usa el tema claro
  Cuando:    accede a /dashboard después del ajuste
  Entonces:  la jerarquía cromática, badges, toast, empty states y notificaciones se mantienen equivalentes al comportamiento visual actual
  Y:         no aparecen contrastes peores ni cambios funcionales
```

**Edge Case**

```gherkin
CRITERIO-2.3: Layout responsive conserva legibilidad en dark mode
  Dado que:  el Dashboard se visualiza en viewport móvil o cards apiladas
  Cuando:    las cards cambian de distribución por responsive
  Entonces:  bordes, espaciado, badges y estados vacíos siguen siendo distinguibles en dark mode
```

### Reglas de Negocio

1. El alcance es estrictamente de frontend. No hay cambios en backend, DB, contratos API, hooks de negocio ni payloads WebSocket.
2. La ruta `/dashboard` mantiene su naturaleza de solo lectura y su comportamiento funcional actual.
3. Toda corrección visual debe apoyarse en tokens definidos en `frontend/src/styles/globals.css`; si los tokens existentes no alcanzan, se deben agregar aliases semánticos o overrides dark mode ahí.
4. Texto normal sobre superficie debe cumplir WCAG AA mínimo de 4.5:1; límites de componente, focus indicators y texto grande deben cumplir mínimo 3:1.
5. Las semánticas visuales de `waiting`, `called`, `completed`, `connected`, `connecting` y `disconnected` deben mantenerse consistentes entre cards, badges, notificaciones y chips.
6. No se permiten nuevos overlays o gradientes pensados solo para light theme dentro de la experiencia dark mode del Dashboard.
7. El modo claro no debe sufrir regresiones visibles como efecto colateral de la corrección del dark mode.

---

## 2. DISEÑO

### Modelos de Datos

N/A — Refinamiento puramente visual. Sin cambios de schema, DTO, entidades ni almacenamiento.

### API Endpoints

Sin cambios. `/dashboard` mantiene el flujo actual basado en `useAppointmentsWebSocket`, audio y notificaciones ya existentes.

### Diseño Frontend

#### Archivos y componentes probables a tocar

| Artefacto                         | Archivo                                                                            | Cambio esperado                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `CompletedHistoryDashboard`       | `frontend/src/app/dashboard/page.tsx`                                              | Mantener markup y comportamiento; ajustar solo clases auxiliares o wrappers si la implementación necesita separar mejor estados visuales  |
| Estilos compartidos del Dashboard | `frontend/src/styles/page.module.css`                                              | Archivo principal del delta: cards, variantes `waiting/called/completed`, badges, hover overlay, empty state, toast, header y superficies |
| `CalledAppointmentCard`           | `frontend/src/components/AppointmentCard/CalledAppointmentCard.tsx`                | Revisar si requiere clase semántica adicional o alineación con tokens del Dashboard                                                       |
| `WaitingAppointmentCard`          | `frontend/src/components/AppointmentCard/WaitingAppointmentCard.tsx`               | Revisar integración de badges y estado de cola en dark mode                                                                               |
| `CompletedAppointmentCard`        | `frontend/src/components/AppointmentCard/CompletedAppointmentCard.tsx`             | Alinear clase o variante visual de completados con el CSS realmente definido                                                              |
| `AssignmentNotification`          | `frontend/src/components/AssignmentNotification/AssignmentNotification.module.css` | Ajustar superficie, borde, hover/focus del dismiss y eliminación de fallbacks visuales innecesarios                                       |
| `WebSocketStatus`                 | `frontend/src/components/WebSocketStatus.module.css`                               | Corregir chips connected/connecting/disconnected para dark mode sin fondos demasiado claros                                               |
| `AppointmentSkeleton`             | `frontend/src/components/AppointmentSkeleton.module.css`                           | Recalibrar contraste de shimmer, bordes y superficie en dark mode                                                                         |
| `QueuePositionBadge`              | `frontend/src/components/QueuePositionBadge/QueuePositionBadge.module.css`         | Asegurar contraste entre badge neutro y texto en dark mode                                                                                |
| `DoctorInfo`                      | `frontend/src/components/DoctorInfo/DoctorInfo.module.css`                         | Reforzar la legibilidad del sub-bloque informativo dentro de cards llamadas                                                               |
| Tokens de tema                    | `frontend/src/styles/globals.css`                                                  | Agregar o ajustar tokens dark mode o aliases semánticos para superficies y estados del Dashboard                                          |

#### Delta de diseño propuesto

| Grupo visual                                      | Uso actual                                                                                  | Delta requerido                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Superficie de card base                           | `--color-surface` + borde estándar                                                          | Mantener base actual, pero reforzar borde o sombra en dark mode cuando la separación entre card y fondo sea insuficiente |
| Variantes `called` y `waiting`                    | Gradientes con `--color-blue-50` y `--color-amber-50`                                       | Reemplazar por tokens dark-safe de información y warning definidos en `globals.css`                                      |
| Variante `completed`                              | Clase consumida desde TSX no coincide con clase existente en CSS compartido                 | Normalizar nombre y tratamiento visual de la variante completada                                                         |
| Badges de conteo, prioridad, consultorio y tiempo | Combinaciones de `50/100/200` + textos medios, válidas en light pero inconsistentes en dark | Mapear cada badge a surface, text y border token compatibles con dark mode                                               |
| Hover de card                                     | Overlay blanco `rgba(255, 255, 255, 0.4)`                                                   | Sustituir por overlay o elevación theme-aware, sin flare blanca sobre superficies oscuras                                |
| Empty, skeleton, error y toast                    | Dependencia parcial de tokens correctos, sin calibración específica para dark mode          | Uniformar gramática visual para que todos estos estados compartan jerarquía y contraste coherentes                       |

#### Tokens visuales recomendados

La implementación preferida es agregar una capa mínima de tokens semánticos para el Dashboard en `frontend/src/styles/globals.css`, reutilizando las familias existentes en `:root` y definiendo equivalentes explícitos para `html[data-theme="dark"]`.

| Grupo       | Tokens mínimos recomendados                                                                               | Consumidores                                              |
| ----------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Información | `--color-dashboard-info-surface`, `--color-dashboard-info-border`, `--color-dashboard-info-text`          | cards `called`, badges de consultorio, chips informativos |
| Warning     | `--color-dashboard-warning-surface`, `--color-dashboard-warning-border`, `--color-dashboard-warning-text` | cards `waiting`, cola, prioridad media, conteos asociados |
| Success     | `--color-dashboard-success-surface`, `--color-dashboard-success-border`, `--color-dashboard-success-text` | completados, toast, estados positivos                     |
| Danger      | `--color-dashboard-danger-surface`, `--color-dashboard-danger-border`, `--color-dashboard-danger-text`    | errores, desconexión, alertas                             |
| Interacción | `--color-dashboard-hover-overlay`, `--color-dashboard-focus-ring`                                         | hover y focus en cards y controles auxiliares             |

Notas de diseño para estos tokens:

- En light mode pueden actuar como aliases de los tokens actuales ya usados por el Dashboard.
- En dark mode deben tener valores propios, evitando reutilizar directamente `--color-blue-50`, `--color-amber-50`, `--color-red-50` o `--color-green-100` como fondos principales.
- Si el equipo decide no crear aliases nuevos, cualquier override directo sobre tokens existentes debe demostrar que no introduce regresión visual en otras pantallas que compartan esos mismos tokens.

### Arquitectura y Dependencias

- Paquetes nuevos requeridos: ninguno.
- Servicios externos: ninguno.
- Backend: sin cambios.
- DB: sin cambios.
- ThemeProvider: sin cambios de comportamiento; solo consume tokens CSS ya presentes.
- Riesgo principal: si se alteran tokens globales compartidos sin aliases, otras pantallas pueden heredar cambios no deseados.

### Notas de Implementación

- El Dashboard no usa un CSS Module propio de página; hoy depende del módulo compartido `frontend/src/styles/page.module.css`. La implementación debe evitar duplicar estilos innecesariamente y corregir el problema en la fuente compartida correcta.
- El hallazgo más claro de deuda visual es la mezcla de tokens tonales claros con superficies dark y un hover overlay blanco hardcodeado en las cards.
- La desalineación entre `styles.completed` y `.appointmentCard.atendido` debe evaluarse como parte del ajuste visual, porque puede estar dejando la sección de completados sin una variante explícita consistente.
- La solución debe preservar sorting, audio unlock, banners de asignación y uso de `useAppointmentsWebSocket`.
- La validación de contraste debe hacerse sobre UI renderizada, no solo sobre tokens aislados.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.

### Backend

No aplica — sin cambios de backend ni DB.

### Frontend

#### Implementación

- [ ] Auditar `frontend/src/app/dashboard/page.tsx` y los componentes de AppointmentCard para confirmar que el delta es puramente visual
- [ ] Modificar `frontend/src/styles/page.module.css` para corregir `appointmentCard`, `waiting`, `called`, variante de `completed`, `countBadge`, `statusBadge`, `officeBadge`, `hora`, `empty`, `toast` y `stickyHeader` en dark mode
- [ ] Eliminar o reemplazar el hover overlay blanco hardcodeado de las cards por una solución theme-aware
- [ ] Alinear la variante visual de completados entre `CompletedAppointmentCard.tsx` y el CSS compartido
- [ ] Modificar `frontend/src/components/WebSocketStatus.module.css` para asegurar chips connected/connecting/disconnected legibles en dark mode
- [ ] Modificar `frontend/src/components/AssignmentNotification/AssignmentNotification.module.css` para mejorar superficie, borde y estados hover/focus del dismiss
- [ ] Modificar `frontend/src/components/AppointmentSkeleton.module.css` para asegurar shimmer, bordes y placeholders visibles en dark mode
- [ ] Modificar `frontend/src/components/QueuePositionBadge/QueuePositionBadge.module.css` para mejorar contraste del badge de cola
- [ ] Modificar `frontend/src/components/DoctorInfo/DoctorInfo.module.css` para asegurar que la sub-card interna conserva separación y contraste
- [ ] Modificar `frontend/src/styles/globals.css` para agregar o ajustar tokens o aliases dark mode requeridos por el Dashboard
- [ ] Verificar explícitamente que no se introducen cambios funcionales en audio, WebSocket, sorting o agrupación por estado

#### Tests Frontend

- [ ] Extender `frontend/test/app/dashboard/page.spec.tsx` para validar render estable de `/dashboard` con `data-theme="dark"` y cobertura de secciones, empty states y mensajes sin regresión funcional
- [ ] Extender `frontend/test/app/dashboard/page.coverage.spec.tsx` para cubrir estados `connecting`, `disconnected`, toast y notificación bajo tema oscuro
- [ ] Extender `frontend/test/components/CalledAppointmentCard.spec.tsx`, `WaitingAppointmentCard.spec.tsx` y `CompletedAppointmentCard.spec.tsx` para asegurar que las variantes siguen renderizando correctamente en dark mode
- [ ] Extender `frontend/test/components/WebSocketStatus.spec.tsx` para validar conectividad visual semántica de connected, connecting y disconnected con `data-theme="dark"`
- [ ] Extender `frontend/test/components/AssignmentNotification.spec.tsx` para validar dismiss focusable y render estable en dark mode
- [ ] Extender `frontend/test/components/QueuePositionBadge.spec.tsx`, `DoctorInfo.spec.tsx` y `AppointmentSkeleton.spec.tsx` para cubrir subcomponentes usados por las cards del Dashboard
- [ ] Evaluar agregar smoke visual en `frontend/test/e2e/realtime-dashboard.spec.ts` o un e2e dedicado para toggle a dark mode y revisión básica de legibilidad del Dashboard

### QA

- [ ] Validar CRITERIO-1.1 en `/dashboard` con dark mode activo para secciones En consultorio, En espera y Completados
- [ ] Validar que cards, badges, bordes y textos del Dashboard cumplen contraste mínimo esperado en dark mode
- [ ] Verificar que no hay gradientes claros, overlays blancos o superficies pastel heredadas de light theme dentro del Dashboard dark
- [ ] Verificar hover y focus en los elementos interactivos aplicables, especialmente dismiss de notificación y affordances visuales de cards
- [ ] Verificar estados de WebSocket, error, empty y skeleton en dark mode
- [ ] Verificar no regresión en light mode sobre `/dashboard`
- [ ] Verificar que no hay cambio funcional en ordenamiento, audio, WebSocket ni notificaciones
- [ ] Confirmar que cualquier token nuevo o ajustado en `globals.css` no degrada otras pantallas que compartan el mismo design system
