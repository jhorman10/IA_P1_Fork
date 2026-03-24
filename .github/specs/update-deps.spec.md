---
id: SPEC-002
status: IMPLEMENTED
feature: update-deps
created: 2026-03-24
updated: 2026-03-24
author: spec-generator
version: "1.0"
related-specs: []
---

# Spec: Actualización Progresiva de Dependencias

> **Estado:** `IMPLEMENTED`.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción

Este feature resuelve conflictos de dependencias, paquetes deprecados e incompatibilidades de versiones detectadas en los tres subproyectos del monorepo (`backend/producer`, `backend/consumer`, `frontend`). El objetivo es eliminar el workaround `--legacy-peer-deps` de los Dockerfiles y dejar el stack en un estado limpio, correctamente instalable y con el test runner funcional.

### Requerimiento de Negocio

Durante el análisis de arranque (`feature/update-deps`) se detectaron cuatro categorías de problemas:

1. **Conflicto de peer deps** que requiere `--legacy-peer-deps` como workaround en los Dockerfiles del consumer y frontend.
2. **Incompatibilidad de versiones** entre `ts-jest@^29.x` y `jest@^30.x` que rompe el test runner en los tres proyectos.
3. **Paquetes deprecados** (`@types/helmet`, `source-map-support`) que añaden superficie de riesgo sin valor.
4. **Target TypeScript obsoleto** (`ES2017`) inconsistente con la runtime base (Node 20 / ES2022+).

### Historias de Usuario

#### HU-01: Instalación limpia sin flags de compatibilidad

```
Como:        Desarrollador del proyecto
Quiero:      Poder ejecutar `npm install` sin `--legacy-peer-deps` en todos los subproyectos
Para:        Eliminar el workaround de los Dockerfiles y garantizar resolución de dependencias determinística

Prioridad:   Alta
Estimación:  S
Dependencias: Ninguna
Capa:        DevOps / package.json
```

#### Criterios de Aceptación — HU-01

**Happy Path**

```gherkin
CRITERIO-1.1: Instalación limpia en producer
  Dado que:  el Dockerfile del producer NO tiene --legacy-peer-deps
  Cuando:    se ejecuta `npm install` dentro del contenedor
  Entonces:  npm instala sin errores ERESOLVE y sin warnings de peer deps
```

```gherkin
CRITERIO-1.2: Instalación limpia en consumer
  Dado que:  el Dockerfile del consumer NO tiene --legacy-peer-deps
  Cuando:    se ejecuta `npm install` dentro del contenedor
  Entonces:  npm instala sin errores ERESOLVE y sin warnings de peer deps
```

```gherkin
CRITERIO-1.3: Instalación limpia en frontend
  Dado que:  el Dockerfile del frontend NO tiene --legacy-peer-deps
  Cuando:    se ejecuta `npm install` dentro del contenedor
  Entonces:  npm instala sin errores ERESOLVE y sin warnings de peer deps
```

**Edge Case**

```gherkin
CRITERIO-1.4: Stack levanta correctamente tras limpieza
  Dado que:  se eliminó eslint-plugin-import de los tres package.json
  Cuando:    se ejecuta `docker compose up -d --build`
  Entonces:  todos los contenedores alcanzan estado healthy/running
             y los endpoints /health responden 200
```

---

#### HU-02: Test runner compatible con Jest 30

```
Como:        Desarrollador del proyecto
Quiero:      Que `npm test` ejecute la suite completa sin errores de incompatibilidad
Para:        Mantener la cobertura funcional y poder añadir tests sin fricción

Prioridad:   Alta
Estimación:  XS
Dependencias: Ninguna
Capa:        DevOps / package.json
```

#### Criterios de Aceptación — HU-02

**Happy Path**

```gherkin
CRITERIO-2.1: Tests pasan en producer con ts-jest@29.4.6 + jest@30
  Dado que:  ts-jest está en versión ^29.4.6 y jest en ^30.x en producer
  Cuando:    se ejecuta `npm test` en backend/producer
  Entonces:  la suite ejecuta sin errores de incompatibilidad de versiones
             y el reporte de cobertura se genera correctamente
```

```gherkin
CRITERIO-2.2: Tests pasan en consumer con ts-jest@29.4.6 + jest@30
  Dado que:  ts-jest está en versión ^29.4.6 y jest en ^30.x en consumer
  Cuando:    se ejecuta `npm test` en backend/consumer
  Entonces:  la suite ejecuta sin errores de incompatibilidad de versiones
```

```gherkin
CRITERIO-2.3: Tests pasan en frontend con ts-jest@29.4.6 + jest@30
  Dado que:  ts-jest está en versión ^29.4.6 y jest en ^30.x en frontend
  Cuando:    se ejecuta `npm test` en frontend
  Entonces:  la suite ejecuta sin errores de incompatibilidad de versiones
```

**Error Path**

```gherkin
CRITERIO-2.4: No hay regresión en tests existentes
  Dado que:  ts-jest se actualizó a ^29.4.6 con jest en ^30.x
  Cuando:    se ejecuta `npm test -- --coverage` en cualquier subproyecto
  Entonces:  todos los tests que pasaban antes siguen pasando
             y ningún test nuevo falla por cambio de configuración
```

---

#### HU-03: Eliminar paquetes deprecados y sin uso

```
Como:        Desarrollador del proyecto
Quiero:      Que el árbol de dependencias no contenga paquetes deprecados ni sin uso real
Para:        Reducir la superficie de riesgo de seguridad y simplificar el mantenimiento

Prioridad:   Media
Estimación:  XS
Dependencias: HU-01
Capa:        DevOps / package.json
```

#### Criterios de Aceptación — HU-03

**Happy Path**

```gherkin
CRITERIO-3.1: @types/helmet eliminado del producer
  Dado que:  helmet@^8 incluye sus propias definiciones TypeScript
  Cuando:    se remueve @types/helmet del devDependencies del producer
  Entonces:  `npm run build` compila sin errores de tipos relacionados con helmet
             y `tsc --noEmit` no reporta errores
```

```gherkin
CRITERIO-3.2: source-map-support eliminado del producer
  Dado que:  Node.js 20 soporta --enable-source-maps de forma nativa
  Cuando:    se remueve source-map-support y se añade NODE_OPTIONS a los scripts de arranque
  Entonces:  los stack traces en desarrollo muestran líneas TypeScript originales correctamente
```

```gherkin
CRITERIO-3.3: source-map-support eliminado del consumer
  Dado que:  Node.js 20 soporta --enable-source-maps de forma nativa
  Cuando:    se remueve source-map-support del consumer
  Entonces:  el arranque del consumer no produce errores de módulo no encontrado
```

---

#### HU-04: Target TypeScript alineado con runtime (Node 20)

```
Como:        Desarrollador del proyecto
Quiero:      Que el tsconfig compile hacia ES2022 en los backends
Para:        Usar capacidades modernas del motor JS, output más eficiente y menos polyfills

Prioridad:   Baja
Estimación:  XS
Dependencias: HU-01, HU-02
Capa:        Backend (producer + consumer)
```

#### Criterios de Aceptación — HU-04

**Happy Path**

```gherkin
CRITERIO-4.1: Producer compila hacia ES2022 sin errores
  Dado que:  tsconfig.json del producer tiene "target": "ES2022"
  Cuando:    se ejecuta `nest build`
  Entonces:  compila exitosamente y el servicio arranca sin errores en Node 20
```

```gherkin
CRITERIO-4.2: Consumer compila hacia ES2022 sin errores
  Dado que:  tsconfig.json del consumer tiene "target": "ES2022"
  Cuando:    se ejecuta `nest build`
  Entonces:  compila exitosamente y el servicio arranca sin errores en Node 20
```

**Edge Case**

```gherkin
CRITERIO-4.3: emitDecoratorMetadata compatible con ES2022
  Dado que:  NestJS requiere emitDecoratorMetadata: true
  Cuando:    se cambia target a ES2022 manteniendo emitDecoratorMetadata: true
  Entonces:  los decoradores de NestJS funcionan correctamente sin errores de runtime
```

---

### Reglas de Negocio

1. **Migración progresiva por fases**: cada fase deja el stack en estado funcional y deployable de forma independiente.
2. **Sin cambios de API ni lógica de dominio**: este feature es exclusivamente de infraestructura de dependencias. Cero cambios en `src/`.
3. **Los Dockerfiles terminan sin `--legacy-peer-deps`**: el workaround aplicado en la rama actual se revierte al completar la Fase 1.
4. **Cobertura de tests no puede decrecer**: los tests existentes deben pasar después de cada fase.
5. **`eslint-plugin-import` se elimina, no se reemplaza**: los flat configs de los tres subproyectos no lo usan; agregar `eslint-plugin-import-x` queda fuera del alcance de esta spec.

---

## 2. DISEÑO

### Diagnóstico Completo de Dependencias

#### Tabla de problemas detectados

| #    | Paquete                | Versión actual      | Problema                                                                                                                                                                 | Severidad | Afecta                       |
| ---- | ---------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------------------------- |
| P-01 | `eslint-plugin-import` | `^2.32.0`           | No declara soporte para ESLint 10 en peer deps (`"^9"` max). Causa ERESOLVE en npm install limpio. Además, el paquete **no se usa** en ninguno de los tres flat configs. | 🔴 Alta   | producer, consumer, frontend |
| P-02 | `ts-jest`              | `^29.4.6` (BE y FE) | Compatibilidad versionada con Jest 30. `ts-jest@^30` no existe en npm; la combinación soportada y validada es `ts-jest@^29.4.6` con `jest@^30.x`.                        | 🟡 Media  | producer, consumer, frontend |
| P-03 | `@types/helmet`        | `^0.0.48`           | Paquete deprecated en DefinitelyTyped. Helmet v5+ incluye sus propias definiciones. Puede generar conflictos de tipos.                                                   | 🟡 Media  | producer                     |
| P-04 | `source-map-support`   | `^0.5.21`           | Último release significativo en 2019. Node.js 18+ tiene `--enable-source-maps` nativo. El mantenedor lo considera superseded.                                            | 🟡 Media  | producer, consumer           |
| P-05 | `tsconfig` target      | `"es2017"`          | Node 20 (runtime en Docker) soporta ES2022. El target conservador impide optimizaciones del compilador y genera output innecesariamente polyfilled.                      | 🟢 Baja   | producer, consumer           |

#### Tabla de paquetes SIN acción requerida (descartados del alcance)

| Paquete                             | Motivo de descarte                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `mongoose@^9.2.1`                   | Versión mayor actual. Solo patches disponibles.                                |
| `amqp-connection-manager@^5.0.0`    | Versión estable actual, sin sucesor.                                           |
| `reflect-metadata@^0.2.1`           | NestJS 11 aún lo requiere. TC39 decorators nativos no son compatibles todavía. |
| `experimentalDecorators: true`      | Requerido por NestJS 11. No migrar hasta NestJS adopte TC39 decorators.        |
| `ts-loader@^9.4.3`                  | NestJS CLI lo usa internamente para webpack builds. Compatible con webpack 5.  |
| `babel-plugin-react-compiler@1.0.0` | Versión estable del React Compiler. Sin versión mayor siguiente confirmada.    |

---

### Plan de Migración por Fases

#### FASE 1 — Desbloqueantes de CI (Alta prioridad)

**Objetivo:** Eliminar `--legacy-peer-deps` de los Dockerfiles y hacer funcionar el test runner.

**Cambios en `backend/producer/package.json`:**

```diff
  "devDependencies": {
-   "eslint-plugin-import": "^2.32.0",
-   "ts-jest": "^29.1.0",
+   "ts-jest": "^29.4.6",
    ...
  }
```

**Cambios en `backend/consumer/package.json`:**

```diff
  "devDependencies": {
-   "eslint-plugin-import": "^2.32.0",
-   "ts-jest": "^29.1.0",
+   "ts-jest": "^29.4.6",
    ...
  }
```

**Cambios en `frontend/package.json`:**

```diff
  "devDependencies": {
-   "eslint-plugin-import": "^2.32.0",
-   "ts-jest": "^29.4.6",
+   "ts-jest": "^29.4.6",
    ...
  }
```

**Cambios en `backend/consumer/Dockerfile` (revertir workaround):**

```diff
- RUN npm install --legacy-peer-deps
+ RUN npm install
```

**Cambios en `frontend/Dockerfile` (revertir workaround):**

```diff
- RUN npm install --legacy-peer-deps
+ RUN npm install
```

> **El Dockerfile del producer** ya tenía `--legacy-peer-deps` antes de esta rama (por `ts-loader` + otras deps). Se evalúa en esta misma fase si también puede eliminarse tras quitar `eslint-plugin-import`.

---

#### FASE 2 — Eliminación de paquetes deprecados (Media prioridad)

**Objetivo:** Remover `@types/helmet` y `source-map-support`.

**Cambios en `backend/producer/package.json`:**

```diff
  "devDependencies": {
-   "@types/helmet": "^0.0.48",
-   "source-map-support": "^0.5.21",
    ...
  }
```

**Cambios en `backend/consumer/package.json`:**

```diff
  "devDependencies": {
-   "source-map-support": "^0.5.21",
    ...
  }
```

**Activar source maps nativos en scripts y Dockerfile:**

En `backend/producer/Dockerfile` y `backend/consumer/Dockerfile`, el CMD de desarrollo pasa a:

```dockerfile
CMD ["node", "--enable-source-maps", "dist/main.js"]
```

O alternativamente en `package.json`:

```json
"start:dev": "NODE_OPTIONS='--enable-source-maps' nest start --watch"
```

---

#### FASE 3 — Modernización de target TypeScript (Baja prioridad)

**Objetivo:** Alinear el target del compilador con Node 20.

**Cambios en `backend/producer/tsconfig.json`:**

```diff
  "compilerOptions": {
-   "target": "es2017",
+   "target": "ES2022",
    ...
  }
```

**Cambios en `backend/consumer/tsconfig.json`:**

```diff
  "compilerOptions": {
-   "target": "es2017",
+   "target": "ES2022",
    ...
  }
```

> **Validación obligatoria:** tras el cambio, ejecutar `nest build` y los tests de integración para confirmar que `emitDecoratorMetadata` + `experimentalDecorators` siguen funcionando con ES2022 output. Node.js 20 es compatible con toda la sintaxis ES2022.

---

### Arquitectura y Dependencias

- **Sin cambios en `src/`**: esta spec no toca código de aplicación.
- **Sin cambios en `docker-compose.yml`**: la imagen base `node:20-slim` es correcta.
- **Impacto en CI**: los `package-lock.json` cambian. Cualquier pipeline de CI que use `npm ci` debe invalidar caché de node_modules.
- **Impacto en tests**: cambiar `ts-jest` requiere revisar si `jest.config.js/ts` usa opciones de configuración renombradas entre v29 y v30 (ver [ts-jest changelog v30](https://kulshekhar.github.io/ts-jest/docs/changelog)).

### Notas de Implementación

> - **Por qué eliminar en lugar de reemplazar `eslint-plugin-import`**: los tres proyectos ya usan `eslint-plugin-simple-import-sort` para ordenar imports, que cubre el caso de uso más común. Los flat configs no referencian ninguna regla de `eslint-plugin-import`. Eliminarlo es la acción más conservadora.
> - **Por qué `ts-jest@^29.4.6` y no `@swc/jest`**: `ts-jest@^30` no está publicado en npm. La combinación compatible y validada por pruebas es `ts-jest@^29.4.6` con `jest@^30.x`. La migración a SWC queda fuera de alcance.
> - **`--legacy-peer-deps` en producer Dockerfile**: el producer ya tenía este flag antes de la rama porque `@types/express@^5.0.6` generaba otro conflicto. Tras eliminar `eslint-plugin-import`, verificar si el flag puede eliminarse ejecutando `npm install` sin él.

---

## 3. LISTA DE TAREAS

> Checklist accionable. Marcar cada ítem (`[x]`) al completarlo.

### FASE 1 — Desbloqueantes de CI

#### Backend (producer + consumer)

- [x] Eliminar `eslint-plugin-import` de `backend/producer/package.json` devDependencies
- [x] Actualizar `ts-jest` de `^29.1.0` → `^29.4.6` en `backend/producer/package.json`
- [x] Eliminar `eslint-plugin-import` de `backend/consumer/package.json` devDependencies
- [x] Actualizar `ts-jest` de `^29.1.0` → `^29.4.6` en `backend/consumer/package.json`

#### Frontend

- [x] Eliminar `eslint-plugin-import` de `frontend/package.json` devDependencies
- [x] Actualizar `ts-jest` de `^29.4.6` → `^29.4.6` en `frontend/package.json`

#### Dockerfiles

- [x] Revertir `--legacy-peer-deps` en `backend/consumer/Dockerfile` (todos los stages)
- [x] Revertir `--legacy-peer-deps` en `frontend/Dockerfile`
- [x] Verificar si `backend/producer/Dockerfile` puede también eliminar `--legacy-peer-deps`

#### Validación FASE 1

- [x] `docker compose up -d --build` finaliza sin errores de build
- [x] Todos los contenedores alcanzan estado `healthy`
- [x] `GET http://localhost:3000/health` responde 200
- [x] `GET http://localhost:3001` responde 200
- [ ] `npm test` en producer pasa sin errores de versión
- [ ] `npm test` en consumer pasa sin errores de versión
- [ ] `npm test` en frontend pasa sin errores de versión

---

### FASE 2 — Paquetes Deprecated

#### Backend (producer)

- [x] Eliminar `@types/helmet` de `backend/producer/package.json` devDependencies
- [ ] Verificar que `npm run build` en producer no produce errores de tipos de helmet
- [x] Eliminar `source-map-support` de `backend/producer/package.json` devDependencies
- [x] Agregar `--enable-source-maps` al comando de node en Dockerfile production stage del producer

#### Backend (consumer)

- [x] Eliminar `source-map-support` de `backend/consumer/package.json` devDependencies
- [x] Agregar `--enable-source-maps` al comando de node en Dockerfile production stage del consumer

#### Validación FASE 2

- [ ] `nest build` en producer sin errores TypeScript sobre tipos de helmet
- [x] Stack arranca completo con `docker compose up -d` sin module-not-found de source-map-support
- [ ] Stack traces en modo dev muestran referencias a archivos `.ts` originales

---

### FASE 3 — Target TypeScript Moderno

#### Backend (producer + consumer)

- [x] Cambiar `"target": "es2017"` → `"target": "ES2022"` en `backend/producer/tsconfig.json`
- [x] Cambiar `"target": "es2017"` → `"target": "ES2022"` en `backend/consumer/tsconfig.json`

#### Validación FASE 3

- [ ] `nest build` en producer exitoso con target ES2022
- [ ] `nest build` en consumer exitoso con target ES2022
- [x] Decoradores NestJS funcionan en runtime (healthcheck 200 en ambos servicios)
- [ ] Suite de tests completa pasa en producer y consumer sin regresión

---

### QA — Validación Transversal

- [x] `npm install` (sin flags extra) funciona en los tres subproyectos
- [x] `docker compose build --no-cache` exitoso (reproducir build limpio)
- [ ] Cobertura de tests no decrece respecto a la línea base de `develop`
- [ ] Lint (`npm run lint`) pasa sin errores en los tres subproyectos tras eliminar eslint-plugin-import
- [ ] `npm audit` no reporta vulnerabilidades nuevas tras las actualizaciones
