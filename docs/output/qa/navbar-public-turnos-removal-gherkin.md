# Casos Gherkin QA - navbar-public-turnos-removal (SPEC-018)

## Alcance

Spec evaluada: SPEC-018 - authenticated-navigation-and-operational-management-alignment.

Objetivo QA de esta salida:

- validar la remocion de Turnos del navbar autenticado sin afectar Dashboard ni enlaces por rol
- validar el rename del selector interno a Selector de gestion
- preservar la regla operativa existente de consultorios libres y ocupados
- dejar trazabilidad entre criterios de aceptacion y evidencia de pruebas disponible

La spec no define SLA ni umbrales de performance. En esta fase solo corresponden artefactos de Gherkin y riesgos.

## Flujos criticos priorizados

- Navbar autenticado sin enlace Turnos para admin, recepcionista y doctor.
- Preservacion de Dashboard como acceso visible dentro del navbar autenticado.
- Acceso directo a la ruta publica / sin dependencia del enlace removido.
- Rename del selector interno a Selector de gestion sin alterar modos ni etiquetas internas.
- Regla operativa preservada: un consultorio libre puede deshabilitarse.
- Regla operativa preservada: un consultorio ocupado no puede deshabilitarse y el backend mantiene rechazo 409.

## HU-01 - Ocultar Turnos en el navbar autenticado

```gherkin
#language: es
Caracteristica: Navbar autenticado alineado con la naturaleza publica de la pantalla de turnos

  @smoke @critico @hu-01 @criterio-1-1
  Escenario: Turnos no se muestra en el navbar autenticado
    Dado que un Usuario autenticado tiene Perfil admin, recepcionista o doctor
    Cuando se renderiza el navbar autenticado
    Entonces la opcion Turnos no aparece como enlace visible en la navegacion

  @smoke @critico @hu-01 @criterio-1-2
  Escenario: Dashboard se preserva tras el ajuste del navbar
    Dado que un Usuario autenticado visualiza el navbar
    Cuando se aplica la nueva composicion visible del menu
    Entonces la opcion Dashboard permanece visible y navegable
    Y los accesos especificos por Perfil se conservan sin cambios

  @edge-case @hu-01 @criterio-1-3
  Escenario: El acceso directo a la ruta publica de turnos sigue disponible
    Dado que la ruta principal sigue siendo publica
    Cuando un Usuario autenticado o no autenticado navega directamente a la pantalla publica
    Entonces la pantalla publica de turnos carga sin depender del enlace removido del navbar autenticado
```

## HU-02 - Renombrar el selector general de Gestion Operativa

```gherkin
#language: es
Caracteristica: Selector interno renombrado sin mezclar vistas ni alterar etiquetas operativas

  @smoke @critico @hu-02 @criterio-2-1
  Escenario: El selector general usa el nuevo nombre en Gestion Operativa
    Dado que el Administrador autenticado entra a la pantalla de Gestion Operativa
    Cuando se renderiza la navegacion interna
    Entonces el selector se identifica como Selector de gestion
    Y las opciones visibles mantienen la navegacion entre perfiles, especialidades y consultorios

  @smoke @hu-02 @criterio-2-2
  Escenario: El rename del selector no altera el comportamiento del modo activo
    Dado que existe un modo activo en Gestion Operativa
    Cuando se aplica el cambio de nombre del selector
    Entonces la navegacion exclusiva entre vistas conserva su comportamiento actual
    Y no se introducen cambios de rutas, permisos ni mezcla visual entre modos

  @edge-case @hu-02 @criterio-2-3
  Escenario: El rename afecta solo el nombre general del selector
    Dado que el selector interno ya expone opciones operativas
    Cuando se aplica el ajuste solicitado
    Entonces solo cambia el nombre general del selector a Selector de gestion
    Y las etiquetas internas permanecen sin cambios
```

## HU-03 - Preservar la regla operativa de deshabilitacion de consultorios

```gherkin
#language: es
Caracteristica: Regla operativa preservada para consultorios libres y ocupados

  @smoke @critico @hu-03 @criterio-3-1
  Escenario: El Administrador puede deshabilitar un consultorio libre
    Dado que un consultorio esta habilitado y no tiene doctor activo asignado
    Cuando el Administrador ejecuta la accion de deshabilitarlo desde Gestion Operativa
    Entonces la operacion se permite y el consultorio pasa a estado deshabilitado

  @smoke @critico @hu-03 @criterio-3-2
  Escenario: El Administrador no puede deshabilitar un consultorio ocupado
    Dado que un consultorio esta ocupado por un doctor con estado operativo activo
    Cuando el Administrador intenta deshabilitarlo
    Entonces la UI bloquea la accion operativa
    Y el backend preserva el rechazo con codigo 409

  @edge-case @hu-03 @criterio-3-3
  Escenario: La regla de consultorios se preserva sin contratos nuevos
    Dado que la gestion de consultorios ya implementa la regla operativa definida previamente
    Cuando se ejecutan los refinamientos de navegacion y naming de esta spec
    Entonces la regla libre ocupado sigue vigente
    Y no se agregan endpoints ni cambios de autorizacion
```

## Datos de prueba sinteticos

| Escenario             | Campo          | Valido                       | Invalido                                 | Borde                           |
| --------------------- | -------------- | ---------------------------- | ---------------------------------------- | ------------------------------- |
| Navbar autenticado    | rol            | admin, recepcionista, doctor | rol no autenticado sin profile           | loading true o profile null     |
| Navbar autenticado    | enlace visible | Dashboard visible            | Turnos visible en navbar autenticado     | enlaces por rol intactos        |
| Selector interno      | nombre general | Selector de gestion          | Gestion Operativa como aria-label legacy | etiquetas internas sin cambios  |
| Regla de consultorios | can_disable    | true para consultorio libre  | false para consultorio ocupado           | mensaje de bloqueo visible      |
| Contrato backend      | respuesta      | 409 al deshabilitar ocupado  | 200 sobre consultorio ocupado            | backend sin cambios de endpoint |

## Cobertura observada en el workspace

Esta salida se basa en revision estatica de spec, codigo y pruebas versionadas. No se ejecutaron tests en esta sesion.

### Evidencia reportada como ejecutada para este cambio

- frontend/test/components/Navbar.spec.tsx
- frontend/test/components/OfficeManager.spec.tsx
- frontend/test/app/admin/profiles/page.spec.tsx
- Resultado informado: 3 suites passed, 25 tests passed

### Evidencia complementaria existente en el repo

- frontend/test/app/page.spec.tsx cubre la carga de la pantalla publica
- backend/producer/test/src/offices/office.controller.spec.ts cubre el rechazo 409 al deshabilitar un consultorio ocupado
