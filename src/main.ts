import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import sensible from '@fastify/sensible';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type { Logger } from 'pino';
import { config } from './config.js';
import { db } from './db.js';
import { DrizzleWorkItemRepository } from './repositories/work-item.repository.js';
import { WorkItemService } from './services/work-item.service.js';
import type { IWorkItemService } from './services/work-item.service.interface.js';
import { workItemsPlugin } from './routes/work-items.js';

// Optional deps allow tests to inject stub implementations without vi.mock()
interface AppDeps {
  service?: IWorkItemService;
}

export async function buildApp(deps: AppDeps = {}) {
  // Run pending migrations before accepting traffic.
  // drizzle-orm/migrator reads the SQL files directly — drizzle-kit is not required at runtime.
  if (config.NODE_ENV !== 'test') {
    await migrate(db, { migrationsFolder: './migrations' });
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
  const repository = new DrizzleWorkItemRepository(db, log);
  const service = deps.service ?? new WorkItemService(repository, log);

  // ── Routes ─────────────────────────────────────────────────────────────────
  await app.register(workItemsPlugin(service), { prefix: '/api/v1' });

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
