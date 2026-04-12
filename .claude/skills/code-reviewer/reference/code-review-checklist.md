# Code Review Checklist

## Security Checks (CRITICAL)

- Hardcoded credentials (API keys, passwords, tokens)
- SQL injection risks (string concatenation in queries)
- XSS vulnerabilities (unescaped user input)
- Missing input validation
- Insecure dependencies (outdated, vulnerable)
- Path traversal risks (user-controlled file paths)
- Authentication bypasses

> For deep security analysis (OWASP Top 10, secrets detection, dependency CVEs, financial transaction security), delegate to the `security-reviewer` agent.

## Code Quality (HIGH)

- Large functions (>50 lines)
- Large files (>800 lines)
- Deep nesting (>4 levels)
- Missing error handling (try/catch)
- `console.log` instead of structured logger (pino)
- `any` type escapes suppressing type safety
- Missing `.js` extension on ESM imports (causes runtime failure under NodeNext)
- Unhandled promise rejections / missing `await` on async calls
- Mutation patterns
- Missing tests for new code

## Performance (MEDIUM)

- Inefficient algorithms (O(n^2) when O(n log n) possible)
- Missing memoization
- Missing caching
- N+1 queries
- Unbounded DB queries (no LIMIT)

## Best Practices (MEDIUM)

- TODO/FIXME without tickets
- `process.env` read directly instead of via validated `config`
- Poor variable naming (x, tmp, data)
- Magic numbers without explanation
- Inconsistent formatting

## General Checklist

- Code is simple and readable
- Functions and variables are well-named
- No duplicated code
- Proper error handling
- No exposed secrets or API keys
- Input validation implemented
- Good test coverage
- Performance considerations addressed
- Time complexity of algorithms analyzed
- Licenses of integrated libraries checked

## Output Format

For each issue:

```
[CRITICAL] Hardcoded API key
File: src/api/client.ts:42
Issue: API key exposed in source code
Fix: Move to environment variable

const apiKey = "sk-abc123";  // Bad
const apiKey = process.env.API_KEY;  // Good
```

## Approval Criteria

- Approve: No CRITICAL or HIGH issues
- Warning: MEDIUM issues only (can merge with caution)
- Block: CRITICAL or HIGH issues found

## Severity Levels

Provide feedback organized by priority:
- Critical issues (must fix)
- Warnings (should fix)
- Suggestions (consider improving)

Include specific examples of how to fix issues.
