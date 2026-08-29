# Tests

Test suites for MakeItDone agent system.

## Structure

- `supervisor.test.ts` — Supervisor state management, planning, execution
- `executor.test.ts` — Capability execution, risk evaluation
- `integration.test.ts` — End-to-end task flows
- `capabilities/` — Individual capability tests
  - `image-processing.test.ts`
  - `file-operations.test.ts`
- `safety.test.ts` — Risk engine, safety policies

## Running Tests

```bash
npm test
```

## Test Fixtures

Test input files are in `test-assets/`:
- `input.jpg` — Sample image for image processing tests

## Coverage Goals

- Capability execution paths
- Error handling and recovery
- Safety validation
- State transitions
- Artifact tracking
