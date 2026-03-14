import type { Logger } from 'pino';
import {
  createMonster,
  type GeneralMonsterTemplate,
  type LegendaryMonsterTemplate,
  type MonsterFilters,
  type MonsterPage,
  type MonsterId,
} from '../domain/monster.js';
import { renderMonsterHtml } from '../domain/monster-html.js';
import { fail, ok, type Result } from '../domain/errors.js';
import type { IMonsterRepository } from '../repositories/monster.repository.interface.js';
import type { IMonsterService } from './monster.service.interface.js';

export class MonsterService implements IMonsterService {
  constructor(
    private readonly repository: IMonsterRepository,
    private readonly log: Logger,
  ) {}

  async createGeneral(data: GeneralMonsterTemplate): Promise<Result<{ id: MonsterId; html: string }>> {
    try {
      const monster = createMonster('general', data);
      await this.repository.save(monster);
      const html = renderMonsterHtml(monster);
      this.log.info({ monsterId: monster.id, characterName: data.CharacterName }, 'General monster created');
      return ok({ id: monster.id, html });
    } catch (error: unknown) {
      this.log.error({ err: error, characterName: data.CharacterName }, 'Failed to create general monster');
      return fail({ kind: 'InternalError', message: 'Failed to save monster' });
    }
  }

  async createLegendary(data: LegendaryMonsterTemplate): Promise<Result<{ id: MonsterId; html: string }>> {
    try {
      const monster = createMonster('legendary', data);
      await this.repository.save(monster);
      const html = renderMonsterHtml(monster);
      this.log.info({ monsterId: monster.id, characterName: data.CharacterName }, 'Legendary monster created');
      return ok({ id: monster.id, html });
    } catch (error: unknown) {
      this.log.error({ err: error, characterName: data.CharacterName }, 'Failed to create legendary monster');
      return fail({ kind: 'InternalError', message: 'Failed to save monster' });
    }
  }

  async query(filters: MonsterFilters): Promise<Result<MonsterPage>> {
    try {
      const page = await this.repository.findMany(filters);
      this.log.debug({ filters, total: page.total }, 'Monsters queried');
      return ok(page);
    } catch (error: unknown) {
      this.log.error({ err: error, filters }, 'Failed to query monsters');
      return fail({ kind: 'InternalError', message: 'Failed to query monsters' });
    }
  }

  async getById(id: MonsterId): Promise<Result<{ id: MonsterId; html: string }>> {
    try {
      const monster = await this.repository.findById(id);
      if (!monster) {
        this.log.warn({ monsterId: id }, 'Monster not found');
        return fail({ kind: 'NotFound', id });
      }
      const html = renderMonsterHtml(monster);
      return ok({ id: monster.id, html });
    } catch (error: unknown) {
      this.log.error({ err: error, monsterId: id }, 'Failed to retrieve monster');
      return fail({ kind: 'InternalError', message: 'Failed to retrieve monster' });
    }
  }
}
