# QA Strategy Summary - appointment-lifecycle-management (SPEC-012)

## 1. Scope and evidence base

Feature under review:

- Explicit completion of a called appointment by doctor or admin.
- Explicit cancellation of a waiting appointment by recepcionista or admin.
- Asynchronous lifecycle processing through RabbitMQ producer plus consumer flow.
- Frontend doctor and dashboard actions for completing and cancelling appointments.

Evidence used for this QA deliverable:

- Spec reviewed: `SPEC-012 appointment-lifecycle-management`
- Backend implementation reviewed:
  - `backend/producer/src/appointments/appointment-lifecycle.controller.ts`
  - `backend/consumer/src/application/use-cases/complete-appointment.use-case.impl.ts`
  - `backend/consumer/src/application/use-cases/cancel-appointment.use-case.impl.ts`
- Frontend implementation reviewed:
  - `frontend/src/services/appointmentService.ts`
  - `frontend/src/hooks/useDoctorDashboard.ts`
  - `frontend/src/app/doctor/dashboard/page.tsx`
  - `frontend/src/app/dashboard/page.tsx`
- Tests reviewed:
  - `backend/producer/test/src/appointments/appointment-lifecycle.controller.spec.ts`
  - `backend/consumer/test/src/consumer.controller.spec.ts`
  - `backend/consumer/test/src/application/use-cases/complete-appointment.use-case.impl.spec.ts`
  - `backend/consumer/test/src/application/use-cases/cancel-appointment.use-case.impl.spec.ts`
  - `frontend/test/services/appointmentService.spec.ts`
  - `frontend/test/hooks/useDoctorDashboard.spec.ts`
  - `frontend/test/app/doctor/page.spec.tsx`
  - `frontend/test/app/dashboard/page.spec.tsx`
- Phase 3 reference supplied for lote 2:
  - Backend: 9 suites passed, 67 tests passed
  - Frontend: 14 suites passed, 146 tests passed

Note:

- This QA pass reviewed code and existing automated evidence but did not re-run the commands locally.

## 2. Implemented feature footprint reviewed

- `AppointmentLifecycleController` enforces auth, roles, ownership, existence, and status preconditions before publishing `complete_appointment` or `cancel_appointment` events.
- `CompleteAppointmentUseCaseImpl` transitions `called -> completed`, saves the appointment, emits realtime notification, releases the doctor to `available`, audits the action, and triggers immediate assignment.
- `CancelAppointmentUseCaseImpl` transitions `waiting -> cancelled`, saves the appointment, emits realtime notification, and audits the action without touching doctor availability.
- Consumer handlers acknowledge or reject lifecycle events explicitly, preserving the asynchronous producer plus consumer pattern already used by the system.
- `appointmentService` preserves backend business messages on non-OK responses for both `completeAppointment` and `cancelAppointment`.
- `useDoctorDashboard` and the doctor page expose `Finalizar atencion` for the current called appointment assigned to the logged doctor.
- The operational dashboard enables cancellation for `admin` and `recepcionista`, keeps button loading state, and renders cancelled appointments as history.

## 3. Test strategy summary

| Area                                      | Goal                                                                                                       | Evidence reviewed                                                                            | QA status |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------- |
| Producer HTTP contract                    | Validate auth, role guards, ownership, status checks, 404/409/403 handling, and accepted responses         | `backend/producer/test/src/appointments/appointment-lifecycle.controller.spec.ts`            | Covered   |
| Consumer lifecycle processing             | Validate ACK/NACK behavior for `complete_appointment` and `cancel_appointment` messages                    | `backend/consumer/test/src/consumer.controller.spec.ts`                                      | Covered   |
| Explicit completion domain flow           | Validate `called -> completed`, doctor release, audit logging, notification, and assignment trigger        | `backend/consumer/test/src/application/use-cases/complete-appointment.use-case.impl.spec.ts` | Covered   |
| Explicit cancellation domain flow         | Validate `waiting -> cancelled`, notification, and audit logging                                           | `backend/consumer/test/src/application/use-cases/cancel-appointment.use-case.impl.spec.ts`   | Covered   |
| Frontend lifecycle service contract       | Validate PATCH endpoints, auth header, and backend message preservation                                    | `frontend/test/services/appointmentService.spec.ts`                                          | Covered   |
| Doctor UI completion flow                 | Validate current-patient discovery, complete button wiring, loading state, and refresh-on-success behavior | `frontend/test/hooks/useDoctorDashboard.spec.ts`, `frontend/test/app/doctor/page.spec.tsx`   | Covered   |
| Dashboard cancellation flow               | Validate cancel action wiring, loading state, and cancelled history rendering                              | `frontend/test/app/dashboard/page.spec.tsx`                                                  | Covered   |
| Concurrent timer plus explicit completion | Validate deterministic behavior when auto-expiration and explicit completion collide at the same time      | No dedicated concurrent test was reviewed in this QA pass                                    | Partial   |

## 4. Acceptance criteria traceability

| Requirement  | What the spec expects                                                                                                                                      | Evidence found                                                                                                                                                                                                                | QA reading |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| CRITERIO-1.1 | Doctor completes a called appointment and the system accepts the request, updates the state, frees the doctor, broadcasts the update, and returns HTTP 200 | Producer controller tests cover HTTP acceptance and ownership checks; complete use-case tests cover completion, notification, doctor release, audit, and assignment trigger; doctor hook/page tests cover the frontend action | Covered    |
| CRITERIO-1.2 | After completion, the now-available doctor can receive the next waiting patient immediately                                                                | The complete use case explicitly calls `assignUseCase.execute()` after completion; no dedicated end-to-end evidence of a concrete next patient reassignment was reviewed in this QA pass                                      | Partial    |
| CRITERIO-1.3 | Doctor cannot complete another doctor's appointment                                                                                                        | Producer controller tests return HTTP 403 with the expected business message                                                                                                                                                  | Covered    |
| CRITERIO-1.4 | Only `called` appointments can be completed                                                                                                                | Producer controller tests return HTTP 409 when the appointment is not `called`; hook tests preserve backend business messages in the UI                                                                                       | Covered    |
| CRITERIO-1.5 | Completing a non-existent appointment returns HTTP 404                                                                                                     | Producer controller tests cover the 404 response                                                                                                                                                                              | Covered    |
| CRITERIO-1.6 | Simultaneous auto-expiration and explicit completion resolves cleanly without duplicate transition                                                         | Producer controller handles already completed state with a dedicated 409 message and consumer use case no-ops non-called states, but no deterministic concurrent test was reviewed                                            | Partial    |
| CRITERIO-2.1 | Recepcionista cancels a waiting appointment and the system broadcasts the update                                                                           | Producer controller covers the accepted response; cancel use-case tests cover state change, notification, and audit; dashboard tests cover cancel button behavior                                                             | Covered    |
| CRITERIO-2.2 | Admin can cancel a waiting appointment                                                                                                                     | Admin role reaches business validation on backend and admin cancel UI is present on frontend; no contradictory evidence was found for the success path                                                                        | Covered    |
| CRITERIO-2.3 | Called appointments cannot be cancelled                                                                                                                    | Producer controller tests return HTTP 409 when status is not `waiting`                                                                                                                                                        | Covered    |
| CRITERIO-2.4 | Completed appointments cannot be cancelled                                                                                                                 | The controller enforces `waiting` as the only cancellable state; the same 409 branch applies to already completed records                                                                                                     | Covered    |
| CRITERIO-2.5 | Doctor role cannot cancel appointments                                                                                                                     | Producer controller tests return HTTP 403 for doctor role                                                                                                                                                                     | Covered    |
| CRITERIO-2.6 | Cancelling a non-existent appointment returns HTTP 404                                                                                                     | Producer controller tests cover the 404 response                                                                                                                                                                              | Covered    |

## 5. Performance considerations

SPEC-012 does not define quantitative SLAs such as response time, TPS, or error-rate thresholds, so this QA package does not generate a standalone performance plan file.

Relevant notes from the reviewed implementation:

- The lifecycle remains asynchronous by design: producer validates and publishes, consumer performs the transition, then the notification pipeline updates the UI.
- Completion explicitly reuses the existing assignment flow through `assignUseCase.execute()`, so post-completion latency depends on the already-established queue plus notification path.
- No dedicated performance evidence was reviewed for end-to-end completion or cancellation latency in this QA pass.

## 6. QA conclusion

Current QA reading: SPEC-012 is implemented coherently across producer, consumer, service, hook, and page layers. The reviewed tests substantiate role enforcement, lifecycle transitions, UI actions, and realtime update propagation.

Residual risk is low to moderate and centered on two partial-evidence areas: deterministic proof of the concurrent auto-expire edge case, and explicit end-to-end evidence that the next waiting patient is reassigned immediately after completion. Those are not current blockers. Based on the implementation reviewed and the focused phase-3 suites already reported green, SPEC-012 is apt to move from `IN_PROGRESS` to `IMPLEMENTED`.
