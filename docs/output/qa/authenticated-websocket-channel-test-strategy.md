# QA Strategy Summary - authenticated-websocket-channel (SPEC-010)

## 1. Scope and evidence base

Feature under review:

- Authenticated operational WebSocket namespace for internal users.
- Firebase `idToken` validation plus active `Profile` enforcement for operational real-time access.
- Frontend adapter and hook for the authenticated operational channel.
- Regression protection for the existing public waiting-room channel.

Evidence used for this QA deliverable:

- Spec reviewed: `SPEC-010 authenticated-websocket-channel`
- Backend implementation reviewed:
  - `backend/producer/src/auth/guards/ws-firebase-auth.guard.ts`
  - `backend/producer/src/events/operational-appointments.gateway.ts`
  - `backend/producer/src/events/appointments.gateway.ts`
- Frontend implementation reviewed:
  - `frontend/src/infrastructure/adapters/AuthenticatedSocketIoAdapter.ts`
  - `frontend/src/hooks/useOperationalAppointmentsWebSocket.ts`
- Tests reviewed:
  - `backend/producer/test/src/auth/guards/ws-firebase-auth.guard.spec.ts`
  - `backend/producer/test/src/events/operational-appointments.gateway.spec.ts`
  - `backend/producer/test/src/events/appointments.gateway.spec.ts`
  - `frontend/test/services/AuthenticatedSocketIoAdapter.spec.ts`
  - `frontend/test/hooks/useOperationalAppointmentsWebSocket.spec.ts`
  - `frontend/test/hooks/useAppointmentsWebSocket.spec.ts`
- Phase 3 reference supplied for lote 2:
  - Backend: 9 suites passed, 67 tests passed
  - Frontend: 14 suites passed, 146 tests passed

Note:

- This QA pass reviewed code and existing automated evidence but did not re-run the commands locally.

## 2. Implemented feature footprint reviewed

- `WsFirebaseAuthGuard` extracts the token from `handshake.auth.token` or `Authorization: Bearer`, verifies it with Firebase, resolves the `Profile`, enforces `status=active`, attaches `client.data.user`, and emits `WS_AUTH_ERROR` plus disconnect on rejection.
- `OperationalAppointmentsGateway` authenticates clients before sending the initial `APPOINTMENTS_SNAPSHOT` and broadcasts `APPOINTMENT_UPDATED` events only on `/ws/operational-appointments`.
- `AuthenticatedSocketIoAdapter` connects to `/ws/operational-appointments`, sends `auth.token` during the handshake, and maps `WS_AUTH_ERROR` to a client-side auth rejection flow.
- `useOperationalAppointmentsWebSocket` reads the Firebase token from `useAuth()`, avoids connecting when no token is available, and exposes `authRejected`, `connected`, and `connectionStatus` states for the UI.
- `AppointmentsGateway` remains unauthenticated for the public waiting room and is explicitly regression-tested to avoid dependency on `WS_AUTH_TOKEN`.

## 3. Test strategy summary

| Area                              | Goal                                                                                                                     | Evidence reviewed                                                                                                       | QA status |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------- |
| Operational socket authentication | Validate token extraction, Firebase verification, active `Profile` enforcement, and rejection contract                   | `backend/producer/test/src/auth/guards/ws-firebase-auth.guard.spec.ts`                                                  | Covered   |
| Operational gateway behavior      | Ensure snapshot is emitted only after successful auth and that operational broadcasts keep the existing payload contract | `backend/producer/test/src/events/operational-appointments.gateway.spec.ts`                                             | Covered   |
| Frontend operational adapter      | Ensure correct namespace, handshake token, callback wiring, and auth rejection handling                                  | `frontend/test/services/AuthenticatedSocketIoAdapter.spec.ts`                                                           | Covered   |
| Frontend operational hook         | Validate token gating, `authRejected`, snapshot load, incremental updates, and disconnect/error state handling           | `frontend/test/hooks/useOperationalAppointmentsWebSocket.spec.ts`                                                       | Covered   |
| Public channel regression         | Ensure the public namespace still accepts unauthenticated clients and keeps snapshot/update behavior                     | `backend/producer/test/src/events/appointments.gateway.spec.ts`, `frontend/test/hooks/useAppointmentsWebSocket.spec.ts` | Covered   |
| End-to-end runtime handshake      | Validate a real producer plus real frontend operational handshake across process boundaries                              | No dedicated multi-process E2E evidence was reviewed in this QA pass                                                    | Partial   |

## 4. Acceptance criteria traceability

| Requirement  | What the spec expects                                                                                             | Evidence found                                                                                                                                                       | QA reading |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| CRITERIO-1.1 | Internal user with valid `idToken` and active `Profile` connects and receives the initial snapshot                | Guard happy-path tests attach `client.data.user`; operational gateway tests emit `APPOINTMENTS_SNAPSHOT` only after auth succeeds                                    | Covered    |
| CRITERIO-1.2 | Valid token without operational `Profile` is rejected with observable auth error and disconnect                   | Guard tests cover missing `Profile` and inactive `Profile`, both emitting `WS_AUTH_ERROR` and disconnecting                                                          | Covered    |
| CRITERIO-1.3 | Reconnect with expired or absent token is rejected and the frontend reflects auth failure                         | Guard tests reject missing and invalid tokens; adapter and hook tests expose `onAuthRejected`, `authRejected=true`, and `connected=false`                            | Covered    |
| CRITERIO-2.1 | Public waiting-room channel continues without login                                                               | Public gateway regression tests accept unauthenticated clients and still send `APPOINTMENTS_SNAPSHOT`; public hook tests keep the unauthenticated connect path alive | Covered    |
| CRITERIO-2.2 | New operational auth does not replace or break the public channel                                                 | Public gateway regression tests instantiate without `WS_AUTH_TOKEN` and confirm unauthenticated public behavior remains valid                                        | Covered    |
| CRITERIO-2.3 | Unauthenticated client using the operational namespace is rejected while the public alternative remains available | Operational gateway returns early when auth fails; guard emits `WS_AUTH_ERROR`; public gateway remains open to unauthenticated clients                               | Covered    |

## 5. Performance considerations

SPEC-010 does not define quantitative SLAs such as P95, TPS, or error-rate thresholds, so this QA package does not generate a standalone performance plan file.

Relevant notes from the reviewed implementation:

- The additional auth cost is paid at connection time only: Firebase token verification plus `Profile` lookup during the handshake.
- The operational namespace preserves the same snapshot and delta event model already used by the public channel, so there is no evidence of a new sustained-throughput concern inside this spec boundary.
- No dedicated performance evidence was reviewed for WebSocket authentication latency in this QA pass.

## 6. QA conclusion

Current QA reading: the implementation aligns with the approved security intent of SPEC-010 and preserves the public waiting-room channel through explicit regression coverage on both backend and frontend sides.

Residual risk is low and concentrated in the absence of a reviewed cross-process E2E handshake run during this QA pass. Based on the implementation reviewed and the focused phase-3 suites already reported green, SPEC-010 is apt to move from `IN_PROGRESS` to `IMPLEMENTED`.
