import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/main.js';
import type { IMonsterService } from '../../../src/services/monster.service.interface.js';
import { ok, fail } from '../../../src/domain/errors.js';
import { createMonster, monsterIdFrom } from '../../../src/domain/monster.js';
import { generalTemplate, legendaryTemplate, generalRequestBody, legendaryRequestBody } from '../../fixtures.js';

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function makeStubService(): IMonsterService {
  return {
    createGeneral:   vi.fn(),
    createLegendary: vi.fn(),
    getById:         vi.fn(),
    query:           vi.fn(),
  };
}

describe('POST /api/v1/monsters/general', () => {
  let app: FastifyInstance;
  let service: IMonsterService;

  beforeEach(async () => {
    service = makeStubService();
    app = await buildApp({ monsterService: service });
  });

  afterEach(async () => { await app.close(); });

  it('returns 201 with id and html on success', async () => {
    const monster = createMonster('general', generalTemplate);
    vi.mocked(service.createGeneral).mockResolvedValueOnce(ok({ id: monster.id, html: '<html>test</html>' }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/monsters/general',
      payload: generalRequestBody,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<{ id: string; html: string }>();
    expect(body.id).toBe(monster.id);
    expect(body.html).toBe('<html>test</html>');
  });

  it('computes Modifier from Score (ignores caller-supplied Modifier)', async () => {
    const monster = createMonster('general', generalTemplate);
    vi.mocked(service.createGeneral).mockResolvedValueOnce(ok({ id: monster.id, html: '' }));

    // Body WITH Modifier — should still succeed (Modifier is stripped, Score used)
    const bodyWithModifier = {
      ...generalRequestBody,
      AbilityScores: {
        Strength:     { Score: 8,  Modifier: 'WRONG' },
        Dexterity:    { Score: 14, Modifier: 'WRONG' },
        Constitution: { Score: 10, Modifier: 'WRONG' },
        Intelligence: { Score: 10, Modifier: 'WRONG' },
        Wisdom:       { Score: 8,  Modifier: 'WRONG' },
        Charisma:     { Score: 8,  Modifier: 'WRONG' },
      },
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/monsters/general',
      payload: bodyWithModifier,
    });

    expect(response.statusCode).toBe(201);
    // Verify the service received correct computed modifiers, not 'WRONG'
    const [calledData] = vi.mocked(service.createGeneral).mock.calls[0]!;
    expect(calledData.AbilityScores.Strength.Modifier).toBe('-1');
    expect(calledData.AbilityScores.Dexterity.Modifier).toBe('+2');
  });

  it('returns 400 when CharacterName is missing', async () => {
    const { CharacterName: _, ...bodyWithoutName } = generalRequestBody;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/monsters/general',
      payload: bodyWithoutName,
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when a Score is a float', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/monsters/general',
      payload: {
        ...generalRequestBody,
        AbilityScores: { ...generalRequestBody.AbilityScores, Strength: { Score: 8.5 } },
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it.each([0, 31])('returns 400 when a Score is out of range (%i)', async (score) => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/monsters/general',
      payload: {
        ...generalRequestBody,
        AbilityScores: { ...generalRequestBody.AbilityScores, Strength: { Score: score } },
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it.each([1, 15, 30])('returns 201 when a Score is at a valid boundary (%i)', async (score) => {
    const monster = createMonster('general', generalTemplate);
    vi.mocked(service.createGeneral).mockResolvedValueOnce(ok({ id: monster.id, html: '' }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/monsters/general',
      payload: {
        ...generalRequestBody,
        AbilityScores: { ...generalRequestBody.AbilityScores, Strength: { Score: score } },
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it('returns 500 when service returns InternalError', async () => {
    vi.mocked(service.createGeneral).mockResolvedValueOnce(fail({ kind: 'InternalError', message: 'DB down' }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/monsters/general',
      payload: generalRequestBody,
    });

    expect(response.statusCode).toBe(500);
  });
});

describe('POST /api/v1/monsters/legendary', () => {
  let app: FastifyInstance;
  let service: IMonsterService;

  beforeEach(async () => {
    service = makeStubService();
    app = await buildApp({ monsterService: service });
  });

  afterEach(async () => { await app.close(); });

  it('returns 201 with id and html on success', async () => {
    const monster = createMonster('legendary', legendaryTemplate);
    vi.mocked(service.createLegendary).mockResolvedValueOnce(ok({ id: monster.id, html: '<html>legendary</html>' }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/monsters/legendary',
      payload: legendaryRequestBody,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<{ id: string; html: string }>();
    expect(body.id).toBe(monster.id);
  });

  it('returns 400 when LegendaryActionUses is not a whole number', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/monsters/legendary',
      payload: {
        ...legendaryRequestBody,
        LegendaryActions: { 'Legendary Action Uses': 'three', Options: {} },
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when a required legendary field is missing', async () => {
    const { ChallengeRating: _, ...bodyWithout } = legendaryRequestBody;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/monsters/legendary',
      payload: bodyWithout,
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('GET /api/v1/monsters/:id', () => {
  let app: FastifyInstance;
  let service: IMonsterService;

  beforeEach(async () => {
    service = makeStubService();
    app = await buildApp({ monsterService: service });
  });

  afterEach(async () => { await app.close(); });

  it('returns 200 with id and html when monster is found', async () => {
    vi.mocked(service.getById).mockResolvedValueOnce(ok({ id: monsterIdFrom(VALID_UUID), html: '<html>found</html>' }));

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/monsters/${VALID_UUID}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ id: string; html: string }>();
    expect(body.id).toBe(VALID_UUID);
    expect(body.html).toBe('<html>found</html>');
  });

  it('returns 404 when monster does not exist', async () => {
    vi.mocked(service.getById).mockResolvedValueOnce(fail({ kind: 'NotFound', id: VALID_UUID }));

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/monsters/${VALID_UUID}`,
    });

    expect(response.statusCode).toBe(404);
  });

  it('returns 400 for an invalid UUID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/monsters/not-a-uuid',
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('GET /api/v1/monsters', () => {
  let app: FastifyInstance;
  let service: IMonsterService;

  const emptyPage = { items: [], total: 0, limit: 20, offset: 0 };

  beforeEach(async () => {
    service = makeStubService();
    app = await buildApp({ monsterService: service });
  });

  afterEach(async () => { await app.close(); });

  it('returns 200 with a page of results', async () => {
    vi.mocked(service.query).mockResolvedValueOnce(ok(emptyPage));

    const response = await app.inject({ method: 'GET', url: '/api/v1/monsters' });

    expect(response.statusCode).toBe(200);
    const body = response.json<typeof emptyPage>();
    expect(body.total).toBe(0);
    expect(body.items).toEqual([]);
    expect(body.limit).toBe(20);
    expect(body.offset).toBe(0);
  });

  it('passes type filter to service', async () => {
    vi.mocked(service.query).mockResolvedValueOnce(ok(emptyPage));

    await app.inject({ method: 'GET', url: '/api/v1/monsters?type=legendary' });

    expect(vi.mocked(service.query).mock.calls[0]![0]!.type).toBe('legendary');
  });

  it('passes levelMin and levelMax filters to service', async () => {
    vi.mocked(service.query).mockResolvedValueOnce(ok(emptyPage));

    await app.inject({ method: 'GET', url: '/api/v1/monsters?levelMin=5&levelMax=10' });

    const filters = vi.mocked(service.query).mock.calls[0]![0]!;
    expect(filters.levelMin).toBe(5);
    expect(filters.levelMax).toBe(10);
  });

  it('applies default limit and offset when not provided', async () => {
    vi.mocked(service.query).mockResolvedValueOnce(ok(emptyPage));

    await app.inject({ method: 'GET', url: '/api/v1/monsters' });

    const filters = vi.mocked(service.query).mock.calls[0]![0]!;
    expect(filters.limit).toBe(20);
    expect(filters.offset).toBe(0);
  });

  it('returns 400 when levelMin exceeds levelMax', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/monsters?levelMin=10&levelMax=5',
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for an unknown type value', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/monsters?type=unknown',
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 500 when service returns InternalError', async () => {
    vi.mocked(service.query).mockResolvedValueOnce(fail({ kind: 'InternalError', message: 'DB down' }));

    const response = await app.inject({ method: 'GET', url: '/api/v1/monsters' });

    expect(response.statusCode).toBe(500);
  });
});
