# Casos Gherkin QA - update-deps

## Alcance
Feature de actualización progresiva de dependencias para producer, consumer y frontend, enfocado en instalación limpia, compatibilidad de test runner, eliminación de dependencias deprecadas y alineación de compilación con Node 20.

## Flujos críticos priorizados
- Instalación limpia sin workaround de peer dependencies
- Ejecución estable de suites de pruebas tras actualización de toolchain
- Arranque saludable de contenedores y endpoints de salud
- Compilación y runtime correctos con target ES2022

```gherkin
#language: es
Característica: Estabilidad del monorepo tras actualización de dependencias

  @smoke @critico @happy-path
  Escenario: Instalación limpia en los tres subproyectos
    Dado que los manifiestos de dependencias están actualizados
    Y que los Dockerfiles no usan flags de compatibilidad temporal
    Cuando el equipo instala dependencias en producer, consumer y frontend
    Entonces la instalación finaliza sin errores de resolución de dependencias
    Y el árbol de dependencias queda consistente

  @error-path @critico
  Escenario: Detección temprana de conflicto de dependencias en instalación
    Dado que existe una combinación de versiones no compatible en el toolchain de pruebas
    Cuando se ejecuta la instalación limpia en un entorno sin cache
    Entonces el proceso reporta el conflicto de manera explícita
    Y el release se marca en estado no liberable hasta resolver la incompatibilidad

  @edge-case
  Escenario: Reproducibilidad de build limpio sin cache
    Dado que no existen artefactos previos de instalación
    Cuando se construyen las imágenes con cache deshabilitado
    Entonces el resultado es consistente con la instalación local
    Y no se introducen variaciones por dependencias transitivas

  @smoke @critico @happy-path
  Escenario: Suite de pruebas verde tras actualización del runner
    Dado que la configuración de pruebas está alineada con las versiones declaradas
    Cuando se ejecutan las suites de producer, consumer y frontend
    Entonces todas las pruebas finalizan en estado exitoso
    Y la cobertura no decrece frente a la línea base

  @error-path
  Escenario: Fallo controlado por incompatibilidad de runner de pruebas
    Dado que el adaptador de pruebas no es compatible con la versión del ejecutor
    Cuando el equipo ejecuta la suite en integración continua
    Entonces la suite falla con error de compatibilidad
    Y se bloquea la promoción a ambientes superiores

  @edge-case
  Escenario: Ejecución de pruebas con lockfile regenerado
    Dado que el lockfile fue regenerado por cambio de dependencias
    Cuando se ejecuta la suite completa con cobertura
    Entonces los resultados son deterministas entre ejecuciones consecutivas
    Y no aparecen fallos intermitentes asociados al toolchain

  @smoke @critico @happy-path
  Escenario: Arranque de stack y verificación de salud
    Dado que las imágenes fueron construidas con dependencias actualizadas
    Cuando se levanta el stack completo
    Entonces todos los contenedores alcanzan estado healthy o running
    Y los endpoints de salud responden exitosamente

  @error-path
  Escenario: Detección de regresión por dependencia deprecada removida
    Dado que se removieron paquetes deprecados sin uso esperado
    Cuando el sistema inicia y ejecuta flujos básicos
    Entonces no se presentan errores por módulo ausente
    Y los logs no muestran fallos de arranque relacionados

  @edge-case
  Escenario: Trazas legibles con source maps nativos
    Dado que el runtime usa source maps nativos
    Cuando ocurre una excepción controlada en backend
    Entonces la traza referencia archivos TypeScript
    Y permite diagnóstico sin degradar la operación

  @smoke @critico @happy-path
  Escenario: Compilación backend con target ES2022
    Dado que producer y consumer compilan con target ES2022
    Cuando se ejecuta la compilación en ambos servicios
    Entonces el artefacto generado es válido para Node 20
    Y la aplicación inicia sin errores de runtime

  @error-path
  Escenario: Incompatibilidad de decoradores posterior al cambio de target
    Dado que el framework depende de metadata de decoradores
    Cuando se ejecuta la aplicación tras cambiar el target
    Entonces no se producen errores por metadata ausente
    Y cualquier incompatibilidad detiene la liberación

  @edge-case
  Escenario: Validación de health bajo reinicio de contenedor
    Dado que el servicio reinicia después de desplegar artefactos ES2022
    Cuando el orquestador vuelve a consultar salud
    Entonces el servicio recupera estado saludable en tiempo esperado
    Y mantiene disponibilidad funcional
```

## Datos de prueba sintéticos
| Escenario | Campo | Válido | Inválido | Borde |
|---|---|---|---|---|
| Instalación limpia | Entorno de instalación | Imagen limpia Node 20 | Entorno con lockfile desfasado | Build sin cache |
| Suite de pruebas verde | Configuración runner | Versiones alineadas ejecutor-adaptador | Adaptador de versión anterior | Lockfile recién regenerado |
| Arranque de stack | Estado de contenedores | Todos en healthy o running | Un servicio en crash loop | Reinicio inmediato post deploy |
| Source maps nativos | Trazabilidad de error | Stack trace con archivos TypeScript | Stack trace sin mapeo | Excepción durante arranque |
| Compilación ES2022 | Compatibilidad runtime | Build y arranque exitosos | Error de metadata de decoradores | Reinicio automático tras despliegue |

## Criterios de cobertura mínima para este set
- 1 escenario happy path, 1 error path y 1 edge case por objetivo principal
- Validación transversal en instalación, build, pruebas, arranque y salud
- Evidencia requerida: logs de instalación, reporte de tests, estado de contenedores, health checks, y traza de error controlada
