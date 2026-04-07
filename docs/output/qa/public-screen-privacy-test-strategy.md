# QA Strategy Summary - public-screen-privacy (SPEC-009)

## 1. Scope and evidence base

Feature under review:

- Public appointment screen shows patient names anonymized.
- Authenticated operational dashboard keeps full patient names visible.
- Privacy behavior covers public appointment cards and the public assignment notification.
- No backend change is expected by SPEC-009; the WebSocket payload contract remains unchanged by design.

Evidence used for this QA deliverable:

- SPEC reviewed: `SPEC-009 public-screen-privacy`.
- Inherited privacy risk source reviewed:
  - `docs/output/qa/operational-access-foundation-risks.md` (`R-004`).
- Frontend implementation reviewed:
  - `frontend/src/lib/anonymizeName.ts`
  - `frontend/src/app/page.tsx`
  - `frontend/src/app/dashboard/page.tsx`
  - `frontend/src/components/AppointmentCard/WaitingAppointmentCard.tsx`
  - `frontend/src/components/AppointmentCard/CalledAppointmentCard.tsx`
  - `frontend/src/components/AppointmentCard/CompletedAppointmentCard.tsx`
  - `frontend/src/components/AppointmentCard/AppointmentCard.tsx`
  - `frontend/src/components/AssignmentNotification/AssignmentNotification.tsx`
- Tests reviewed:
  - `frontend/test/lib/anonymizeName.spec.ts`
  - `frontend/test/components/WaitingAppointmentCard.spec.tsx`
  - `frontend/test/components/CalledAppointmentCard.spec.tsx`
  - `frontend/test/components/CompletedAppointmentCard.spec.tsx`
  - `frontend/test/components/AssignmentNotification.spec.tsx`
  - `frontend/test/app/page.spec.tsx`
  - `frontend/test/app/page.spec003.spec.tsx`
  - `frontend/test/app/dashboard/page.spec.tsx`
- Independent validation was reported green for the focused SPEC-009 suites above.

Notes:

- This QA pass reviewed code and existing tests but did not re-run the test commands locally.
- The spec metadata still shows `IN_PROGRESS`; this QA reading is based on the implementation and test evidence currently present in the repo.

## 2. Implemented feature footprint reviewed

- `anonymizeName` trims whitespace, returns blank input safely, preserves single-term names, and formats multi-term names as first term plus uppercase initials.
- The public home page renders `CalledAppointmentCard`, `WaitingAppointmentCard`, and `AssignmentNotification` without overriding `anonymize`, so the default public behavior is anonymized.
- The authenticated dashboard explicitly passes `anonymize={false}` to `CalledAppointmentCard`, `WaitingAppointmentCard`, `CompletedAppointmentCard`, and `AssignmentNotification`, which addresses the authenticated-view regression described in the request context.
- The deprecated generic `AppointmentCard` also supports the same `anonymize` prop pattern, reducing reuse risk if that component is used again later.
- No SPEC-009 backend implementation was expected from the spec, and no backend QA scope was identified for this feature.

## 3. Test strategy summary

| Area                                  | Goal                                                                                                                                             | Evidence reviewed                                                                                                                                                                   | QA status                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Name masking utility                  | Validate first-name-plus-initials rules and edge handling                                                                                        | `frontend/test/lib/anonymizeName.spec.ts`                                                                                                                                           | Covered                    |
| Public appointment cards              | Ensure public waiting, called, and completed cards anonymize by default and can show full names when explicitly disabled for authenticated reuse | `frontend/test/components/WaitingAppointmentCard.spec.tsx`, `frontend/test/components/CalledAppointmentCard.spec.tsx`, `frontend/test/components/CompletedAppointmentCard.spec.tsx` | Covered                    |
| Public assignment notification        | Ensure the public notification hides full patient names by default                                                                               | `frontend/test/components/AssignmentNotification.spec.tsx`                                                                                                                          | Covered at component level |
| Public home page rendering            | Ensure the public screen renders masked names instead of full names                                                                              | `frontend/src/app/page.tsx`, `frontend/test/app/page.spec.tsx`                                                                                                                      | Covered                    |
| Authenticated dashboard regression    | Ensure authenticated dashboard sections keep full names visible                                                                                  | `frontend/src/app/dashboard/page.tsx`, `frontend/test/app/dashboard/page.spec.tsx`                                                                                                  | Covered                    |
| Notification transition integration   | Ensure waiting-to-called transition still renders the notification in the public flow                                                            | `frontend/test/app/page.spec003.spec.tsx`                                                                                                                                           | Partial for privacy text   |
| Backend/WebSocket contract invariance | Confirm privacy remains presentation-only and avoid overclaiming backend coverage                                                                | SPEC states contract unchanged; no SPEC-009 backend tests found                                                                                                                     | Out of scope / residual    |

## 4. Acceptance criteria traceability

| Requirement         | What the spec expects                                                   | Evidence found                                                                                                                                                                                                 | QA reading                                          |
| ------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| CRITERIO-1.1        | Public screen shows `Juan C. P. L.` instead of the full multi-term name | Utility test covers the transform; public card component tests validate anonymization by default; `frontend/test/app/page.spec.tsx` asserts masked names on the public home page                               | Covered                                             |
| CRITERIO-1.2        | Authenticated operational views show the full patient name              | `frontend/src/app/dashboard/page.tsx` passes `anonymize={false}` to authenticated sections and notification; `frontend/test/app/dashboard/page.spec.tsx` asserts full names and absence of anonymized variants | Covered                                             |
| CRITERIO-1.3        | Single-term names stay unchanged                                        | Utility test plus waiting/called/completed component tests cover single-term rendering                                                                                                                         | Covered                                             |
| CRITERIO-1.4        | Two-term names render as first name plus one initial                    | `frontend/test/lib/anonymizeName.spec.ts` covers `Ana Garcia -> Ana G.`                                                                                                                                        | Covered at utility level                            |
| Business rule 1     | Public screen always shows anonymized names                             | Public page uses component defaults and page test asserts masked values for waiting and called appointments                                                                                                    | Covered in reviewed public surfaces                 |
| Business rule 2     | Masking format is first name plus initials                              | Utility and component-level evidence are consistent with the rule                                                                                                                                              | Covered                                             |
| Business rule 3     | Authenticated screens show full names                                   | Authenticated dashboard explicitly disables anonymization in reviewed scope                                                                                                                                    | Covered in reviewed authenticated surface           |
| Business rule 4 / 5 | WebSocket keeps sending `fullName`; masking is frontend-only            | This is declared in the spec. No backend or contract test was reviewed for SPEC-009                                                                                                                            | By design, not independently proven in this QA pass |

## 5. Performance considerations

SPEC-009 does not define quantitative SLAs such as P95, TPS, or error-rate thresholds. Because of that, this QA package does not generate a standalone performance plan file.

Relevant note from the reviewed scope:

- The change is limited to presentation-layer string formatting and prop wiring in frontend components.

## 6. QA conclusion

Current QA reading: the reviewed frontend implementation and the reported green focused suites are consistent with SPEC-009.

What is evidenced well:

1. Public home screen behavior is anonymized by default for waiting and called appointments.
2. Public-facing appointment cards and assignment notification mask names by default.
3. The authenticated dashboard regression is explicitly fixed by disabling anonymization in the internal dashboard.

Residual risks that remain after this QA pass:

1. Privacy still depends on frontend presentation because the unauthenticated WebSocket payload keeps carrying `fullName` by spec.
2. The notification text is privacy-tested at component level, while the page-level waiting-to-called integration test only proves the notification appears.
3. This QA pass did not re-run the suites locally.

Bottom line: QA status is conditional pass for the reviewed frontend scope of SPEC-009.
