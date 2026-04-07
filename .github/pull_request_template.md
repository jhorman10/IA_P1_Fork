## Objetivo del PR

<!-- Qué problema resuelve este PR, qué cambia y cuál es el resultado esperado. -->

## Referencias

- Requirement:
- Spec:
- Issue / Ticket:
- Evidencia QA / Docs relacionadas:

## Alcance

### Incluye

-

### No incluye

-

## Impacto técnico

| Área                                 | Impacto |
| ------------------------------------ | ------- |
| Backend                              |         |
| Frontend                             |         |
| Infra / Eventos / Mensajería         |         |
| Datos / Schemas / Migraciones        |         |
| Configuración / Variables de entorno |         |

## Orden sugerido de revisión

<!-- Ejemplo: revisar HT-01 -> HU-01 -> HT-02 -> HT-03 -> HU-02 -> HT-04 -> HT-05 -> HT-06 -> HU-03 -->

1.
2.
3.

## Trazabilidad HT/HU

<!--
Usa esta tabla para dejar trazabilidad por HT/HU y commit.
Si existe un archivo PR_BODY_*.md preparado para este feature, copia aquí la tabla final.
-->

| Orden | Elemento | Depende de       | Commit  | Backend                    | Frontend | Tests                          |
| ----- | -------- | ---------------- | ------- | -------------------------- | -------- | ------------------------------ |
| 1     | HT-XX    | Spec o HT previo | abc1234 | archivo1.ts<br>archivo2.ts | —        | test1.spec.ts<br>test2.spec.ts |

## Validación ejecutada

### Automatizada

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E / Smoke tests

### Manual

- [ ] Flujo principal validado
- [ ] Casos de error validados
- [ ] Regresión básica validada

### Evidencia

<!-- Pega comandos ejecutados, salidas resumidas, screenshots o links a evidencia. -->

## Riesgos y despliegue

### Riesgos conocidos

-

### Compatibilidad / Breaking changes

- [ ] No hay breaking changes
- [ ] Sí hay breaking changes y están documentados abajo

<!-- Si hay breaking changes, describir contrato afectado, consumidores impactados y mitigación. -->

### Cambios de configuración / datos

- [ ] No requiere cambios de configuración
- [ ] Sí requiere cambios de configuración / datos

<!-- Si aplica, detallar variables de entorno, seeds, migraciones, colas, índices o datos existentes. -->

### Plan de despliegue

1.
2.
3.

### Plan de rollback

1.
2.

## Checklist del autor

- [ ] El alcance del PR está acotado y explicado
- [ ] La trazabilidad HT/HU está completa
- [ ] Las pruebas ejecutadas están documentadas
- [ ] Los riesgos y el despliegue están documentados
- [ ] No se incluyen cambios ajenos al objetivo del PR
