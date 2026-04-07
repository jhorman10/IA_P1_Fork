# QA Strategy Summary - structured-operational-audit-trail (SPEC-011)

## 1. Scope and evidence base

Feature under review:

- Structured operational audit persistence in producer over collection `operational_audit_logs`.
- Admin query API `GET /audit-logs` with filters and pagination.
- Frontend admin viewer at `/admin/audit` with filters, table and paginated fetch.

Evidence used for this QA deliverable:

- SPEC reviewed: `SPEC-011 structured-operational-audit-trail`.
- Implementation re-reviewed in producer and frontend after the latest backend fixes.
- Backend validated scope reported by the team:
  - `AuditInterceptor` suite: 14 tests pass.
  - Focused audit backend suites: 6 suites, 36 tests pass.
- Frontend reviewed suites remain green for admin page, filters, table, hook and service.
- Repo-level suite review confirmed dedicated tests for:
  - `AuditInterceptor`
  - `AuditController`
  - `AuditLogQueryDto`
  - `MongooseOperationalAuditAdapter`
  - frontend audit page, filters, table, hook and service

Note:

- This QA task reviewed code and existing tests but did not re-run the test commands locally.

## 2. Implemented feature footprint reviewed

Backend reviewed:

- `AuditInterceptor` logs successful auditable actions only, deduplicates `SESSION_RESOLVED`, keeps audit writes fire-and-forget, and now builds action-specific details aligned with the spec semantics.
- `MongooseOperationalAuditAdapter` persists and queries audit data, now propagating persistent `id` and `createdAt` in the read path.
- `AuditController` exposes admin-only query with `action`, `actorUid`, `from`, `to`, `page`, `limit`.
- Auditable endpoints are wired in:
  - profiles create/update
  - doctors create/check-in/check-out
  - appointments create
  - auth session resolve

Frontend reviewed:

- `auditService` builds `GET /audit-logs` requests with auth header and filters.
- `useAuditLogs` manages loading, error, filters and pagination.
- `AuditFilters` exposes action, actor UID and date range filters.
- `AuditLogTable` renders a read-only table with pagination.
- `/admin/audit` enforces admin access via `useRoleGuard(["admin"])`.

## 3. Test strategy summary

| Area                          | Goal                                                                                                 | Evidence reviewed                                      | QA status                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------ |
| Backend interceptor semantics | Validate success-only logging, dedup, non-blocking behavior and action-specific payload details      | Dedicated `AuditInterceptor` suite                     | Covered at unit level    |
| Backend persistence           | Validate insert, recent-entry lookup and filtered pagination                                         | Dedicated `MongooseOperationalAuditAdapter` suite      | Covered at adapter level |
| Backend read contract         | Validate admin auth, 401/403, filter DTO and paginated response with `id` and `createdAt`            | `AuditController` + `AuditLogQueryDto` suites          | Covered                  |
| Frontend data access          | Validate request building, error path and filter propagation                                         | `auditService` + `useAuditLogs` suites                 | Covered                  |
| Frontend visualization        | Validate role gate, filter wiring, empty/loading/table/pagination states                             | page + `AuditFilters` + `AuditLogTable` suites         | Covered                  |
| Endpoint-to-DB traceability   | Prove each auditable endpoint creates exactly one persisted record and failed validation writes zero | No direct HTTP-to-DB assertion found in reviewed scope | Recommended gap remains  |

## 4. Acceptance criteria traceability

| Acceptance criteria                        | What the spec expects                                              | Evidence found                                                                                        | QA reading |
| ------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------- |
| 1.1 Profile created                        | Audit record exists after successful profile creation              | Payload mapping is covered in interceptor and the endpoint is decorated as auditable                  | Partial    |
| 1.2 Profile updated                        | Audit details include field diff `{from,to}`                       | Interceptor now pre-fetches previous profile state and builds the diff explicitly                     | Partial    |
| 1.3 Doctor check-in                        | Audit details include doctor name, office and previous status      | Doctor response shape and interceptor mapping now cover those fields                                  | Partial    |
| 1.4 Doctor check-out                       | Audit details include doctor name, office and previous status      | Doctor response shape and interceptor mapping now cover those fields                                  | Partial    |
| 1.5 Appointment created                    | Audit record exists with patient data and priority                 | Request-to-audit payload mapping is directly covered in interceptor tests                             | Partial    |
| 1.6 Failed validation is not audited       | Invalid operations do not create records                           | Interceptor suite proves no log on handler error; no endpoint-level zero-write assertion was found    | Partial    |
| 1.7 Audit failure does not block main flow | HTTP success must survive Mongo audit failure                      | Dedicated interceptor tests cover pending and rejected audit promises                                 | Covered    |
| 1.8 Session resolved dedup                 | First session in 24 h logs once, later ones do not                 | Dedup logic and `{ role, email }` payload mapping are directly covered in interceptor tests           | Partial    |
| 2.1 to 2.4 Admin query API                 | Admin can query paginated data with action, actor and date filters | Adapter, controller and DTO suites cover filters, 401, 403, 400 invalid action, plus `id`/`createdAt` | Covered    |
| 2.5 Admin audit page                       | Admin can view, filter and paginate records                        | Frontend page, service, hook, filters and table suites cover this path                                | Covered    |
| 2.6 Non-admin forbidden                    | Non-admin gets 403                                                 | Controller suite covers 403                                                                           | Covered    |
| 2.7 Page out of range                      | Empty page is returned with stable metadata                        | Empty-state UI is covered, but no explicit API contract test for `page=999` was found                 | Partial    |

## 5. Performance considerations

SPEC-011 does not define quantitative SLAs such as P95, TPS or error-rate thresholds. Because of that, this QA package does not generate a standalone performance plan file.

Still, the implementation has relevant performance controls:

- Mongo indexes are present for the three intended query patterns:
  - `action + timestamp`
  - `actorUid + timestamp`
  - `actorUid + action + timestamp`
- Query pagination is capped server-side at `limit <= 100`.
- Frontend fetches 20 rows per page by default.
- The read path is admin-only, which lowers expected traffic.

Residual performance considerations:

- No baseline exists for large audit volumes or long-lived collections.
- No evidence of query-plan validation (`explain`) was found for production-like data size.
- Retention/archival policy for `operational_audit_logs` is not defined, so long-term growth risk remains.
- The actor UID filter triggers fetches on every input change; there is no debounce or request cancellation.
- Date filters need explicit UTC boundary validation because the feature works with epoch ms UTC and the UI converts dates on the client.

## 6. QA conclusion

Current QA reading: no open ASD-high blockers remain after the latest backend fixes.

What is solid:

- The previous blockers on payload semantics and read-contract completeness are closed.
- Admin-only query API is implemented and covered.
- Frontend admin audit page is implemented and covered.
- Fire-and-forget behavior, session dedup logic, action-specific payload details, and `id`/`createdAt` propagation are directly evidenced in reviewed tests.

What keeps QA conditional:

1. No direct HTTP-to-DB assertion was found to prove that each auditable endpoint writes exactly one record and failed validations write zero.
2. The out-of-range pagination case and UTC/inclusive date boundaries still lack targeted automated evidence in the reviewed scope.
3. Audit-write failure handling still relies only on `console.warn`; this matches the spec but leaves a recommended observability gap.

Bottom line: QA is now conditional only on medium/recommended gaps. R-001 and R-002 are no longer open after this re-review.
