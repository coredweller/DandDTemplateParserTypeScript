import type { Monster, MonsterFilters, MonsterPage, MonsterId } from '../domain/monster.js';

export interface IMonsterRepository {
  save(monster: Monster): Promise<Monster>;
  findById(id: MonsterId): Promise<Monster | null>;
  findMany(filters: MonsterFilters): Promise<MonsterPage>;
}
