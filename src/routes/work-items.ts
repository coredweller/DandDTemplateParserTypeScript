import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { AppError } from '../domain/errors.js';
import { workItemIdFrom } from '../domain/work-item.js';
import type { IWorkItemService } from '../services/work-item.service.interface.js';

// ── HTTP translation — maps domain errors to status codes (HTTP concern, not domain) ──
// Returns literal union so Fastify's typed reply.status() accepts the value.
// The default case uses a never-assignable check — if a new AppError variant is added
// without updating this function, TypeScript will produce a compile error here.
function statusFor(error: AppError): 400 | 404 | 409 | 500 {
  switch (error.kind) {
    case 'NotFound':        return 404;
    case 'ValidationError': return 400;
    case 'Conflict':        return 409;
    case 'InternalError':   return 500;
    default: {
      const _exhaustive: never = error;
      console.error(`Unhandled AppError kind: ${(_exhaustive as AppError).kind}`);
      return 500;
    }
  }
}

// ── Zod schemas — single source of truth for validation AND serialization ────
const WorkItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.date(),
});

const CreateWorkItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
});

const WorkItemIdParamSchema = z.object({
  id: z.string().uuid('Invalid work item ID format'),
});

const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  instance: z.string(),
});

// ── Factory — injects service dependency, returns a Fastify plugin ───────────
export function workItemsPlugin(service: IWorkItemService): FastifyPluginCallbackZod {
  return function (app, _opts, done) {
    // GET /workitems
    app.get(
      '/workitems',
      { schema: { response: { 200: z.array(WorkItemSchema) } } },
      async () => {
        const items = await service.listAll();
        // Cast readonly to mutable — Zod response schema expects a mutable array,
        // but the service correctly returns readonly to prevent mutation in business logic.
        return items as unknown as z.infer<typeof WorkItemSchema>[];
      },
    );

    // GET /workitems/:id
    app.get(
      '/workitems/:id',
      {
        schema: {
          params: WorkItemIdParamSchema,
          response: {
            200: WorkItemSchema,
            404: ProblemDetailsSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await service.getById(workItemIdFrom(request.params.id));

        if (!result.ok) {
          const code = statusFor(result.error);
          return reply.status(code as 404).send({
            type: 'https://tools.ietf.org/html/rfc7807',
            title: `Work item ${request.params.id} not found.`,
            status: code,
            instance: request.url,
          });
        }

        return result.value;
      },
    );

    // POST /workitems
    app.post(
      '/workitems',
      {
        schema: {
          body: CreateWorkItemSchema,
          response: {
            201: WorkItemSchema,
            400: ProblemDetailsSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await service.create(request.body.title);

        if (!result.ok) {
          const code = statusFor(result.error);
          return reply.status(code as 400).send({
            type: 'https://tools.ietf.org/html/rfc7807',
            title: result.error.kind === 'ValidationError' ? result.error.message : 'Bad Request',
            status: code,
            instance: request.url,
          });
        }

        return reply.status(201).send(result.value);
      },
    );

    // DELETE /workitems/:id
    app.delete(
      '/workitems/:id',
      {
        schema: {
          params: WorkItemIdParamSchema,
          response: {
            204: z.undefined(),
            404: ProblemDetailsSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await service.delete(workItemIdFrom(request.params.id));

        if (!result.ok) {
          const code = statusFor(result.error);
          return reply.status(code as 404).send({
            type: 'https://tools.ietf.org/html/rfc7807',
            title: `Work item ${request.params.id} not found.`,
            status: code,
            instance: request.url,
          });
        }

        return reply.status(204).send();
      },
    );

    done();
  };
}
