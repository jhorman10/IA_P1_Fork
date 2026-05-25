---
id: SPEC-001
status: DRAFT
feature: conversiones
version: "1.0"
created: 2026-03-13
source_requirement: .github/requirements/conversiones.md
---

## goal
Convertir KPI Conversiones del Dashboard en punto de entrada navegable hacia módulo analítico dedicado `/conversiones`.

## scope
- **in:** tarjeta StatCard interactiva, página /conversiones (KPIs, tendencia, tabla paginada)
- **out (fase 2):** distribución por tipo de conversión
- **no-change:** otros 3 StatCards del Dashboard

## api
| method | path | auth | description |
|---|---|---|---|
| GET | /api/v1/conversiones/summary | Bearer | KPIs resumen: rate, total, avg_value, new |
| GET | /api/v1/conversiones/trend | Bearer | Serie diaria, query: `days` (1-90, default 30) |
| GET | /api/v1/conversiones/recent | Bearer | Paginado; query: `page`≥1 `limit`≤50 default 10 |
| GET | /api/v1/conversiones/distribution | Bearer | Fase 2 opcional; 404 si deshabilitado |

errors: 401 token ausente/inválido · 422 params inválidos

## data_model
collection: `conversiones`
| field | type | constraints |
|---|---|---|
| uid | str | Firebase UID |
| user_uid | str | Firebase UID, indexed |
| conversion_type | str | max 100 chars, indexed |
| status | str | enum: completada·pendiente·cancelada |
| value | float | ≥ 0 |
| occurred_at | datetime UTC | indexed desc |
| created_at | datetime UTC | auto |
| updated_at | datetime UTC | auto |

indexes:
- `{ occurred_at: -1, status: 1 }` — tendencia + recientes
- `{ user_uid: 1 }`
- `{ conversion_type: 1 }` — fase 2

## ui
### new components
| component | path | props |
|---|---|---|
| ConversionesRecentTable | components/ConversionesRecentTable.jsx | rows, pagination, onPageChange, loading |
| ConversionesTrendChart | components/charts/ConversionesTrendChart.jsx | data, loading |
| ConversionesDistributionChart (f2) | components/charts/ConversionesDistributionChart.jsx | data, loading |

### new pages
| page | path | route | protected |
|---|---|---|---|
| ConversionesPage | pages/ConversionesPage.jsx | /conversiones | yes |

### new hooks / services
- `useConversiones.js` → retorna: summary, trend, recent, pagination, loading, error, loadPage
- `conversionesService.js` → getConversionesSummary · getConversionesTrend · getConversionesRecent · getConversionesDistribution

### changes to existing
- `StatCard.jsx`: añadir `onClick?` opcional + a11y (role=button, cursor pointer) sin romper otros 3 KPIs
- `DashboardPage.jsx`: habilitar onClick solo para KPI id=`conversiones`
- `App.jsx`: registrar `<ProtectedRoute path="/conversiones" element={<ConversionesPage/>}/>`
- `backend/app/main.py`: registrar `conversiones_router`

## business_rules
1. Acceso solo a Usuario autenticado (idToken Firebase)
2. Estados válidos: completada · pendiente · cancelada
3. Dashboard = solo resumen; /conversiones = exploración
4. Paginación: limit=10 default, page inicia en 1
5. Timestamps snake_case UTC (created_at, updated_at)
6. uid en conversión = UID Firebase del registro, no del usuario
7. Distribución por tipo fuera del entregable fase 1

## acceptance
- HU-01: clic en StatCard Conversiones → navega a /conversiones sin reload
- HU-01 err: usuario no autenticado → redirect /login
- HU-01 edge: otros 3 StatCards sin cambio de comportamiento
- HU-02: carga /conversiones → encabezado + 4 KPIs + gráfico 30d + tabla
- HU-02 err: falla backend → error state visible, layout intacto; 401 si token inválido
- HU-02 edge: sin registros → empty state, paginación deshabilitada
- HU-03: >10 registros → pagina carga siguiente bloque
- HU-03 err: page<1 o limit fuera de rango → 422, sin consulta DB
- HU-03 edge: status inválido → backend rechaza 400 + detail catálogo

## tasks
### backend
- [ ] conversiones_model.py (ConversionSummaryResponse, TrendResponse, RecentResponse, doc Conversion)
- [ ] conversiones_repository.py (summary agg, trend agg, recent paginado)
- [ ] conversiones_service.py (reglas negocio, validaciones params)
- [ ] conversiones_router.py (summary, trend, recent; distribution fase 2)
- [ ] registrar router en main.py
### backend tests
- [ ] test_get_summary_success
- [ ] test_get_trend_default_30_days_success
- [ ] test_get_recent_pagination_success
- [ ] test_get_recent_invalid_page_returns_422
- [ ] test_get_conversiones_without_token_returns_401
- [ ] test_distribution_disabled_returns_404

### frontend
- [ ] Extender StatCard (onClick opcional, a11y)
- [ ] DashboardPage: habilitar nav KPI conversiones
- [ ] conversionesService.js
- [ ] useConversiones.js
- [ ] ConversionesPage.jsx + .module.css
- [ ] ConversionesRecentTable.jsx
- [ ] ConversionesTrendChart.jsx
- [ ] registrar ruta en App.jsx
### frontend tests
- [ ] StatCard navigates only when onClick provided
- [ ] DashboardPage routes to /conversiones on KPI click
- [ ] ConversionesPage blocks unauthenticated access
- [ ] ConversionesPage renders 4 KPI cards
- [ ] ConversionesRecentTable paginates 10 rows/page
- [ ] ConversionesPage shows error state on service failure

### qa
- [ ] gherkin HU-01..HU-04
- [ ] risk-identifier ASD classification
- [ ] no-regression StatCards existentes

## risks_summary
| risk | level | mitigation |
|---|---|---|
| Rotura StatCard otros KPIs | A | onClick optional; unit test para cada KPI existente |
| Token inválido en endpoints | A | auth middleware en todos los routes |
| Paginación out-of-bounds | M | FastAPI query validators + test 422 |
| Fase 2 parcialmente activada | B | flag de config + 404 explícito |
