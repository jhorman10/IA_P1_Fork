Resumen

Este PR agrupa cambios para completar la funcionalidad de asignación de médicos y, principalmente, resolver errores de lint/TypeScript que impedían que la pipeline de CI pasara.

Principales cambios

- backend/producer:
  - Ordené imports y apliqué fixes de ESLint en: src/app.module.ts, src/application/use-cases/doctor.service.impl.ts, src/appointments/appointment-lifecycle.controller.ts, src/appointments/appointment.module.ts
  - Tipé el mapper de citas en src/mappers/appointment.mapper.ts y ajusté src/mappers/doctor.mapper.ts
  - Eliminé una directiva ESLint innecesaria en tests

- backend/consumer:
  - Ejecuté `eslint --fix` en múltiples archivos y commité cada archivo de forma atómica.
  - Tipé la carga útil en `src/infrastructure/adapters/rmq-notification.adapter.ts` (reemplazando `any`).
  - Añadí un encabezado `/* eslint-disable */` en el archivo generado `src/schemas/audit-log.schema.d.ts` para suprimir errores de linter en archivos generados.
  - Eliminé imports no utilizados en `src/app.module.ts`.

- frontend:
  - Aplicado `eslint --fix` y correcciones manuales en varios componentes y tests.
  - Reemplazado `@ts-ignore` por `@ts-expect-error` con descripción en tests donde corresponde.
  - Tipado correcto del `onChange` en `src/components/AppointmentForm/AppointmentForm.tsx` (eliminado `any`).

Verificación local

- Ejecuté localmente las verificaciones equivalentes a CI:
  - `npx tsc --noEmit` y `npx eslint "{src,apps,libs,test}/**/*.ts" --max-warnings=0` en `backend/producer`, `backend/consumer` y `frontend`.
  - Resultado: todas las comprobaciones de TypeScript y ESLint pasan localmente después de estos cambios (solo quedan advertencias informativas sobre parseo ESM de `eslint.config.js` y avisos de deprecación de Node.js en Actions).

Notas y decisiones

- Prefiero no editar generadores; en su lugar añadí supresión de ESLint en archivos `.d.ts` generados.
- Hice commits atómicos por archivo para facilitar la revisión.

Acción solicitada

- Revisar los cambios y ejecutar CI en esta rama. Si todo está correcto, aprobar y fusionar.

(Generado automáticamente por asistentes; pediré ajustes si querés añadir más detalles o formatos específicos.)
