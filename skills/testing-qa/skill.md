---
name: testing-qa
description: Unit tests, spec files, mocking strategies, and test coverage for NestJS services.
trigger: When feedback mentions tests, specs, unit testing, mocking, coverage, test failures, or QA validation.
scope: backend/producer/test/, backend/consumer/src/**/*.spec.ts, backend/producer/src/**/*.spec.ts
author: "IA_P1_Fork Team"
version: "1.0.0"
license: "MIT"
autoinvoke: true
---

# Skill: Testing & QA

## Context
The project uses **Jest** with **NestJS Testing Module** for unit tests.
- Producer tests: `backend/producer/test/`
- Consumer tests: `backend/consumer/src/**/*.spec.ts`

## Rules
1. Every spec file must use `Test.createTestingModule()` with properly typed mocks.
2. Mock external dependencies (MongoDB models, RabbitMQ clients) — never hit real services.
3. Use `jest.fn()` for method mocks and type them correctly.
4. Test both success and error paths (especially ack/nack in Consumer).
5. File naming: `<service-name>.spec.ts` co-located with the source, or in `test/`.
6. Add `// ⚕️ HUMAN CHECK` for test scenarios that verify business-critical logic.

## Tools Permitted
- **Read/Write:** Spec files within `backend/*/test/` and `backend/*/src/**/*.spec.ts`
- **Explore:** Use `grep` to find untested services and existing mock patterns
- **Terminal:** `npm run test`, `npm run test -- --coverage`, `npm run test -- --testPathPattern=<file>`

## Workflow
1. Identify what needs testing from the feedback.
2. Use `grep` to find existing test patterns and mock factories.
3. Consult `assets/templates/` for the reference mocking pattern.
4. Write the test following the rules above.
5. Verify: `npm run test -- --testPathPattern=<file>`.
6. Return Action Summary (see `skills/action-summary-template.md`).

## Assets
- `assets/templates/spec-pattern.ts` — Reference NestJS spec with Mongoose mocking
- `assets/docs/mocking-guide.md` — Mock factory patterns for common providers
