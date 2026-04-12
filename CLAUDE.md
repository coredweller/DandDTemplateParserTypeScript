# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with hot reload (tsx watch)
npm run build        # Compile to dist/
npm run typecheck    # Type-check without emitting
npm run lint         # ESLint
npm test             # Run all tests (vitest)
npm run test:watch   # Watch mode
npm run test:coverage

# Run a single test file
npx vitest run test/unit/domain/monster.test.ts

# Database
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Apply migrations
npm run db:studio    # Open Drizzle Studio
```

Environment variables required: `DATABASE_URL`. See `src/config.ts` for the full Zod-validated schema — never read `process.env` directly, always import `config`.

## Architecture

Strict layered architecture: **Routes → Service → Repository → Domain**. Each layer only imports inward.

```
src/
  config.ts               # Zod-parsed env vars (throws at startup if invalid)
  db.ts                   # postgres-js + Drizzle client
  domain/
    errors.ts             # AppError discriminated union + Result<T>
    monster.ts            # Domain types, branded MonsterId, factories, query types
    monster-html.ts       # HTML rendering from templates
  routes/monsters.ts      # Fastify plugin: Zod schemas, HTTP → domain mapping
  services/               # MonsterService + IMonsterService interface
  repositories/           # DrizzleMonsterRepository + IMonsterRepository interface
  schema/monsters.schema.ts  # Drizzle table definitions (source of truth for DB shape)
```

### Key Patterns

**Result<T>** — all service and repository methods return `Result<T, AppError>` (never throw to callers). Use `ok(value)` / `fail(error)` from `domain/errors.ts`. Routes check `result.ok` and map `AppError.kind` to HTTP status via the `statusFor` switch.

**Zod at the HTTP boundary only** — `AbilityScoreSchema` in `routes/monsters.ts` validates and transforms: it accepts `{ Score }`, computes `Modifier` via `abilityModifier()`, and strips any caller-supplied `Modifier`. Domain types carry computed modifiers; the route is the only place scores are validated.

**Dependency injection via `buildApp(deps)`** — `main.ts` exports `buildApp({ monsterService? })`. Integration tests pass a stub service without `vi.mock()`, keeping tests fast and isolated. Migrations are skipped when `NODE_ENV === 'test'`.

**Branded types** — `MonsterId = string & { _brand: 'MonsterId' }`. Use `monsterIdFrom(str)` to cast from raw strings and `newMonsterId()` to create new ones.

**DB schema vs domain** — The DB is normalised (6 tables); the domain is denormalised (flat template interfaces). The repository handles all mapping in both directions. Traits (special traits, actions, bonus actions, etc.) are stored in a single `monster_traits` table discriminated by `TraitCategory` enum.

### TypeScript Config

Strict mode plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`. All imports use `.js` extensions (NodeNext module resolution). Tests are excluded from the main `tsconfig.json`; see `tsconfig.test.json`.

## Tests

Integration tests live in `test/integration/`, unit tests in `test/unit/`. Fixtures are in `test/fixtures.ts`. The vitest config hardcodes `DATABASE_URL=postgres://test:test@localhost:5432/test_db` — tests do not hit a real DB (service is stubbed at the route layer).

Always write tests for new routes and domain logic. Follow the existing `it.each` pattern for boundary value coverage.
