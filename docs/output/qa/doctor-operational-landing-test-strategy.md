# QA Strategy Summary - doctor-operational-landing (SPEC-008)

## 1. Scope and evidence base

Feature under review:

- Doctor-only frontend landing at `/doctor/dashboard`
- Post-login redirect for role `doctor`
- Doctor status load plus check-in/check-out actions
- Blocking for non-doctor roles and error handling when `doctor_id` is missing

Evidence used for this QA deliverable:

- SPEC reviewed: `SPEC-008 doctor-operational-landing`
- Frontend implementation reviewed:
  - `frontend/src/app/doctor/dashboard/page.tsx`
  - `frontend/src/hooks/useDoctorDashboard.ts`
  - `frontend/src/components/DoctorStatusCard/DoctorStatusCard.tsx`
  - `frontend/src/services/doctorService.ts`
  - `frontend/src/app/login/page.tsx`
  - `frontend/src/components/RoleGate/RoleGate.tsx`
- Backend contract evidence reviewed:
  - `backend/producer/src/application/use-cases/doctor.service.impl.ts`
  - `backend/producer/src/doctors/doctor.controller.ts`
  - `backend/producer/test/src/doctors/doctor.controller.spec.ts`
- Tests reviewed:
  - `frontend/test/hooks/useDoctorDashboard.spec.ts`
  - `frontend/test/components/DoctorStatusCard.spec.tsx`
  - `frontend/test/app/doctor/page.spec.tsx`
  - `frontend/test/app/login/page.spec.tsx`
  - `frontend/test/services/doctorService.spec.ts`
  - Supporting control: `frontend/test/components/RoleGate.spec.tsx`
- Independent validation was reported green for the focused SPEC-008 suites listed above.

Note:

- This QA pass reviewed code and existing tests but did not re-run the test commands locally.

## 2. Implemented feature footprint reviewed

- `useDoctorDashboard` resolves `profile.doctor_id`, loads the doctor record, exposes `checkIn`, `checkOut`, `refetch` and `successMessage`, and surfaces an error when `doctor_id` is missing.
- `DoctorStatusCard` renders doctor identity, office, specialty, status badge and action buttons with state-driven disabling.
- `DoctorDashboardPage` wraps the content in `RoleGate roles={["doctor"]}`, renders loading/error/success states and wires the card actions to the hook.
- `LoginPage` redirects authenticated doctors to `/doctor/dashboard`.
- `doctorService` preserves `body.message` on non-ok responses for `checkInDoctor` and `checkOutDoctor`; `getDoctorById` still throws `HTTP_ERROR: <status>` on non-ok responses.
- No assigned-patients fetch or render path was found in the reviewed doctor landing footprint.

## 3. Test strategy summary

| Area                           | Goal                                                                                                                                          | Evidence reviewed                                                                                                                                                                                                  | QA status |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| Login redirect                 | Ensure the doctor lands on a dedicated operational route after authentication                                                                 | `frontend/test/app/login/page.spec.tsx`                                                                                                                                                                            | Covered   |
| Route access control           | Ensure non-doctor roles are blocked from the doctor landing                                                                                   | `frontend/test/app/doctor/page.spec.tsx`, `frontend/test/components/RoleGate.spec.tsx`                                                                                                                             | Covered   |
| Hook state management          | Validate initial load, missing `doctor_id`, check-in/out transitions, success feedback, refetch and busy check-out rejection at hook boundary | `frontend/test/hooks/useDoctorDashboard.spec.ts`                                                                                                                                                                   | Covered   |
| Card rendering and actions     | Validate doctor identity rendering, status labels, button disabled states and callbacks                                                       | `frontend/test/components/DoctorStatusCard.spec.tsx`                                                                                                                                                               | Covered   |
| Page wiring                    | Validate loading/error/success states and action buttons wired to hook callbacks                                                              | `frontend/test/app/doctor/page.spec.tsx`                                                                                                                                                                           | Covered   |
| SPEC-008 service HTTP contract | Validate endpoint path, auth header and backend business error propagation for the new doctor service methods                                 | `frontend/test/services/doctorService.spec.ts` covers non-OK message preservation for `checkInDoctor` and `checkOutDoctor`; no dedicated `getDoctorById` service test and no request/headers assertions were found | Partial   |
| Assigned patients visibility   | Validate that the doctor can see assigned patients from the landing                                                                           | No implementation or tests found in the reviewed scope                                                                                                                                                             | Gap       |

## 4. Acceptance criteria traceability

| Requirement           | What the spec expects                                                                             | Evidence found                                                                                                                                                                                                                                   | QA reading |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| CRITERIO-1.1          | Doctor is redirected to the operational landing and sees name, office and current status          | Login redirect is covered in `frontend/test/app/login/page.spec.tsx`; dashboard heading, welcome text and status card rendering are covered in `frontend/test/app/doctor/page.spec.tsx` and `frontend/test/components/DoctorStatusCard.spec.tsx` | Covered    |
| CRITERIO-1.2          | Doctor checks in from the landing, state changes to available and a confirmation is shown         | Hook tests cover `checkInDoctor` call, state update and `successMessage`; page test covers render of success feedback                                                                                                                            | Covered    |
| CRITERIO-1.3          | Doctor checks out from the landing when there is no assigned patient and state changes to offline | Hook tests cover `checkOutDoctor` call, state update and `successMessage`; page test covers the success-feedback render path. The precondition about assigned patients is still controlled indirectly by the backend busy rule                   | Covered    |
| CRITERIO-1.4          | Busy doctor cannot check out and sees the business error message while state remains unchanged    | Backend producer code/tests evidence a `409` business message for busy check-out, and `doctorService` now preserves `body.message`. Hook/page tests still use mocks and assert the spec wording, not the backend wording currently implemented   | Partial    |
| CRITERIO-1.5          | Doctor without linked `doctor_id` sees an explanatory error and cannot operate                    | Hook test covers missing `doctor_id`; page test covers rendering the exposed error; login test confirms doctor still lands on the dedicated route                                                                                                | Covered    |
| CRITERIO-1.6          | Non-doctor roles are blocked from the doctor landing                                              | Doctor page tests cover admin and recepcionista blocked paths; `RoleGate` has dedicated component coverage                                                                                                                                       | Covered    |
| HU-01 narrative scope | The doctor can also see assigned patients from the landing                                        | No fetch, UI render or automated evidence was found for assigned patients in the reviewed scope                                                                                                                                                  | Open gap   |

## 5. Performance considerations

SPEC-008 does not define quantitative SLAs such as P95, TPS or error-rate thresholds. Because of that, this QA package does not generate a standalone performance plan file.

Relevant notes from the reviewed frontend scope:

- The landing currently issues only single-record doctor GET/PATCH operations.
- No local performance evidence was reviewed for doctor landing interactions.
- If assigned-patients visibility is added later, its fetch, filtering and refresh behavior should be assessed separately.

## 6. QA conclusion

Current QA reading: the prior blocker on generic `HTTP_ERROR` collapse is resolved in the reviewed code, and success confirmation after check-in/check-out is now explicitly evidenced by hook and page tests.

What prevents full QA closure for SPEC-008:

1. The spec narrative says the doctor can see assigned patients, but no such UI or automated evidence was found in the reviewed implementation.
2. `CRITERIO-1.4` remains only partially evidenced end-to-end: the actual backend `409` wording is not asserted through the dashboard path, and the backend text currently differs from the string used in frontend mocks.

Bottom line: no blocking defect remains in the remediated batch reviewed, but overall SPEC-008 closure stays conditional with medium residual risk around assigned-patients scope and exact busy check-out message contract evidence.
