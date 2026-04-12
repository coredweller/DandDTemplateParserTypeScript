---
name: code-reviewer
description: General-purpose code review skill. Provides checklists for security, code quality, performance, and best practices. Use when reviewing code changes, PRs, or performing quality audits.
allowed-tools: Bash, Read, Glob, Grep
---

# Code Reviewer

General-purpose code review skill covering security, quality, performance, and best practices.

## When to Use

- After writing or modifying code
- During PR reviews
- When auditing code quality

## Process

1. Identify changed files via `git diff` or user request
2. Read [reference/code-review-checklist.md](reference/code-review-checklist.md) for review categories, severity levels, and output format
3. Read [reference/code-standards.md](reference/code-standards.md) for project-specific standards to enforce
4. Review each file against both the checklist and project standards
5. Report findings by severity (Critical > High > Medium > Low)

## Reference Files

| File | Contents |
|------|----------|
| `reference/code-review-checklist.md` | Security checks, code quality, performance, best practices, output format |
| `reference/code-standards.md` | Project standards: file organisation, error handling, DRY, logging, output quality |

## Error Handling

If no changes are found, report "No changes detected" and list the files/paths searched.
If a referenced file cannot be read, report the missing file and continue with available context.
