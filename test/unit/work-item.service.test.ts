import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from 'pino';
import type { WorkItem } from '../../src/domain/work-item.js';
import { newWorkItemId, workItemIdFrom } from '../../src/domain/work-item.js';
import type { IWorkItemRepository } from '../../src/repositories/work-item.repository.interface.js';
import { WorkItemService } from '../../src/services/work-item.service.js';

// ── Stub repository ──────────────────────────────────────────────────────────
function makeRepository(overrides: Partial<IWorkItemRepository> = {}): IWorkItemRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockImplementation((item: WorkItem) => Promise.resolve(item)),
    deleteById: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

const noopLog = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as Logger;

// ── listAll ──────────────────────────────────────────────────────────────────
describe('WorkItemService.listAll', () => {
  it('returns all items from repository', async () => {
    const items: WorkItem[] = [
      { id: newWorkItemId(), title: 'Buy milk', createdAt: new Date() },
    ];
    const repository = makeRepository({ findAll: vi.fn().mockResolvedValue(items) });
    const sut = new WorkItemService(repository, noopLog);

    const result = await sut.listAll();

    expect(result).toEqual(items);
    expect(vi.mocked(repository.findAll)).toHaveBeenCalledOnce();
  });
});

// ── getById ──────────────────────────────────────────────────────────────────
describe('WorkItemService.getById', () => {
  it('returns ok with item when found', async () => {
    const item: WorkItem = { id: newWorkItemId(), title: 'Buy milk', createdAt: new Date() };
    const repository = makeRepository({ findById: vi.fn().mockResolvedValue(item) });
    const sut = new WorkItemService(repository, noopLog);

    const result = await sut.getById(item.id);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(item);
  });

  it('returns NotFound error when item does not exist', async () => {
    const repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });
    const sut = new WorkItemService(repository, noopLog);

    const result = await sut.getById(workItemIdFrom('00000000-0000-0000-0000-000000000001'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });
});

// ── create ───────────────────────────────────────────────────────────────────
describe('WorkItemService.create', () => {
  let repository: IWorkItemRepository;
  let sut: WorkItemService;

  beforeEach(() => {
    repository = makeRepository();
    sut = new WorkItemService(repository, noopLog);
  });

  it('returns created item with trimmed title', async () => {
    const result = await sut.create('  Walk the dog  ');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Walk the dog');
      expect(result.value.id).toBeDefined();
    }
    expect(vi.mocked(repository.save)).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Walk the dog' }),
    );
  });

  it.each(['', '   '])('returns ValidationError for blank title "%s"', async (title) => {
    const result = await sut.create(title);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('ValidationError');
    expect(vi.mocked(repository.save)).not.toHaveBeenCalled();
  });
});

// ── delete ───────────────────────────────────────────────────────────────────
describe('WorkItemService.delete', () => {
  it('returns ok(true) when item is deleted', async () => {
    const id = newWorkItemId();
    const repository = makeRepository({ deleteById: vi.fn().mockResolvedValue(true) });
    const sut = new WorkItemService(repository, noopLog);

    const result = await sut.delete(id);

    expect(result.ok).toBe(true);
  });

  it('returns NotFound error when item does not exist', async () => {
    const repository = makeRepository({ deleteById: vi.fn().mockResolvedValue(false) });
    const sut = new WorkItemService(repository, noopLog);

    const result = await sut.delete(newWorkItemId());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });
});
