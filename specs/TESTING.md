# Testing

## Strategy

Tests are colocated with the code they test. Each package owns its test suite. The goal is high coverage on business logic, confident integration coverage on the API, and focused component tests on the webapp.

## Layers

### lib — Unit tests
Pure functions with no I/O are straightforward to test. Every business logic function in `pfs-lib` has unit tests covering the happy path and meaningful edge cases. No mocks needed — inputs and outputs are plain data.

### server — Integration tests
API routes are tested end-to-end through HTTP using a test app instance with a real CSV adapter pointed at a temp directory. Tests cover request validation, response shape, error cases, and referential integrity rules. No mocking of lib functions — the full stack below the HTTP layer is exercised.

### webapp — Component tests
Components are tested with React Testing Library via the `src/test/render` helper (never imported directly from `@testing-library/react`). Tests use a storageless budget so no server is required. Test data is created through factories in `src/test/factories.ts`.

UI tests focus on user-visible behaviour, not implementation details: what appears on screen, what happens when the user interacts, what error states look like.

## End-to-End Tests

A separate E2E suite exercises the full stack: real server, real CSV adapter, real browser. These are slower and run separately from unit/integration tests. They cover critical user journeys (create budget, add account, record transaction, view balance).

## Commands

```
npm test                # all unit + integration + component tests
npm run test:coverage   # with coverage report
npm run test:e2e        # end-to-end suite (requires server running)
```

## Rules

- Webapp tests import from `src/test/render`, never directly from `@testing-library/react`
- Test data uses factories in `src/test/factories.ts` — never construct raw objects inline
- Tests document intended behaviour — if a test needs updating after a change, confirm it reflects the new intended behaviour before updating
- No testing of implementation details (internal state, private functions, adapter internals)
