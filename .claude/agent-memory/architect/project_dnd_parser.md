---
name: D&D Template Parser — project overview
description: Stack, architecture, known issues, and design decisions for the DandDTemplateParserTypeScript project
type: project
---

Fastify 5 + Zod + Drizzle ORM + PostgreSQL REST API that accepts D&D 5e monster stat-block JSON templates, persists them to a normalized relational schema, and returns rendered HTML stat blocks.

**Why:** Personal/DM tooling project. No client SPA yet — HTML is returned directly from the API.

**Stack:** Node 24, TypeScript (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes), Fastify 5, Zod validation, Drizzle ORM, PostgreSQL 17, Docker Compose, Vitest.

**Architecture layers:**
- `src/domain/` — pure domain types (Monster, errors, HTML renderer)
- `src/schema/` — Drizzle schema (DB)
- `src/repositories/` — DB access (IMonsterRepository / DrizzleMonsterRepository)
- `src/services/` — business logic (IMonsterService / MonsterService)
- `src/routes/` — Fastify route plugin
- `src/main.ts` — app factory (buildApp) + entry point guard

**Known architectural issues (found 2026-03-12):**
1. No test files exist — test/ dirs are empty. Zero coverage.
2. `updated_at` column in DB schema is never written on update (no update operation exists anywhere).
3. `TraitCategory` type is duplicated: defined in `monster.repository.ts:28` and also implicitly in the Drizzle schema enum. Should be sourced from schema.
4. `AbilityScore.Modifier` is accepted from API callers but the DB only stores the raw score and recalculates modifier on read. The API lets callers submit any modifier string, which is silently discarded on save.
5. Routes for list (GET /monsters), update (PUT/PATCH), and delete (DELETE) are absent — API is currently create+read only.
6. `updated_at` is defined in schema but no update path exists to set it.
7. `isLegendary()` discriminator is implemented twice with different strategies: `monster.repository.ts` uses `type === 'legendary'`; `monster-html.ts` uses `'ChallengeRating' in data`. These can diverge if the domain model changes.
8. `legendary_action_uses` NaN fallback defaults to 2 but template default is 3 — inconsistency.
9. No rate limiting, authentication, or authorization on any route.
10. `db.ts` creates a module-level singleton connection pool — prevents graceful shutdown and makes the pool uncontrollable in tests.

**How to apply:** Use these issues as the baseline when the user asks about next steps, new features, or architecture improvements.
