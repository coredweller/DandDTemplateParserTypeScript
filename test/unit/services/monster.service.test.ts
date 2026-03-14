import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Logger } from 'pino';
import { MonsterService } from '../../../src/services/monster.service.js';
import type { IMonsterRepository } from '../../../src/repositories/monster.repository.interface.js';
import { createMonster, monsterIdFrom, type Monster, type MonsterPage } from '../../../src/domain/monster.js';
import { generalTemplate, legendaryTemplate } from '../../fixtures.js';

const nullLog = {
  info:  vi.fn(),
  warn:  vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
} as unknown as Logger;

function makeStubRepo(): IMonsterRepository {
  return {
    save:     vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
  };
}

describe('MonsterService.createGeneral', () => {
  let repo: IMonsterRepository;
  let service: MonsterService;

  beforeEach(() => {
    repo = makeStubRepo();
    service = new MonsterService(repo, nullLog);
  });

  it('saves the monster and returns id + html on success', async () => {
    // The service creates its own Monster internally — echo it back so save succeeds
    vi.mocked(repo.save).mockImplementationOnce((m: Monster) => Promise.resolve(m));

    const result = await service.createGeneral(generalTemplate);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Verify the returned id matches the monster the service passed to save
    const passedToSave = vi.mocked(repo.save).mock.calls[0]![0]!;
    expect(result.value.id).toBe(passedToSave.id);
    expect(result.value.html).toContain('Goblin');
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it('returns InternalError when the repository throws', async () => {
    vi.mocked(repo.save).mockRejectedValueOnce(new Error('DB down'));

    const result = await service.createGeneral(generalTemplate);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('InternalError');
  });
});

describe('MonsterService.createLegendary', () => {
  let repo: IMonsterRepository;
  let service: MonsterService;

  beforeEach(() => {
    repo = makeStubRepo();
    service = new MonsterService(repo, nullLog);
  });

  it('saves the monster and returns id + html on success', async () => {
    vi.mocked(repo.save).mockImplementationOnce((m: Monster) => Promise.resolve(m));

    const result = await service.createLegendary(legendaryTemplate);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const passedToSave = vi.mocked(repo.save).mock.calls[0]![0]!;
    expect(result.value.id).toBe(passedToSave.id);
    expect(result.value.html).toContain('Ancient Red Dragon');
  });

  it('returns InternalError when the repository throws', async () => {
    vi.mocked(repo.save).mockRejectedValueOnce(new Error('DB down'));

    const result = await service.createLegendary(legendaryTemplate);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('InternalError');
  });
});

describe('MonsterService.getById', () => {
  let repo: IMonsterRepository;
  let service: MonsterService;

  beforeEach(() => {
    repo = makeStubRepo();
    service = new MonsterService(repo, nullLog);
  });

  it('returns id + html when monster is found', async () => {
    const monster = createMonster('general', generalTemplate);
    vi.mocked(repo.findById).mockResolvedValueOnce(monster);

    const result = await service.getById(monster.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(monster.id);
    expect(result.value.html).toContain('Goblin');
  });

  it('returns NotFound when monster does not exist', async () => {
    vi.mocked(repo.findById).mockResolvedValueOnce(null);

    const result = await service.getById(monsterIdFrom('00000000-0000-0000-0000-000000000000'));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('NotFound');
  });

  it('returns InternalError when the repository throws', async () => {
    vi.mocked(repo.findById).mockRejectedValueOnce(new Error('DB down'));

    const result = await service.getById(monsterIdFrom('00000000-0000-0000-0000-000000000000'));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('InternalError');
  });
});

describe('MonsterService.query', () => {
  let repo: IMonsterRepository;
  let service: MonsterService;

  beforeEach(() => {
    repo = makeStubRepo();
    service = new MonsterService(repo, nullLog);
  });

  it('returns a page of results on success', async () => {
    const page: MonsterPage = { items: [], total: 0, limit: 20, offset: 0 };
    vi.mocked(repo.findMany).mockResolvedValueOnce(page);

    const result = await service.query({ limit: 20, offset: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(page);
    expect(repo.findMany).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });

  it('passes filters through to repository', async () => {
    const page: MonsterPage = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(repo.findMany).mockResolvedValueOnce(page);

    await service.query({ type: 'legendary', levelMin: 5, levelMax: 10, limit: 10, offset: 0 });

    expect(repo.findMany).toHaveBeenCalledWith({
      type: 'legendary', levelMin: 5, levelMax: 10, limit: 10, offset: 0,
    });
  });

  it('returns InternalError when repository throws', async () => {
    vi.mocked(repo.findMany).mockRejectedValueOnce(new Error('DB down'));

    const result = await service.query({ limit: 20, offset: 0 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('InternalError');
  });
});
