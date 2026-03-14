import { describe, expect, it } from 'vitest';
import {
  abilityModifier,
  createMonster,
  isLegendaryMonster,
  reconstituteMonster,
  monsterIdFrom,
} from '../../../src/domain/monster.js';
import { generalTemplate, legendaryTemplate } from '../../fixtures.js';

describe('abilityModifier', () => {
  it.each([
    [10, '+0'],
    [11, '+0'],
    [8,  '-1'],
    [9,  '-1'],
    [20, '+5'],
    [1,  '-5'],
    [15, '+2'],
    [14, '+2'],
  ])('score %i → %s', (score, expected) => {
    expect(abilityModifier(score)).toBe(expected);
  });
});

describe('createMonster', () => {
  it('creates a general monster with a uuid id and createdAt', () => {
    const monster = createMonster('general', generalTemplate);

    expect(monster.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(monster.type).toBe('general');
    expect(monster.data).toBe(generalTemplate);
    expect(monster.createdAt).toBeInstanceOf(Date);
  });

  it('creates a legendary monster', () => {
    const monster = createMonster('legendary', legendaryTemplate);

    expect(monster.type).toBe('legendary');
    expect(monster.data).toBe(legendaryTemplate);
  });

  it('each call produces a unique id', () => {
    const a = createMonster('general', generalTemplate);
    const b = createMonster('general', generalTemplate);
    expect(a.id).not.toBe(b.id);
  });
});

describe('isLegendaryMonster', () => {
  it('returns false for a general monster', () => {
    const monster = createMonster('general', generalTemplate);
    expect(isLegendaryMonster(monster)).toBe(false);
  });

  it('returns true for a legendary monster', () => {
    const monster = createMonster('legendary', legendaryTemplate);
    expect(isLegendaryMonster(monster)).toBe(true);
  });

  it('narrows the type so legendary fields are accessible', () => {
    const monster = createMonster('legendary', legendaryTemplate);
    if (isLegendaryMonster(monster)) {
      // TypeScript should allow this without a cast — compile error = test failure
      expect(monster.data.ChallengeRating).toBe('24');
    } else {
      throw new Error('Expected legendary monster to be narrowed');
    }
  });
});

describe('reconstituteMonster', () => {
  it('restores all fields exactly', () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const createdAt = new Date('2025-01-01T00:00:00Z');

    const monster = reconstituteMonster(id, 'general', generalTemplate, createdAt);

    expect(monster.id).toBe(monsterIdFrom(id));
    expect(monster.type).toBe('general');
    expect(monster.data).toBe(generalTemplate);
    expect(monster.createdAt).toBe(createdAt);
  });
});
