# Code Standards

## Modify Existing Files First

```
Need to add code?
    ↓
Does relevant file exist?
    ├─ YES → Modify existing file (DEFAULT)
    └─ NO → Is this >150–200 lines of cohesive new logic?
              ├─ YES → Consider new file (ask human first)
              └─ NO → Find closest existing file and add there
```

When creating new files: remove/update old files, update all imports, delete orphans. NEVER leave old + new both existing.

## Error Handling

### No Silent Failures, No Mock Data, No Fallbacks

```
// ❌ FORBIDDEN
catch (e) { return []; }           // Silent empty return
catch (e) { return MockData.x; }   // Fake data
catch (e) { /* nothing */ }        // Swallowed exception

// ✅ REQUIRED
catch (e) {
  log.error({ err: e }, 'fetchData failed');
  throw e; // OR return error state (Result.failure, fail({ kind: 'InternalError' }), etc.)
}
```

- Every catch block MUST log the error
- Every catch block MUST either rethrow OR return an error state
- API consumers MUST receive a proper error response (HTTP status + RFC 7807 ProblemDetails body)
- NEVER return empty list/null/default on error
- NEVER create mock data unless explicitly requested

## DRY Enforcement

Before writing ANY code:

1. CHECK: Does this logic exist in shared/common utilities? → YES: import it
2. ASK: Will another module need this? → YES: create in shared utilities first

**Forbidden:** inline utility logic when shared version exists; duplicating logic across files.

| Metric | Target | Action |
| ------ | ------ | ------ |
| File size | ~400–500 lines | Extract when hard to navigate |
| Duplicate code blocks | 0 | Extract to shared |
| Inline utilities | 0 | Move to shared |

## Logging Standards

- **Structured:** All logs include context (user type, action, timestamp)
- **Centralized:** Single logging utility used everywhere
- **Leveled:** Appropriate levels (debug, info, warn, error)
- Log all error conditions with full context
- Log significant operations (start, success, failure)
- NEVER log sensitive data (passwords, tokens, PII)
- NEVER use `console.log()` — use centralized logger

## Output Quality

- No bloated abstractions or premature generalization
- No clever tricks without comments explaining why
- Match the project's idioms — don't introduce a different paradigm mid-file
- Meaningful variable names (no `temp`, `data`, `result` without context)
- Zero: deprecated APIs, stub implementations, TODO comments, duplicate implementations, backward compatibility wrappers

## Pre-Submit Checklist

- [ ] No deprecated features or syntax
- [ ] No unused imports, variables, or functions
- [ ] No duplicate logic
- [ ] Old code paths removed if replaced
- [ ] Error handling follows centralized pattern
- [ ] Code matches official documentation examples
