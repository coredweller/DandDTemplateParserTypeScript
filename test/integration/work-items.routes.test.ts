import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/main.js';
import type { IWorkItemService } from '../../src/services/work-item.service.interface.js';
import { ok, fail } from '../../src/domain/errors.js';
import { createWorkItem, newWorkItemId } from '../../src/domain/work-item.js';
import type { WorkItem, WorkItemId } from '../../src/domain/work-item.js';

// ── Stub service factory ───────────────────────────────────────────────────────
// Tests pass a stub directly to buildApp({ service }) — no vi.mock() needed.
// Each test configures exactly the behavior it needs via mockResolvedValue.
function makeStubService(overrides: Partial<IWorkItemService> = {}): IWorkItemService {
  return {
    listAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(fail({ kind: 'NotFound', id: 'stub' })),
    create: vi.fn().mockResolvedValue(fail({ kind: 'ValidationError', message: 'stub' })),
    delete: vi.fn().mockResolvedValue(fail({ kind: 'NotFound', id: 'stub' })),
    ...overrides,
  };
}

// ── POST /api/v1/workitems ────────────────────────────────────────────────────
describe('POST /api/v1/workitems', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const item = createWorkItem('Buy milk');
    app = await buildApp({
      service: makeStubService({
        create: vi.fn()
          .mockResolvedValueOnce(ok(item))                                         // valid title -> 201
          .mockResolvedValue(fail({ kind: 'ValidationError', message: 'blank' })), // empty title -> 400
      }),
    });
  });

  afterAll(() => app.close());

  it('201 with created work item for valid title', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/workitems',
      payload: { title: 'Buy milk' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<WorkItem>();
    expect(body.title).toBe('Buy milk');
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('400 for empty title (Zod rejects before service is called)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/workitems',
      payload: { title: '' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('400 when title field is missing (Zod rejects before service is called)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/workitems',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});

// ── GET /api/v1/workitems/:id ─────────────────────────────────────────────────
describe('GET /api/v1/workitems/:id', () => {
  let app: FastifyInstance;
  const existingItem: WorkItem = { id: newWorkItemId(), title: 'Walk the dog', createdAt: new Date() };
  const missingId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    app = await buildApp({
      service: makeStubService({
        getById: vi.fn()
          .mockImplementation((id: WorkItemId) =>
            Promise.resolve(id === existingItem.id
              ? ok(existingItem)
              : fail({ kind: 'NotFound', id })),
          ),
      }),
    });
  });

  afterAll(() => app.close());

  it('200 with work item when found', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/workitems/${existingItem.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<WorkItem>().title).toBe('Walk the dog');
  });

  it('404 for unknown ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/workitems/${missingId}`,
    });

    expect(response.statusCode).toBe(404);
  });
});

// ── DELETE /api/v1/workitems/:id ──────────────────────────────────────────────
describe('DELETE /api/v1/workitems/:id', () => {
  let app: FastifyInstance;
  const existingId = newWorkItemId();
  const missingId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    app = await buildApp({
      service: makeStubService({
        delete: vi.fn()
          .mockImplementation((id: WorkItemId) =>
            Promise.resolve(id === existingId
              ? ok(true as const)
              : fail({ kind: 'NotFound', id })),
          ),
      }),
    });
  });

  afterAll(() => app.close());

  it('204 when work item is deleted', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workitems/${existingId}`,
    });

    expect(response.statusCode).toBe(204);
  });

  it('404 when work item does not exist', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workitems/${missingId}`,
    });

    expect(response.statusCode).toBe(404);
  });
});
