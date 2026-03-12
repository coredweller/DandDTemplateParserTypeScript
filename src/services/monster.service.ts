import type { Logger } from 'pino';
import {
  createMonster,
  type GeneralMonsterTemplate,
  type LegendaryMonsterTemplate,
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
    const monster = createMonster('general', data);
    await this.repository.save(monster);

    const html = renderMonsterHtml(monster);
    this.log.info({ monsterId: monster.id, characterName: data.CharacterName }, 'General monster created');
    return ok({ id: monster.id, html });
  }

  async createLegendary(data: LegendaryMonsterTemplate): Promise<Result<{ id: MonsterId; html: string }>> {
    const monster = createMonster('legendary', data);
    await this.repository.save(monster);

    const html = renderMonsterHtml(monster);
    this.log.info({ monsterId: monster.id, characterName: data.CharacterName }, 'Legendary monster created');
    return ok({ id: monster.id, html });
  }

  async getById(id: MonsterId): Promise<Result<{ id: MonsterId; html: string }>> {
    const monster = await this.repository.findById(id);

    if (!monster) {
      this.log.warn({ monsterId: id }, 'Monster not found');
      return fail({ kind: 'NotFound', id });
    }

    const html = renderMonsterHtml(monster);
    return ok({ id: monster.id, html });
  }
}
