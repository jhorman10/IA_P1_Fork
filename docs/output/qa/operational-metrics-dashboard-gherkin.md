# Casos Gherkin QA - operational-metrics-dashboard

## Alcance

Feature de dashboard operativo administrativo. Se cubren el endpoint protegido de metricas agregadas, la pagina `/admin/dashboard`, el auto-refresh cada 30 segundos, el manejo de vacio de datos, el comportamiento ante fallas de refresco y el cumplimiento de los KPIs operativos declarados en la spec.

## Flujos criticos priorizados

- Admin autenticado visualiza el dashboard con KPIs operativos del dia.
- El dashboard se refresca automaticamente sin recargar la pagina.
- El acceso queda restringido a rol admin.
- El endpoint protegido rechaza acceso sin autenticacion.
- La UI maneja correctamente jornada sin datos y errores de refresh.

```gherkin
#language: es
Caracteristica: Dashboard administrativo de metricas operativas

  @smoke @critico @hu-01
  Escenario: Administrador visualiza metricas operativas del dia
    Dado que el Administrador esta autenticado
    Cuando abre el dashboard operativo
    Entonces ve los turnos en espera, en atencion y completados del dia
    Y ve la disponibilidad de medicos
    Y ve el tiempo promedio de espera
    Y ve el tiempo promedio de consulta
    Y ve el rendimiento horario del dia

  @happy-path @hu-01
  Escenario: El dashboard se refresca cada 30 segundos
    Dado que el Administrador mantiene abierto el dashboard operativo
    Cuando transcurren 30 segundos
    Entonces el sistema vuelve a consultar las metricas
    Y actualiza la vista sin recargar la pagina

  @error-path @critico @seguridad @hu-01
  Escenario: Usuario no admin intenta acceder al dashboard
    Dado que el Usuario autenticado no tiene rol Administrador
    Cuando intenta abrir el dashboard operativo
    Entonces el sistema bloquea el acceso a las metricas

  @error-path @critico @seguridad @hu-01
  Escenario: Cliente no autenticado consulta metricas
    Dado que no existe sesion autenticada
    Cuando se solicita la consulta de metricas operativas
    Entonces el backend rechaza la solicitud por autenticacion faltante

  @edge-case @hu-01
  Escenario: Inicio de jornada sin turnos ni medicos activos
    Dado que no existen datos operativos del dia
    Cuando el Administrador abre el dashboard
    Entonces los contadores muestran cero
    Y los indicadores sin datos muestran placeholder
    Y el rendimiento muestra cero

  @edge-case @hu-01
  Escenario: Falla un refresh pero el dashboard conserva el ultimo estado valido
    Dado que el dashboard ya mostro metricas validas
    Cuando una consulta de refresh falla
    Entonces el sistema informa un error no intrusivo
    Y mantiene visibles los ultimos datos validos
```

## Datos de prueba sinteticos

| Escenario           | Campo              | Valido                                    | Invalido                    | Borde                                                  |
| ------------------- | ------------------ | ----------------------------------------- | --------------------------- | ------------------------------------------------------ |
| Visualizacion admin | Rol                | `admin`                                   | `recepcionista`             | usuario autenticado sin `display_name`                 |
| Visualizacion admin | Dataset de turnos  | waiting, called, completedToday con datos | dataset vacio               | registros completados con `completedAt` legacy ausente |
| Visualizacion admin | Dataset de medicos | `available`, `busy`, `offline`            | token invalido              | todos los medicos en un mismo estado                   |
| Auto-refresh        | Intervalo          | 30 segundos                               | limpieza faltante del timer | refresh fallido despues de una carga valida            |
| Acceso protegido    | Token              | Bearer valido                             | sin header                  | token valido pero rol no admin                         |
| Jornada vacia       | KPIs               | 0 y placeholder                           | valores inconsistentes      | inicio de dia con menos de una hora transcurrida       |

## Evidencia actual observada en repo

Cobertura encontrada en el repo revisado:

- `backend/producer/test/src/metrics/metrics.controller.spec.ts` valida 200 para admin, 401 sin token o token invalido, 403 para rol no admin y 500 si el caso de uso falla.
- `backend/producer/test/src/application/use-cases/operational-metrics.use-case.spec.ts` valida conteos, throughput, manejo de dataset vacio, exclusion de completados sin `completedAt` valido y calculo de `avgWaitTimeMinutes` / `avgConsultationTimeMinutes` a partir de `APPOINTMENT_ASSIGNED` y `APPOINTMENT_COMPLETED` leidos desde `audit_logs` del consumer.
- `frontend/test/services/metricsService.spec.ts` valida `GET /metrics` con `Authorization: Bearer` y propagacion de 401, 403 y 500.
- `frontend/test/hooks/useOperationalMetrics.spec.ts` valida carga inicial, auto-refresh a 30 segundos, `refetch`, limpieza del intervalo y preservacion del ultimo snapshot valido ante error.
- `frontend/test/app/admin/dashboard/page.spec.tsx` valida loading, error, estado vacio, mensaje de bienvenida y persistencia de la grid junto al error.
- `frontend/test/components/MetricCard.spec.tsx` valida render de etiquetas, valores numericos y placeholders formateados.
- `frontend/test/components/MetricsGrid.spec.tsx` valida render de secciones, duraciones formateadas, throughput y placeholders para metricas nulas.
- `backend/producer/src/infrastructure/adapters/outbound/mongoose-consumer-audit-log.adapter.ts` y `backend/consumer/src/schemas/audit-log.schema.ts` quedan alineados sobre el contrato read-only `audit_logs` usado para inferir tiempos reales.

Riesgos residuales observados en la evidencia real:

- No se reviso una prueba de integracion con Mongo real para la lectura cross-service producer -> consumer sobre `audit_logs`; la confianza actual descansa en unit tests focalizados y en la revision del contrato entre schema y adapter.
- Los promedios siguen pudiendo mostrarse como placeholder cuando faltan eventos suficientes del dia, comportamiento consistente con el contrato `number | null` y ya no considerado bloqueo funcional.
