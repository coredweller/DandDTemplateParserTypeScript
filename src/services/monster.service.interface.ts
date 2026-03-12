import type { GeneralMonsterTemplate, LegendaryMonsterTemplate, MonsterId } from '../domain/monster.js';
import type { Result } from '../domain/errors.js';

export interface IMonsterService {
  createGeneral(data: GeneralMonsterTemplate): Promise<Result<{ id: MonsterId; html: string }>>;
  createLegendary(data: LegendaryMonsterTemplate): Promise<Result<{ id: MonsterId; html: string }>>;
  getById(id: MonsterId): Promise<Result<{ id: MonsterId; html: string }>>;
}
