# QA Strategy Summary - operational-metrics-dashboard (SPEC-013)

## 1. Scope and evidence base

Feature under review:

- Backend operational metrics endpoint for admin-only aggregated KPIs.
- Frontend admin dashboard for operational metrics.
- Periodic refresh every 30 seconds with preserved last valid data on refresh error.
- Day-scoped operational performance indicators.

Evidence used for this QA deliverable:

- Spec reviewed: `SPEC-013 operational-metrics-dashboard`
- Backend implementation reviewed:
  - `backend/producer/src/application/use-cases/operational-metrics.use-case.impl.ts`
  - `backend/producer/src/infrastructure/adapters/outbound/mongoose-consumer-audit-log.adapter.ts`
- Frontend implementation reviewed:
  - `frontend/src/app/admin/dashboard/page.tsx`
  - `frontend/src/hooks/useOperationalMetrics.ts`
  - `frontend/src/components/MetricsGrid/MetricsGrid.tsx`
- Tests reviewed:
  - `backend/producer/test/src/metrics/metrics.controller.spec.ts`
  - `backend/producer/test/src/application/use-cases/operational-metrics.use-case.spec.ts`
  - `frontend/test/services/metricsService.spec.ts`
  - `frontend/test/hooks/useOperationalMetrics.spec.ts`
  - `frontend/test/app/admin/dashboard/page.spec.tsx`
  - `frontend/test/components/MetricCard.spec.tsx`
  - `frontend/test/components/MetricsGrid.spec.tsx`
- Focused evidence supplied for SPEC-013 after the backend delta:
  - Backend: 2 suites passed, 17 tests passed
  - Frontend: 5 suites passed, 32 tests passed

Note:

- This QA pass reviewed code and existing automated evidence but did not re-run the commands locally.

## 2. Implemented feature footprint reviewed

- `OperationalMetricsUseCaseImpl` aggregates `waiting`, `called`, `completedToday`, doctor counts by status, throughput, and now computes `avgWaitTimeMinutes` plus `avgConsultationTimeMinutes` from `APPOINTMENT_ASSIGNED` / `APPOINTMENT_COMPLETED` events stored in the consumer `audit_logs` collection.
- `MongooseConsumerAuditLogAdapter` reads `audit_logs` in read-only mode and maps `appointmentId`, `action` and `timestamp` into the timing source consumed by the use case.
- `MetricsController` is covered by integration tests that enforce auth and admin-only access to `GET /metrics`.
- `useOperationalMetrics` fetches on mount, auto-refreshes every 30 seconds, exposes `refetch`, and preserves the last valid metrics snapshot when a refresh fails.
- `AdminDashboardPage` blocks unauthorized access through `useRoleGuard(["admin"])`, renders loading and error states, and keeps the last valid grid visible when refresh errors occur.
- `MetricCard` and `MetricsGrid` format counts, durations and throughput, while still rendering `--` placeholders for `null` durations when there is insufficient timing data.

## 3. Test strategy summary

| Area                                | Goal                                                                                                                       | Evidence reviewed                                                                               | QA status |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------- |
| Backend access control              | Validate 200 for admin, 401 for missing or invalid token, and 403 for non-admin                                            | `backend/producer/test/src/metrics/metrics.controller.spec.ts`                                  | Covered   |
| Backend aggregation logic           | Validate counts, empty-data handling, day scoping, legacy `completedAt` handling, throughput, and averages from audit logs | `backend/producer/test/src/application/use-cases/operational-metrics.use-case.spec.ts`          | Covered   |
| Frontend service contract           | Validate `GET /metrics`, auth header, and HTTP error propagation                                                           | `frontend/test/services/metricsService.spec.ts`                                                 | Covered   |
| Hook refresh behavior               | Validate mount fetch, 30-second auto-refresh, manual refetch, cleanup, and stale-data retention on refresh failure         | `frontend/test/hooks/useOperationalMetrics.spec.ts`                                             | Covered   |
| Dashboard render and access pattern | Validate role guard usage, admin welcome state, loading, error, empty state, and grid preservation on refresh failure      | `frontend/test/app/admin/dashboard/page.spec.tsx`                                               | Covered   |
| KPI rendering and formatting        | Validate section layout, metric values, formatted durations, null placeholders, and card count                             | `frontend/test/components/MetricCard.spec.tsx`, `frontend/test/components/MetricsGrid.spec.tsx` | Covered   |
| Cross-service timing source         | Validate that the producer reads the consumer audit trail in read-only mode                                                | Adapter and consumer schema review; no dedicated adapter test reviewed in this pass             | Partial   |

## 4. Acceptance criteria traceability

| Requirement  | What the spec expects                                                                                               | Evidence found                                                                                                                                                                                                                                  | QA reading |
| ------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| CRITERIO-1.1 | Admin sees waiting, called, completedToday, doctor availability, average wait, average consultation, and throughput | Counts, doctor availability, throughput, and both average durations are implemented; use-case tests cover positive calculations from `APPOINTMENT_ASSIGNED` / `APPOINTMENT_COMPLETED`, and frontend component tests render the formatted values | Covered    |
| CRITERIO-1.2 | Metrics refresh automatically every 30 seconds                                                                      | Hook tests advance timers and validate repeated fetches at 30-second intervals                                                                                                                                                                  | Covered    |
| CRITERIO-1.3 | Non-admin user cannot access the dashboard                                                                          | Page tests validate `useRoleGuard(["admin"])` usage and hidden dashboard content when access is denied; backend controller tests return 403 for non-admin token                                                                                 | Covered    |
| CRITERIO-1.4 | Unauthenticated access to metrics returns HTTP 401                                                                  | Controller tests cover missing and invalid token responses; service tests propagate 401                                                                                                                                                         | Covered    |
| CRITERIO-1.5 | No-data day shows zeroes and placeholders                                                                           | Use-case tests cover empty datasets; grid tests cover placeholder rendering for null durations and zero throughput                                                                                                                              | Covered    |
| CRITERIO-1.6 | Backend connectivity failure shows non-intrusive error while preserving last valid data                             | Hook tests preserve previous metrics on refresh failure and page tests keep the grid visible alongside the alert                                                                                                                                | Covered    |

## 5. Performance considerations

SPEC-013 does not define quantitative SLAs such as P95, TPS, or error-rate thresholds, so this QA package does not generate a standalone performance plan file.

Relevant notes from the reviewed implementation:

- The 30-second polling cadence implemented in `useOperationalMetrics` is aligned with the spec and is appropriate for an admin-only dashboard.
- The backend aggregation currently loads full appointment and doctor lists, plus the day-scoped timing events from `audit_logs`, and computes the KPIs in memory. That is acceptable for the reviewed scope, but it is the first scaling pressure point if data volume grows.
- The throughput KPI is implemented as informational business telemetry, not as a runtime performance guarantee.

## 6. QA conclusion

Current QA reading: the dashboard is functionally present, secured, refreshes correctly, preserves usable admin visibility under transient fetch failures, and now computes `avgWaitTimeMinutes` plus `avgConsultationTimeMinutes` when sufficient timing data exists in the consumer audit trail.

The previous blocker for SPEC-013 is closed. Residual risk is low to medium and centers on the lack of a reviewed Mongo-backed integration test for the cross-service read model plus the in-memory aggregation approach if data volume grows. Based on the implementation reviewed and the focused evidence supplied after the backend delta, SPEC-013 is apt to move from `IN_PROGRESS` to `IMPLEMENTED`.
