import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import sensible from '@fastify/sensible';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Logger } from 'pino';
import { config } from './config.js';
import { db } from './db.js';
import { DrizzleMonsterRepository } from './repositories/monster.repository.js';
import { MonsterService } from './services/monster.service.js';
import type { IMonsterService } from './services/monster.service.interface.js';
import { monstersPlugin } from './routes/monsters.js';

// Optional deps allow tests to inject stub implementations without vi.mock()
interface AppDeps {
  monsterService?: IMonsterService;
}

export async function buildApp(deps: AppDeps = {}) {
  // Run pending migrations before accepting traffic.
  // drizzle-orm/migrator reads the SQL files directly — drizzle-kit is not required at runtime.
  if (config.NODE_ENV !== 'test') {
    const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '../migrations');
    await migrate(db, { migrationsFolder });
  }

  // Build logger options — conditionally include transport only in development
  // to satisfy exactOptionalPropertyTypes (cannot assign undefined to transport)
  const loggerOptions = config.NODE_ENV === 'development'
    ? { level: config.LOG_LEVEL, transport: { target: 'pino-pretty' } }
    : { level: config.LOG_LEVEL };

  const app = Fastify({ logger: loggerOptions });

  // ── Type provider ──────────────────────────────────────────────────────────
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // ── Plugins ────────────────────────────────────────────────────────────────
  await app.register(sensible);

  // ── Error handler (RFC 7807 ProblemDetails) ────────────────────────────────
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, 'Unhandled error');
    const status = error.statusCode ?? 500;
    void reply.status(status).send({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: error.message ?? 'Internal Server Error',
      status,
      instance: request.url,
    });
  });

  // ── Dependencies ───────────────────────────────────────────────────────────
  // Cast FastifyBaseLogger to pino Logger — Fastify's base logger is a superset
  // at runtime, but the types diverge on rarely-used members like msgPrefix.
  const log = app.log as unknown as Logger;
  const monsterRepository = new DrizzleMonsterRepository(db, log);
  const monsterService = deps.monsterService ?? new MonsterService(monsterRepository, log);

  // ── Routes ─────────────────────────────────────────────────────────────────
  await app.register(monstersPlugin(monsterService), { prefix: '/api/v1' });

  // ── Health check ───────────────────────────────────────────────────────────
  // Registered under the same prefix so a single change keeps all routes consistent.
  await app.register((api, _opts, done) => {
    api.get('/health', () => ({ status: 'ok' }));
    done();
  }, { prefix: '/api/v1' });

  return app;
}

// Only start the server when this file is the entry point (not in tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildApp();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
}
