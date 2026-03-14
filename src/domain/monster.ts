// ── Branded ID — prevents passing a raw string where MonsterId is expected ──
export type MonsterId = string & { readonly _brand: 'MonsterId' };

export function newMonsterId(): MonsterId {
  return crypto.randomUUID() as MonsterId;
}

export function monsterIdFrom(value: string): MonsterId {
  return value as MonsterId;
}

// ── Domain helpers ───────────────────────────────────────────────────────────
export function abilityModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// ── Supporting types ────────────────────────────────────────────────────────
export interface AbilityScore {
  readonly Score: number;
  readonly Modifier: string;
}

export interface AbilityScores {
  readonly Strength: AbilityScore;
  readonly Dexterity: AbilityScore;
  readonly Constitution: AbilityScore;
  readonly Intelligence: AbilityScore;
  readonly Wisdom: AbilityScore;
  readonly Charisma: AbilityScore;
}

export interface Equipment {
  readonly Armor: string;
  readonly Weapons: string;
  readonly Other: string;
}

export interface LegendaryActions {
  readonly 'Legendary Action Uses': string;
  readonly Options: Record<string, string>;
}

export interface MythicTrait {
  readonly Name: string;
  readonly Description: string;
}

// ── Template interfaces ─────────────────────────────────────────────────────
export interface GeneralMonsterTemplate {
  readonly CharacterName: string;
  readonly Level: number;
  readonly Race: string;
  readonly Class: string;
  readonly Alignment: string;
  readonly HP: string;
  readonly AC: number;
  readonly Speed: string;
  readonly AbilityScores: AbilityScores;
  readonly SavingThrows: Record<string, string>;
  readonly Skills: Record<string, string>;
  readonly Senses: string;
  readonly Languages: string;
  readonly SpecialTraits: Record<string, string>;
  readonly Actions: Record<string, string>;
  readonly Equipment: Equipment;
  readonly Notes: string;
}

export interface LegendaryMonsterTemplate extends GeneralMonsterTemplate {
  readonly DamageResistances: string;
  readonly DamageImmunities: string;
  readonly ConditionImmunities: string;
  readonly ChallengeRating: string;
  readonly ProficiencyBonus: string;
  readonly BonusActions: Record<string, string>;
  readonly Reactions: Record<string, string>;
  readonly LegendaryTraits: Record<string, string>;
  readonly LegendaryActions: LegendaryActions;
  readonly MythicTrait: MythicTrait;
  readonly LairActions: Record<string, string>;
  readonly RegionalEffects: string[];
}

// ── Aggregate root ──────────────────────────────────────────────────────────
export interface Monster {
  readonly id: MonsterId;
  readonly type: 'general' | 'legendary';
  readonly data: GeneralMonsterTemplate | LegendaryMonsterTemplate;
  readonly createdAt: Date;
}

// ── Type guard ──────────────────────────────────────────────────────────────
export function isLegendaryMonster(
  monster: Monster,
): monster is Monster & { type: 'legendary'; data: LegendaryMonsterTemplate } {
  return monster.type === 'legendary';
}

// ── Query types ─────────────────────────────────────────────────────────────
export interface MonsterFilters {
  readonly type?: 'general' | 'legendary' | undefined;
  readonly levelMin?: number | undefined;
  readonly levelMax?: number | undefined;
  readonly limit: number;
  readonly offset: number;
}

export interface MonsterSummary {
  readonly id: MonsterId;
  readonly type: 'general' | 'legendary';
  readonly characterName: string;
  readonly level: number | null;
  readonly createdAt: Date;
}

export interface MonsterPage {
  readonly items: MonsterSummary[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

// ── Factories ───────────────────────────────────────────────────────────────
export function createMonster(
  type: 'general',
  data: GeneralMonsterTemplate,
): Monster;
export function createMonster(
  type: 'legendary',
  data: LegendaryMonsterTemplate,
): Monster;
export function createMonster(
  type: 'general' | 'legendary',
  data: GeneralMonsterTemplate | LegendaryMonsterTemplate,
): Monster {
  return {
    id: newMonsterId(),
    type,
    data,
    createdAt: new Date(),
  };
}

// Reconstitute from persistence (no business rules applied)
export function reconstituteMonster(
  id: string,
  type: 'general' | 'legendary',
  data: GeneralMonsterTemplate | LegendaryMonsterTemplate,
  createdAt: Date,
): Monster {
  return { id: monsterIdFrom(id), type, data, createdAt };
}
