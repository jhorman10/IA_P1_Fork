# Matriz de Riesgos ASD - dashboard-dark-mode-card-legibility

## 1. Resumen ejecutivo QA

Contexto del analisis:

- Feature revisada: follow-up visual para legibilidad y consistencia de cards del Dashboard en dark mode.
- Alcance confirmado: frontend only; no hay cambios de backend, DB, contratos API ni logica de negocio.
- Evidencia revisada: spec, implementacion actual en estilos/tokens del Dashboard y suites frontend actualizadas en `frontend/test/`.
- Restriccion de esta pasada QA: no se re-ejecutaron pruebas en este contexto porque no hay herramienta de ejecucion disponible; la conclusion se apoya en inspeccion del codigo y de las pruebas reportadas como verdes por el equipo.
- Performance: no se genera archivo de performance porque la spec no define SLAs cuantitativos.

Total: 5 riesgos | Alto (A): 0 | Medio (S): 4 | Bajo (D): 1

Interpretacion QA:

- El cambio esta bien acotado al problema reportado y usa tokens semanticos nuevos para dashboard en `globals.css`.
- La cobertura automatizada actual es suficiente para sostener que no se tocaron flujos funcionales principales.
- El cierre QA de este follow-up visual sigue dependiendo de una validacion manual corta en navegador real para contraste, hover/focus, light mode y responsive.

## 2. Cobertura de criterios de aceptacion

| Criterio | Estado QA | Evidencia principal | Observacion |
| --- | --- | --- | --- |
| CRITERIO-1.1 Cards legibles en dark mode | Cubierto con evidencia automatizada y revision | Tokens `dashboard-*` en `frontend/src/styles/globals.css`, variantes `waiting/called/completed` en `frontend/src/styles/page.module.css`, tests de pagina y cards en dark mode | Queda pendiente confirmacion visual final en navegador real |
| CRITERIO-1.2 Hover y foco correctos | Cobertura parcial con validacion manual pendiente | `--color-dashboard-hover-overlay`, `--color-dashboard-focus-ring`, `AssignmentNotification.spec.tsx` valida dismiss focusable | No hay automatizacion visual para confirmar percepcion real del hover en cards |
| CRITERIO-1.3 Conexion, carga y error legibles | Cubierto | `page.coverage.spec.tsx`, `WebSocketStatus.spec.tsx`, `AppointmentSkeleton.spec.tsx`, `AssignmentNotification.spec.tsx` | La semantica esta cubierta; falta contraste real en browser |
| CRITERIO-1.4 Sin alteracion funcional | Cubierto | `page.spec.tsx` y `page.coverage.spec.tsx` cubren audio, sort, callbacks y notificaciones; `page.tsx` mantiene el flujo operativo | No se detectan cambios funcionales en el codigo revisado |
| CRITERIO-2.1 Ajuste resuelto con tokens | Cubierto con observacion menor | Nuevos aliases `dashboard-*` en `globals.css`; CSS principal usa variables para superficies, textos y bordes | Persisten algunos `rgba(...)` auxiliares en halos/sombra, sin impacto bloqueante en la semantica base |
| CRITERIO-2.2 Light mode no se degrada | Cobertura parcial con validacion manual pendiente | Las suites existentes renderizan el dashboard en tema por defecto y no muestran quiebre funcional | No hay regresion visual automatizada en browser para light mode |
| CRITERIO-2.3 Responsive conserva legibilidad | Cobertura parcial con validacion manual pendiente | `cardGrid` y skeleton tienen reglas responsive, pero no hay prueba de viewport especifica | Requiere pasada manual en movil/tablet |

## 3. Matriz de riesgos ASD

| ID | HU / Area | Descripcion del riesgo | Factores de riesgo | Nivel ASD | Testing requerido | Mitigacion / control actual |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | HU-01 / contraste visual real | La UI puede seguir mostrando diferencias de legibilidad entre navegador real y entorno de pruebas, porque las suites actuales validan render/semantica pero no el contraste final percibido | Pantalla de uso frecuente, ajuste visual sin pixel diff ni medicion automatica de contraste | S | Recomendado | Tokens oscuros dedicados para dashboard y pruebas de render dark mode en pagina y componentes |
| R-002 | CRITERIO-1.2 / affordances interactivos | Hover y focus pueden percibirse distinto a lo esperado en cards y boton dismiss, ya que la automatizacion actual no verifica estilos finales sobre hover en browser | Interaccion visual, varios componentes auxiliares, gap de evidencia en navegador real | S | Recomendado | Overlay y focus ring theme-aware; prueba de foco en `AssignmentNotification` |
| R-003 | HU-02 / regresion en light mode por tokens compartidos | Aunque los nuevos tokens son semanticos y especificos del dashboard, viven en `globals.css` y requieren comprobacion visual para descartar degradacion de jerarquia en light mode | Dependencia compartida del design system, vista operativa frecuente | S | Recomendado | Nombres de token acotados a dashboard y render estable en tema por defecto |
| R-004 | CRITERIO-2.3 / responsive dark mode | El apilamiento de cards, nombres largos y badges puede degradar lectura en movil o tablet sin que hoy exista cobertura automatizada por viewport | Edge case explicito en la spec, cambio visual en grilla y badges | S | Recomendado | CSS responsive base presente y componentes renderizan sin error bajo dark mode |
| R-005 | CRITERIO-2.1 / pureza de tokenizacion | Persisten halos/sombras con `rgba(...)` en `WebSocketStatus.module.css` y `AssignmentNotification.module.css`, lo que podria dejar una minima inconsistencia visual frente a una tokenizacion total | Riesgo estetico menor, sin impacto funcional | D | Opcional | Superficies, bordes y textos principales ya migraron a tokens semanticos |

## 4. Riesgos residuales

- No hay evidencia de contraste WCAG calculado ni screenshot comparison en navegador real.
- El hover de cards y la percepcion del focus visible solo tienen cobertura indirecta por revision de CSS y un test de foco del dismiss.
- La no regresion visual de light mode sigue siendo una conclusion razonable por inspeccion, pero no una evidencia visual automatizada.
- Responsive dark mode permanece como gap de verificacion manual.
- Los `rgba(...)` residuales en halos/sombras no bloquean el cierre, pero conviene vigilarlos si el equipo endurece la politica de tokenizacion visual.

## 5. Validacion manual sugerida en navegador

1. Abrir el Dashboard con tema oscuro y dataset que muestre simultaneamente secciones En consultorio, En espera y Completados; confirmar que no hay fondos pastel, texto lavado ni bordes perdidos.
2. Hacer hover sobre varias cards y tabular hasta el boton de cierre de la notificacion; confirmar que no aparece sheen blanco invasivo y que el foco se ve con claridad.
3. Forzar o simular estados `connecting`, `disconnected`, empty, skeleton, toast y notificacion de asignacion; confirmar que todos mantienen jerarquia y legibilidad en dark mode.
4. Repetir una pasada corta en light mode para comparar cards, badges, empty states y toast contra el comportamiento previo esperado.
5. Validar al menos un viewport movil (320-390 px), uno tablet (768 px) y uno desktop para revisar wrapping de nombres, badges y grilla.

## 6. Veredicto QA

Veredicto propuesto: cierre QA favorable con validacion manual final breve.

Justificacion:

- La implementacion observada respeta el alcance frontend-only y corrige el problema desde la raiz mediante tokens semanticos y estilos del Dashboard, no con parches funcionales.
- La evidencia automatizada revisada cubre los criterios mas importantes del follow-up visual: cards por estado, estados de soporte, audio/notificaciones sin regresion y estabilidad dark mode a nivel de pagina y componentes.
- No se identifican riesgos ASD de nivel Alto que bloqueen este follow-up.
- Los riesgos restantes son visuales y de percepcion en navegador real; por eso el cierre recomendado es favorable, condicionado a una pasada manual corta sobre dark mode, light mode y responsive.

Decision QA local: apto para cierre ASDD del follow-up visual una vez completada la verificacion manual sugerida sin hallazgos nuevos.
