# Casos Gherkin QA - ci-hardening-and-typescript-rectification

## Alcance

Feature de readiness para release sobre evidencia tecnica: CI bloqueante, rectificacion TypeScript y cobertura auth-aware suficiente para afirmar cierre verificable.

Estado de referencia al momento de este QA:

- La pipeline versionada ya no expone `continue-on-error` en integracion ni en E2E obligatorios.
- Existe una suite local de integracion auth-aware con 9 escenarios en producer.
- El E2E backend presente en el repo sigue cubriendo el flujo publico legado.
- El fix puntual de frontend para `useAuth.session.spec.tsx` ya esta aplicado.
- La spec continua en `IN_PROGRESS` y no hay evidencia remota de GitHub Actions adjunta en este workspace.

## Flujos criticos priorizados

- Gate duro de CI para integracion y E2E.
- Resolucion de sesion operativa por rol.
- Operacion protegida despues de autenticar.
- Denegacion por Perfil faltante o contexto medico ajeno.
- Continuidad del flujo publico legado.
- Evidencia remota y cierre TypeScript como condiciones de release.

```gherkin
#language: es
Caracteristica: Evidencia verificable de release para CI endurecido y journey auth-aware

  @smoke @critico @release @ci
  Escenario: La pipeline bloquea la promocion cuando falla una suite de integracion obligatoria
    Dado que existe una version candidata con gates de calidad activos
    Cuando una suite de integracion obligatoria falla durante la validacion
    Entonces la ejecucion se marca como fallida
    Y el cambio no debe promoverse como listo para release

  @smoke @critico @release @ci
  Escenario: La pipeline bloquea la promocion cuando falla un E2E obligatorio
    Dado que existe una version candidata con validaciones end-to-end obligatorias
    Cuando falla una prueba E2E requerida para la salida a produccion
    Entonces la ejecucion se marca como fallida
    Y el release no puede declararse listo solo por evidencia parcial local

  @smoke @critico @auth @role-admin
  Escenario: Un administrador obtiene una sesion operativa con modulos completos
    Dado que el Usuario interno autentica con una cuenta institucional valida
    Y que su Perfil operativo esta activo con rol Administrador
    Cuando solicita iniciar su sesion operativa
    Entonces el sistema resuelve la sesion correctamente
    Y habilita los modulos operativos correspondientes a su rol

  @error-path @critico @seguridad
  Escenario: Un token valido sin Perfil operativo no habilita acceso interno
    Dado que la cuenta autentica correctamente
    Y que no existe un Perfil operativo utilizable para esa cuenta
    Cuando intenta abrir una sesion operativa
    Entonces el sistema rechaza el acceso interno
    Y no habilita modulos protegidos

  @smoke @critico @role-recepcion
  Escenario: Una recepcionista autentica y registra una operacion protegida valida
    Dado que la recepcionista tiene un Perfil activo
    Cuando resuelve su sesion operativa
    Y luego ejecuta un registro permitido por su rol
    Entonces el sistema acepta la operacion
    Y la transaccion entra al flujo operativo esperado

  @edge-case @critico @role-doctor
  Escenario: Un medico solo puede operar sobre su propio contexto asistencial
    Dado que el Medico tiene un Perfil activo vinculado a su propio contexto
    Cuando actua sobre su propio contexto asistencial
    Entonces el sistema permite la operacion
    Pero cuando intenta operar sobre un contexto ajeno
    Entonces el sistema rechaza la accion por autorizacion

  @happy-path @legacy @publico
  Escenario: El flujo publico legado permanece disponible sin autenticacion
    Dado que una persona ingresa a la vista publica del sistema
    Cuando consulta la cola de espera sin autenticarse
    Entonces el sistema expone el flujo publico legado
    Y la disponibilidad publica se mantiene como comportamiento actual

  @edge-case @pending-evidence @typescript
  Escenario: La validacion TypeScript global detecta deuda residual fuera del cambio minimo
    Dado que el fix puntual del frontend ya fue aplicado en el alcance de la spec
    Y que aun existen errores TypeScript ajenos en otras pruebas del repo
    Cuando el equipo intenta usar un chequeo global como evidencia de cierre
    Entonces la spec no debe marcarse completa solo con esa corrida
    Y el cierre queda condicionado a corregir o acotar formalmente la deuda residual

  @edge-case @pending-evidence @release @remote
  Escenario: El cierre de release exige evidencia remota del workflow endurecido
    Dado que el workflow versionado refleja gates mas estrictos
    Cuando todavia no existe una corrida remota de GitHub Actions adjunta
    Entonces la readiness de release se considera condicionada
    Y la spec no debe declararse completa solo con evidencia local
```

## Datos de prueba sinteticos

| Escenario               | Campo                | Valido                                   | Invalido                       | Borde                                        |
| ----------------------- | -------------------- | ---------------------------------------- | ------------------------------ | -------------------------------------------- |
| Gate de integracion     | Resultado de suite   | Todas las validaciones pasan             | Una suite obligatoria falla    | Falla intermitente en entorno remoto         |
| Gate de E2E             | Cobertura E2E        | Flujo requerido en verde                 | E2E obligatorio en rojo        | Solo existe E2E de flujo publico             |
| Sesion admin            | Perfil operativo     | Administrador activo                     | Perfil faltante                | Perfil inactivo                              |
| Operacion recepcionista | Permiso de rol       | Recepcionista activa                     | Rol sin permiso                | Token valido con Perfil no operativo         |
| Contexto medico         | Ownership            | Contexto propio                          | Contexto ajeno                 | Medico con asociacion incompleta             |
| Validacion TypeScript   | Estado del workspace | Sin diagnosticos en el alcance requerido | Diagnosticos globales abiertos | Errores ajenos fuera del cambio minimo       |
| Evidencia remota        | Corrida de CI        | Run remoto adjunto y verde               | Sin evidencia remota           | Verde local con entorno remoto no confirmado |

## Mapeo de evidencia actual

| Grupo              | Evidencia actual                                                                                                                                                                        | Estado                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| CI endurecido      | [.github/workflows/ci.yml](../../../.github/workflows/ci.yml) ya ejecuta integracion y E2E sin `continue-on-error` visible en el workflow actual                                        | Parcialmente verificado en repo |
| Cobertura backend  | [backend/producer/jest.config.js](../../../backend/producer/jest.config.js) y [backend/consumer/jest.config.js](../../../backend/consumer/jest.config.js) exigen 80% global             | Verificado                      |
| Cobertura frontend | [frontend/jest.config.ts](../../../frontend/jest.config.ts) recolecta coverage, pero no se verifico threshold equivalente en esta evidencia                                             | Gap abierto                     |
| Auth-aware local   | [backend/producer/test/src/auth/spec-005-auth-aware.integration.spec.ts](../../../backend/producer/test/src/auth/spec-005-auth-aware.integration.spec.ts) cubre 9 escenarios integrados | Verificado local                |
| E2E backend        | [backend/e2e/appointment.e2e.spec.ts](../../../backend/e2e/appointment.e2e.spec.ts) sigue siendo flujo publico legado                                                                   | Gap abierto                     |
| Frontend puntual   | [frontend/test/hooks/useAuth.session.spec.tsx](../../../frontend/test/hooks/useAuth.session.spec.tsx) cubre limpieza de sesion ante fallo                                               | Verificado puntual              |

## Gaps residuales que este QA mantiene visibles

- No existe en el workspace evidencia remota de GitHub Actions para afirmar release readiness completo.
- La cobertura auth-aware es fuerte a nivel integracion, pero no existe un E2E black-box auth-aware en `backend/e2e/` ni una ejecucion remota equivalente.
- La spec exige limpieza TypeScript concluyente; con el contexto validado actual, siguen existiendo errores frontend ajenos que impiden cerrar ese criterio como completo.
- El flujo publico legado sigue siendo el unico E2E real observado en el repo, por lo que no debe interpretarse como evidencia suficiente del journey autenticado.
