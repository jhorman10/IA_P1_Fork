# Matriz de Riesgos ASD - structured-operational-audit-trail

## 1. Resumen

Contexto del analisis actualizado:

- SPEC-011 introduce una bitacora operativa separada para producer y una vista administrativa read-only.
- La ultima revision confirma que el `AuditInterceptor` ya alinea la semantica del payload para `PROFILE_CREATED`, `PROFILE_UPDATED`, `DOCTOR_CHECK_IN`, `DOCTOR_CHECK_OUT`, `APPOINTMENT_CREATED` y `SESSION_RESOLVED`.
- La ultima revision tambien confirma que el adapter de Mongoose ya propaga `id` persistente y `createdAt` en la ruta de lectura.
- Evidencia reportada para backend: suite del interceptor con 14 tests verdes y 6 suites audit-focused con 36 tests verdes.
- Evidencia frontend revisada: page, filters, table, hook y service continúan en verde.

Riesgos abiertos: 4 | Alto (A): 0 | Medio (S): 3 | Bajo (D): 1

Leyenda ASD:

- A = testing obligatorio, bloquea cierre QA si sigue abierto.
- S = testing recomendado, debe documentarse si se difiere.
- D = control deseable, priorizable sin bloqueo inmediato.

## 2. Riesgos altos cerrados en esta revision

### R-001 - Payload auditado no alineado con la semantica de negocio

Estado actual: Cerrado.

Evidencia de cierre:

- `AuditInterceptor` ahora construye detalles especificos por accion y hace prefetch del estado previo para `PROFILE_UPDATED`.
- `DOCTOR_CHECK_IN` y `DOCTOR_CHECK_OUT` toman `doctorName`, `office` y `previousStatus` desde la respuesta real del flujo.
- `SESSION_RESOLVED` toma `role` y `email` desde la respuesta resuelta de sesion.
- La suite del interceptor cubre de forma explicita esos payloads y la deduplicacion de sesion.

### R-002 - Contrato de lectura sin `id` ni `createdAt` reales

Estado actual: Cerrado.

Evidencia de cierre:

- `MongooseOperationalAuditAdapter.findPaginated()` ahora devuelve `id` y `createdAt` en el read model.
- La suite del adapter valida el mapeo de ambos campos.
- La suite de `AuditController` valida que la respuesta HTTP expone `id` y `createdAt` en el contrato consumido por frontend.

## 3. Matriz de riesgos abiertos

| ID    | HU / Area              | Descripcion del riesgo                                                                                                                                     | Factores de riesgo                                               | Nivel ASD | Testing requerido  | Control actual                                                                 |
| ----- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------- | ------------------ | ------------------------------------------------------------------------------ |
| R-003 | HU-01 / HU-02          | No hay evidencia directa HTTP->DB de que cada endpoint auditable genere exactamente un registro y de que las validaciones fallidas generen cero registros  | Integracion multi-capa, feature nueva, evidencia incompleta      | S         | Recomendado        | Cobertura fuerte en interceptor, adapter, controller y frontend                |
| R-004 | HU-01                  | La estrategia fire-and-forget acepta perdida de eventos si Mongo falla; el control operativo sigue siendo `console.warn` sin metrica o alerta estructurada | Dependencia externa, auditoria sensible, observabilidad limitada | S         | Recomendado        | El comportamiento esta testeado y sigue la spec, pero no hay control adicional |
| R-005 | HU-02                  | Los bordes de consulta aun carecen de evidencia dirigida para UTC/rango inclusivo y pagina fuera de rango con respuesta vacia estable                      | Datos temporales, edge cases de paginacion, posible drift UI/API | S         | Recomendado        | UI vacia y filtros existen; falta prueba dirigida del contrato de borde        |
| R-006 | Performance / Gobierno | No hay SLA cuantitativo ni linea base de volumen para la bitacora; ademas el filtro por actor dispara consultas por cada cambio de input                   | Feature admin-only, crecimiento de coleccion, performance        | D         | Opcional / backlog | Existen indices y limite server-side de 100 registros                          |

## 4. Riesgos recomendados a seguir

### R-003 - Evidencia indirecta por endpoint

- Recomendacion:
  - Agregar pruebas de integracion por endpoint que afirmen una sola escritura de auditoria por operacion exitosa.
  - Agregar al menos un caso real por endpoint clave donde una validacion fallida afirme cero escrituras persistidas.

### R-004 - Perdida silenciosa de auditoria ante falla de Mongo

- Recomendacion:
  - Incorporar metrica, contador o alerta sobre fallos de escritura de auditoria.
  - Evaluar retry acotado o canal secundario si compliance no admite perdida silenciosa.

### R-005 - Bordes de fechas y pagina vacia

- Recomendacion:
  - Agregar prueba backend del filtro inclusivo `timestamp >= from && timestamp <= to` con registros de borde.
  - Agregar prueba del contrato `page=999` con `data: []` y metadatos estables.
  - Agregar prueba frontend para conversion de `Desde/Hasta` en limites UTC.

### R-006 - Performance sin baseline formal

- Recomendacion:
  - Definir volumen objetivo de auditoria y politica de retencion/archivo.
  - Evaluar debounce o cancelacion de requests en el filtro por actor si el uso crece.

## 5. Decision QA desde riesgo

Resultado QA local: condicional, sin riesgos A abiertos.

Interpretacion:

- Los bloqueadores altos previos R-001 y R-002 quedan cerrados con evidencia suficiente en implementacion y tests revisados.
- QA ya no depende de gaps de severidad alta para SPEC-011.
- El estado actual queda condicionado solo por gaps medios/recomendados de evidencia integral, bordes de consulta y observabilidad operativa.
