# Estrategia QA y Matriz de Riesgos ASD - update-deps

## 1) Estrategia QA completa

## Objetivo de calidad
Validar que la actualización de dependencias deja el monorepo instalable, testeable y desplegable sin regresiones funcionales ni degradaciones operativas.

## Alcance
- Backend producer
- Backend consumer
- Frontend
- Dockerfiles y build de imágenes
- Configuración de pruebas y compilación TypeScript

## Fuera de alcance
- Cambios de lógica de dominio en src
- Nuevas funcionalidades de producto
- Optimizaciones mayores de performance no asociadas al cambio de dependencias

## Niveles de prueba
- Smoke técnico: instalación limpia, build, arranque, health
- Regresión automatizada: suites backend y frontend existentes
- Verificación de configuración: versiones de dependencias clave y consistencia con spec
- Pruebas no funcionales básicas: tiempos de instalación/build y estabilidad de arranque

## Evidencia usada en esta evaluación
- Spec: .github/specs/update-deps.spec.md
- Suite backend existente en backend/producer/test y backend/consumer/test
- Suite frontend existente en frontend/test
- Resumen de pruebas en verde reportado en TESTING_SUMMARY.md
- Inspección de manifiestos y Dockerfiles actualizados

## 2) Matriz de riesgos por prioridad (ASD)

## Resumen
Total: 6 riesgos | Alto (A): 2 | Medio (S): 3 | Bajo (D): 1

| ID | HU | Riesgo | Evidencia/Disparador | Nivel ASD | Testing requerido |
|---|---|---|---|---|---|
| R-001 | HU-02 | Riesgo documental por criterio de aceptación desactualizado en spec | La evidencia técnica confirma compatibilidad oficial ts-jest 29.4.6 con jest 30 y suites backend/frontend en verde; la brecha queda en el texto de la spec | D | Opcional |
| R-002 | HU-01 | Falsa sensación de instalación limpia si no se valida build sin cache en todos los subproyectos | Eliminar flags de compatibilidad puede ocultar conflictos transitivos no reproducidos localmente | A | Obligatorio |
| R-003 | HU-03 | Regresión de trazabilidad de errores al remover source-map-support | Cambio a source maps nativos requiere verificación en errores reales | S | Recomendado |
| R-004 | HU-04 | Fallos en runtime por metadata/decoradores tras target ES2022 | Cambio de target afecta compilación y reflexión de NestJS | S | Recomendado |
| R-005 | QA transversal | Deuda de seguridad por no ejecutar auditoría post actualización | Si no se corre npm audit pueden entrar CVEs transitivos nuevos | S | Recomendado |
| R-006 | QA transversal | Incremento acotado de tiempo de CI por cambios de lockfile y cache invalidada | Impacto operativo bajo, pero puede afectar tiempos de feedback | D | Opcional |

## 3) Plan de mitigación (riesgos Alto)

### R-002 - Instalación limpia reproducible
- Mitigación:
  - Ejecutar docker compose build --no-cache para validar reproducibilidad.
  - Confirmar npm install limpio en producer, consumer y frontend.
  - Registrar evidencia de estado healthy y health checks.
- Pruebas obligatorias:
  - Build sin cache.
  - Levante completo del stack.
  - Verificación de endpoints de salud.
- Bloqueante de release: Sí.

## 4) Consideraciones de performance básicas del cambio de dependencias
No se detectan SLAs explícitos en la spec, por lo que no aplica un plan formal de performance tipo load/stress/spike/soak en esta fase. Aun así, para este cambio de dependencias se establecen controles mínimos:

- Baseline operacional:
  - Medir tiempo de npm install en ambiente limpio por subproyecto.
  - Medir tiempo de docker build sin cache.
  - Medir tiempo de startup hasta estado healthy.
- Umbrales sugeridos para control de regresión técnica:
  - Incremento de tiempo de instalación <= 15% respecto a baseline previo.
  - Incremento de tiempo de build <= 15% respecto a baseline previo.
  - Startup de servicios sin superar 60s por contenedor en entorno de CI.
- Señales de alerta:
  - Reintentos de instalación por conflictos transitivos.
  - Incremento sostenido de consumo de memoria en arranque.
  - Fallos intermitentes de tests asociados a toolchain.

## 5) Criterio de salida (go/no-go)

## Entry criteria
- Fase 2 y Fase 3 implementadas.
- Suites de backend y frontend en verde.
- Artefactos QA de gherkin y riesgos generados.

## Exit criteria obligatorios
- Instalación limpia en producer, consumer y frontend sin flags de compatibilidad.
- Build sin cache exitoso del stack.
- Health checks funcionales en servicios expuestos.
- Cobertura no decrece frente a baseline del repositorio.
- Versiones críticas alineadas con criterios de aceptación de la spec.

## Regla de decisión
- GO: todos los criterios obligatorios cumplidos y sin riesgos Alto abiertos.
- NO-GO: existe al menos un riesgo Alto sin mitigación cerrada.

## 6) Plan de regresión

## Suite mínima obligatoria pre-release
- Backend producer:
  - Unit/integration actuales en backend/producer/test
  - Validación build y arranque
- Backend consumer:
  - Unit/integration actuales en backend/consumer/test
  - Validación build y arranque
- Frontend:
  - Unit/component/e2e internos en frontend/test
  - Validación de build y arranque de aplicación

## Ejecución recomendada
1. Validación estática de manifiestos y lockfiles.
2. Instalación limpia en cada subproyecto.
3. Ejecución de suites con cobertura.
4. Build sin cache de imágenes.
5. Levante del stack y health checks.
6. Muestreo de trazas con source maps nativos ante error controlado.

## Criterio de regresión aprobada
- No aparecen fallos nuevos en suites existentes.
- No hay errores de arranque por dependencias removidas.
- No hay incompatibilidades de configuración del test runner.

## 7) Recomendación final
Resultado recomendado: GO (condicional).

Justificación:
- Se confirma avance importante del feature y evidencia de pruebas en verde.
- La incompatibilidad técnica del runner de pruebas queda descartada con evidencia oficial y ejecución exitosa de suites; R-001 deja de ser bloqueante.
- Permanece una validación operativa obligatoria de instalación reproducible sin cache (R-002) para cierre total de salida.

Condición para cambiar a GO:
- Cerrar R-002 con evidencia de build sin cache, levante del stack y health checks en verde.
