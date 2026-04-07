# Casos Gherkin QA - admin-profiles-exclusive-mode-navigation (SPEC-017)

## Alcance

Revalidacion QA posterior al fix del modal persistente en /admin/profiles.

Foco QA en esta salida:

- confirmar exclusividad real de vistas y acciones
- validar que abandonar el modo profiles limpia el contexto visible del modal de perfiles
- verificar que el riesgo principal previo deja de ser bloqueante
- preservar el CTA de crear perfil solo dentro del modo perfiles
- mantener compatibilidad funcional base con SPEC-015 y SPEC-016
- identificar riesgos residuales no bloqueantes

La spec no define SLA ni umbrales de performance. En esta revalidacion solo corresponden artefactos de Gherkin y riesgos.

## Flujos criticos priorizados

- Entrada por defecto en Gestion de perfiles con una sola vista activa.
- Cambio a Gestionar consultorios sin arrastrar tabla, CTA ni errores de perfiles.
- Cambio a Gestionar especialidades sin mezclar acciones de perfiles ni consultorios.
- Regreso a Gestion de perfiles con restauracion del contexto principal.
- Cambio de modo con modal de perfiles abierto, garantizando cierre y no reaparicion involuntaria.
- Aislamiento de errores, loading y empty states al modo activo.
- Compatibilidad visible de SpecialtyManager y OfficeManager dentro del contenedor exclusivo.
- Operabilidad base del selector de modo y persistencia visual del modo activo.

## HU-01 - Selector exclusivo de modo para la gestion administrativa

```gherkin
#language: es
Caracteristica: Navegacion exclusiva de modos en la pantalla admin de perfiles

  @smoke @critico @happy-path @hu-01 @criterio-1-1
  Escenario: La pagina abre por defecto en Gestion de perfiles
    Dado que el Administrador autenticado entra a la pantalla de perfiles administrativos
    Cuando la pagina termina de cargar
    Entonces la interfaz muestra solo la tabla y acciones propias de perfiles
    Y Gestion de perfiles se identifica como el modo activo
    Y no se muestran al mismo tiempo las gestiones de especialidades ni consultorios

  @smoke @critico @happy-path @hu-01 @criterio-1-2
  Escenario: El Administrador cambia al modo Gestionar consultorios
    Dado que el Administrador esta viendo la gestion administrativa de perfiles
    Cuando selecciona Gestionar consultorios
    Entonces la interfaz muestra solo la vista de consultorios
    Y deja de mostrar la tabla de perfiles, el CTA Crear perfil y la gestion de especialidades
    Y el selector de modo permanece disponible para seguir navegando

  @smoke @critico @happy-path @hu-01 @criterio-1-3
  Escenario: El Administrador cambia al modo Gestionar especialidades
    Dado que el Administrador esta viendo la gestion administrativa de perfiles
    Cuando selecciona Gestionar especialidades
    Entonces la interfaz muestra solo la vista de especialidades
    Y deja de mostrar la tabla y acciones de perfiles
    Y deja de mostrar la gestion de consultorios
    Y Gestionar especialidades queda marcado como modo activo

  @error-path @critico @hu-01 @criterio-1-4
  Escenario: Un error se muestra solo en la vista activa
    Dado que el selector de modo esta disponible
    Y la vista activa presenta un error de carga o validacion
    Cuando el Administrador observa la pantalla
    Entonces el error solo se presenta dentro del modo activo
    Y no se mezclan tablas ni acciones de otros modos junto al error
    Y el selector de modo sigue operativo para salir del contexto fallido

  @edge-case @critico @hu-01 @criterio-1-5
  Escenario: Volver a Gestion de perfiles restablece el contexto principal visible
    Dado que el Administrador navego previamente a especialidades o consultorios
    Cuando vuelve a seleccionar Gestion de perfiles
    Entonces la interfaz vuelve a mostrar solo la tabla y acciones de perfiles
    Y vuelve a estar disponible el flujo de crear, editar y refrescar perfiles
    Y no quedan visibles mensajes o componentes de la vista anterior

  @a11y @hu-01 @selector
  Escenario: El selector de modo es operable sin mouse y comunica el modo activo
    Dado que el Administrador navega la pantalla con teclado o lector de pantalla
    Cuando recorre el selector de modo y activa otra vista
    Entonces puede identificar cual modo esta activo en todo momento
    Y puede cambiar de modo sin perder el foco operativo
    Y la interfaz comunica una sola vista activa a la vez

  @seguridad @hu-01
  Escenario: Solo un Administrador puede ver la pantalla administrativa
    Dado que un usuario autenticado no tiene permisos de Administrador
    Cuando intenta entrar a la pantalla administrativa de perfiles
    Entonces la pantalla protegida no expone el selector de modo ni las acciones operativas
```

## HU-02 - Acciones contextuales preservando la funcionalidad existente

```gherkin
#language: es
Caracteristica: Acciones contextuales sin regresion funcional en /admin/profiles

  @smoke @critico @happy-path @hu-02 @criterio-2-1
  Escenario: El control principal de perfiles funciona como selector de modo
    Dado que el Administrador observa la navegacion principal de la pantalla
    Cuando revisa el acceso al modo de perfiles
    Entonces el control se muestra como Gestion de perfiles
    Y ese control identifica y activa el modo perfiles
    Y ya no se presenta como el antiguo boton Nuevo perfil

  @smoke @critico @happy-path @hu-02 @criterio-2-2
  Escenario: Crear perfil sigue disponible solo dentro del modo perfiles
    Dado que el modo activo es Gestion de perfiles
    Cuando el Administrador inicia el alta de un Perfil
    Entonces la interfaz abre el flujo existente de creacion de Perfil
    Y mantiene las validaciones y el modal actuales
    Y esa accion no se muestra en especialidades ni consultorios

  @happy-path @hu-02 @criterio-2-3
  Escenario: Especialidades y consultorios mantienen sus acciones en su modo exclusivo
    Dado que el Administrador cambia al modo Gestionar especialidades o Gestionar consultorios
    Cuando la vista correspondiente termina de renderizar
    Entonces la interfaz conserva las acciones operativas existentes de ese contexto
    Y esas acciones solo aparecen dentro del modo seleccionado

  @error-path @critico @hu-02 @criterio-2-4
  Escenario: La UI no expone acciones de perfiles fuera del modo perfiles
    Dado que el modo activo es Gestionar especialidades o Gestionar consultorios
    Cuando el Administrador interactua con la pantalla
    Entonces la interfaz no muestra el CTA Crear perfil
    Y no muestra la tabla de perfiles, sus toolbars ni sus enlaces contextuales
    Y no mantiene un estado visible mixto entre modos

  @edge-case @critico @hu-02 @criterio-2-5
  Escenario: Cambiar de modo elimina estados visuales mixtos
    Dado que la vista de perfiles mostraba un estado propio como loading, empty state o error contextual
    Cuando el Administrador cambia a otra vista exclusiva
    Entonces la interfaz renderiza solo el estado correspondiente al modo seleccionado
    Y no arrastra tablas, mensajes ni barras de acciones de la vista anterior
```

## Escenarios complementarios derivados del fix del modal persistente

```gherkin
#language: es
Caracteristica: Limpieza de estado al abandonar el modo perfiles

  @edge-case @critico @ux @estado @regresion-fix
  Escenario: Cambiar de modo cierra un flujo de creacion o edicion en curso
    Dado que el Administrador abrio el flujo de alta o edicion de un Perfil
    Y el modal muestra datos capturados o mensajes de validacion
    Cuando cambia a Gestionar especialidades o Gestionar consultorios
    Entonces la vista anterior deja de estar activa
    Y al regresar a Gestion de perfiles no reaparece el modal de forma involuntaria
    Y no persisten mensajes de error o seleccion de perfil ajenos al nuevo contexto
```

## Datos de prueba sinteticos

| Escenario               | Campo             | Valido                                         | Invalido                                  | Borde                                                |
| ----------------------- | ----------------- | ---------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Vista por defecto       | modo inicial      | Gestion de perfiles                            | especialidades visible al cargar          | selector visible con solo un modo activo             |
| Cambio a consultorios   | vista visible     | resumen y acciones de consultorios             | tabla de perfiles aun visible             | error de perfiles previo antes del cambio            |
| Cambio a especialidades | vista visible     | formulario y lista de especialidades           | CTA Crear perfil visible                  | volver desde consultorios y conservar especialidades |
| Error aislado           | mensaje visible   | error solo del modo activo                     | error de perfiles visible en consultorios | dos errores de modos distintos visibles a la vez     |
| Crear perfil contextual | CTA principal     | Crear perfil solo en perfiles                  | CTA visible en especialidades u oficinas  | empty state con enlace Crear el primero              |
| Selector accesible      | navegacion        | cambio por teclado con anuncio del modo activo | foco perdido o sin indicacion del modo    | cambiar varias veces sin mouse                       |
| Limpieza de estado      | modal de perfiles | modal cerrado al salir de perfiles             | modal reabierto al volver                 | error de validacion previo persiste al regresar      |

## Cobertura automatizada observada en el workspace

Revision estatica de codigo y pruebas versionadas; no se ejecutaron tests en esta sesion.

| HU / Area                          | Cobertura observada                                                                                                                                                                                                                                              | Evidencia focal                                                                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HU-01                              | La pagina usa un unico estado activeView y renderizado condicional exclusivo para perfiles, especialidades y consultorios. Las suites revisadas cubren vista por defecto, cambio a consultorios, cambio a especialidades, selector visible y retorno a perfiles. | .github/specs/admin-profiles-exclusive-mode-navigation.spec.md, frontend/src/app/admin/profiles/page.tsx, frontend/test/app/admin/profiles/page.spec.tsx, frontend/src/**tests**/pages/AdminProfilesPage.test.tsx |
| HU-02                              | Las pruebas cubren el renombre del selector de perfiles, el CTA Crear perfil solo en el modo perfiles, ocultamiento de columnas o acciones al cambiar de modo y proteccion admin-only.                                                                           | frontend/src/app/admin/profiles/page.tsx, frontend/test/app/admin/profiles/page.spec.tsx, frontend/src/**tests**/pages/AdminProfilesPage.test.tsx                                                                 |
| Fix modal persistente              | switchMode limpia modalOpen, selectedProfile y modalError al salir de profiles. Ademas, existen dos tests focalizados que verifican que el modal no reaparece al volver desde offices ni desde specialties.                                                      | frontend/src/app/admin/profiles/page.tsx, frontend/test/app/admin/profiles/page.spec.tsx                                                                                                                          |
| Compatibilidad SPEC-015 y SPEC-016 | El contenedor exclusivo sigue montando SpecialtyManager y OfficeManager, y las pruebas validan que ambos aparecen en su modo correspondiente.                                                                                                                    | frontend/src/components/SpecialtyManager/SpecialtyManager.tsx, frontend/src/components/OfficeManager/OfficeManager.tsx, frontend/test/app/admin/profiles/page.spec.tsx                                            |
| Selector visual                    | Existe estilo dedicado para modeSelector, modeBtn y modeBtnActive.                                                                                                                                                                                               | frontend/src/app/admin/profiles/page.module.css                                                                                                                                                                   |

## Gaps residuales priorizados

- No se encontro una prueba explicita para errores de especialidades aislados al modo activo; la evidencia directa sigue concentrada en perfiles y consultorios.
- No se encontro una prueba dedicada de accesibilidad del selector con teclado, foco visible o anuncio consistente del modo activo.
- No se encontro evidencia de comportamiento responsive del selector de modo en viewport reducido.
- La compatibilidad de SPEC-015 y SPEC-016 esta cubierta a nivel de visibilidad, pero no hay regresion integrada que pruebe CRUD de especialidades o acciones de consultorios despues de navegar entre modos.
- La limpieza interna de selectedProfile y modalError se observa en el codigo de switchMode, pero las aserciones automatizadas nuevas validan principalmente el efecto visible del fix: que el modal no reaparece al volver.
- Existen dos suites muy parecidas para la misma pagina; hoy aportan cobertura, pero introducen riesgo de drift si una evoluciona y la otra no.

## Evidencia base usada para esta salida

### Focal validada por el usuario

- .github/specs/admin-profiles-exclusive-mode-navigation.spec.md
- frontend/src/app/admin/profiles/page.tsx
- frontend/test/app/admin/profiles/page.spec.tsx
- docs/output/qa/admin-profiles-exclusive-mode-navigation-gherkin.md
- docs/output/qa/admin-profiles-exclusive-mode-navigation-risks.md

### Contexto adicional consultado en el workspace

- .github/docs/lineamientos/qa-guidelines.md
- frontend/src/**tests**/pages/AdminProfilesPage.test.tsx
- frontend/src/app/admin/profiles/page.module.css
- frontend/src/components/OfficeManager/OfficeManager.tsx
- frontend/src/components/SpecialtyManager/SpecialtyManager.tsx
