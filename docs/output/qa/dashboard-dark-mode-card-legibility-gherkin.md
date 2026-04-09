# Casos Gherkin QA - dashboard-dark-mode-card-legibility

## Alcance

Follow-up visual de frontend para mejorar la legibilidad de las cards y superficies del Dashboard en dark mode.

- Alcance funcional revisado: cards `called`, `waiting` y `completed`, badges, bordes, skeletons, toast, notificacion de asignacion, estado de WebSocket y bloque informativo de medico.
- Base de evidencia: spec activa, implementacion actual en `globals.css`, `page.module.css` y componentes auxiliares, mas suites frontend actualizadas en `frontend/test/`.
- Nota de proceso: la spec todavia declara estado `IN_PROGRESS`, pero estos escenarios QA se generan sobre el codigo ya implementado y el alcance indicado por el usuario.

## Flujos criticos priorizados

- Legibilidad de cards y badges del Dashboard con tema oscuro activo.
- Affordances visuales de hover y focus sin overlay claro invasivo.
- Legibilidad de estados de carga, conexion, error, toast y notificacion en dark mode.
- No regresion funcional en ordenamiento, audio, WebSocket y notificaciones.
- Consistencia de tokens del design system para superficies, bordes y textos.
- No regresion visible en light mode.
- Legibilidad responsive cuando las cards cambian de distribucion.

```gherkin
#language: es
Caracteristica: Legibilidad y consistencia visual del Dashboard en dark mode

  @smoke @critico @happy-path @hu-01
  Escenario: El Usuario visualiza cards legibles en dark mode
    Dado que el Usuario autenticado tiene activo el tema oscuro
    Y el Dashboard muestra turnos en consultorio, en espera y completados
    Cuando consulta el Dashboard operativo
    Entonces cada card usa superficies oscuras coherentes con el tema
    Y los textos, badges y bordes mantienen jerarquia visual legible
    Y no aparecen fondos pastel ni halos claros heredados de light mode

  @happy-path @critico @hu-01
  Escenario: El Usuario percibe hover y focus sin interferencia visual
    Dado que el Usuario navega el Dashboard en dark mode
    Cuando interactua con cards y controles focusables asociados
    Entonces el estado hover se percibe sin overlay blanco invasivo
    Y el control de cierre de la notificacion mantiene un foco visible

  @error-path @critico @hu-01
  Escenario: El Dashboard mantiene legibilidad en conexion, carga y error
    Dado que el Dashboard puede mostrar estados de conexion, skeleton, error y toast
    Cuando esos estados aparecen con el tema oscuro activo
    Entonces los chips, placeholders, mensajes y contenedores siguen siendo distinguibles
    Y connected, connecting y disconnected conservan semantica visual diferenciable

  @edge-case @critico @hu-01
  Escenario: El refinamiento visual no altera el comportamiento operativo existente
    Dado que el Dashboard ya ordena turnos, reproduce audio y muestra notificaciones operativas
    Cuando se aplica el ajuste visual de dark mode
    Entonces el comportamiento de audio, ordenamiento, WebSocket y notificaciones no cambia
    Y la pagina mantiene su estructura funcional actual

  @smoke @critico @happy-path @hu-02
  Escenario: El ajuste visual usa tokens consistentes del sistema de diseno
    Dado que el Dashboard comparte estilos y tokens con otros componentes del frontend
    Cuando se revisa la solucion implementada para dark mode
    Entonces las superficies, bordes, textos y estados se resuelven con tokens semanticos
    Y el Dashboard evita reintroducir fondos claros pensados solo para light mode

  @error-path @hu-02
  Escenario: El tema claro conserva su jerarquia visual despues del ajuste
    Dado que el Usuario utiliza el Dashboard con tema claro
    Cuando accede a las mismas secciones despues de la correccion
    Entonces badges, tarjetas, estados vacios y notificaciones mantienen una jerarquia equivalente a la previa
    Y no aparece degradacion visual observable por el cambio de dark mode

  @edge-case @hu-02
  Escenario: El Dashboard conserva legibilidad cuando las cards se apilan
    Dado que el Usuario abre el Dashboard en un viewport reducido
    Cuando las cards cambian a distribucion responsive
    Entonces bordes, espaciados, badges y estados vacios siguen siendo distinguibles
    Y la lectura del contenido no se degrada por wrapping o apilamiento
```

## Datos de prueba sinteticos

| Escenario | Campo | Valido | Invalido | Borde |
| --- | --- | --- | --- | --- |
| Cards legibles en dark mode | Tema activo | `dark` con cards `called`, `waiting`, `completed` | `light` usado como referencia para validar dark mode | `dark` con una sola seccion poblada y las otras vacias |
| Hover y focus visibles | Elemento interactivo | dismiss de notificacion visible y focusable | hover con halo blanco o foco imperceptible | card sin controles propios, pero con affordance visual de hover |
| Conexion, carga y error legibles | Estado operativo | `connected`, `connecting`, `disconnected`, skeleton y error | mismo estado con contraste insuficiente o estilos mezclados | toast y notificacion visibles al mismo tiempo |
| Sin regresion funcional | Flujo operativo | audio, sort y notificaciones conservados | cambio visual que altera orden o eventos | transicion `waiting` a `called` seguida de `completed` |
| Tokens consistentes | Token semantico | aliases `dashboard-*` aplicados a superficies y estados | color tonal claro incrustado como fondo principal en dark mode | sombra o halo auxiliar que no cambia superficie principal |
| Light mode sin regresion | Tema claro | render estable de cards, badges y mensajes | perdida de contraste o cambio de jerarquia cromatica | mismo dataset comparado entre light y dark |
| Responsive legible | Viewport | movil o tablet con cards apiladas legibles | badges o textos colisionados | 320px de ancho con nombres largos y multiples badges |

## Evidencia automatizada observada en el repo

- `frontend/test/app/dashboard/page.spec.tsx` cubre render de secciones, estado dark mode, clases semanticas por tipo de card, audio y cleanup.
- `frontend/test/app/dashboard/page.coverage.spec.tsx` cubre empty states, skeletons, error, toast, notificacion de asignacion y flujo dark mode.
- `frontend/test/components/CalledAppointmentCard.spec.tsx`, `WaitingAppointmentCard.spec.tsx` y `CompletedAppointmentCard.spec.tsx` validan render estable y clases semanticas con `data-theme="dark"`.
- `frontend/test/components/WebSocketStatus.spec.tsx` valida estados `connected`, `connecting` y `disconnected` con semantica visual y accesibilidad.
- `frontend/test/components/AssignmentNotification.spec.tsx` valida render estable en dark mode y foco alcanzable en el boton dismiss.
- `frontend/test/components/QueuePositionBadge.spec.tsx`, `DoctorInfo.spec.tsx` y `AppointmentSkeleton.spec.tsx` cubren subcomponentes usados dentro de las cards.
- `frontend/test/e2e/realtime-dashboard.spec.ts` aporta cobertura de actualizacion en tiempo real, pero no valida visualmente dark mode ni contrastes en navegador real.

## Gaps que pasan a validacion manual

- No hay evidencia automatizada de contraste WCAG calculado en navegador real.
- No hay smoke visual automatizado para hover de cards en dark mode.
- No hay prueba viewport-specific para dark mode responsive.
