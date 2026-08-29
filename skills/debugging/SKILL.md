# Debugging Skill

Domain knowledge and best practices for finding and fixing bugs.

## Overview

Handles code inspection, error diagnosis, log analysis, and test-driven debugging.

## Debugging Workflow

```
Problem statement
  ↓
Inspect project structure
  ↓
Inspect error logs / stack trace
  ↓
Run tests (if available)
  ↓
Run linter (if available)
  ↓
Inspect relevant code
  ↓
Form hypothesis
  ↓
Test hypothesis (reproduce bug, verify fix)
  ↓
Implement fix
  ↓
Run tests again
  ↓
Verify related functionality not broken
```

## Capabilities

- Inspect project structure
- Read logs / stack traces
- Run test suites
- Run linters / code quality tools
- Read source code
- Modify source code
- Execute code / reproduce bugs
- Parse error messages

## Error Analysis

### Stack Trace Reading

- Start from the **bottom** (first frame) — not the end
- Identify the call chain
- Find the actual error (not just where it propagated)
- Look for user code vs. library code

### Common Bug Patterns

- Off-by-one errors (array indexing)
- Null pointer / undefined reference
- Type mismatches
- Resource leaks (file handles, memory, connections)
- Race conditions / timing issues
- State corruption
- Wrong assumptions about external data

### Log Interpretation

- Timestamp patterns (errors clustered at specific times?)
- Frequency (once vs. consistent?)
- Correlation (what happened just before?)
- Environment (dev vs. staging vs. production?)

## Capability Mapping

```
Task: "Find the bug in my application"
  ↓
Skill knowledge: Debugging methodology
  ↓
Capabilities needed:
  - inspect_directory
  - read_file (logs, code)
  - run_tests
  - (future) run_linter
  - (future) inspect_stack_trace
```

## Safety Notes

- Do not modify production without approval
- Do not make changes without reproducing the bug first
- Test fixes before considering bug "closed"
- Do not assume you found the root cause without evidence
