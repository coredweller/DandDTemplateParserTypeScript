import { pgEnum, pgTable, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// ── Enum ───────────────────────────────────────────────────────────────────────
export const traitCategoryEnum = pgEnum('trait_category', [
  'special_trait',
  'action',
  'bonus_action',
  'reaction',
  'legendary_trait',
  'legendary_action_option',
  'lair_action',
]);

// ── monsters ───────────────────────────────────────────────────────────────────
export const monsters = pgTable('monsters', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type', { enum: ['general', 'legendary'] }).notNull(),
  character_name: text('character_name').notNull(),
  alignment: text('alignment').notNull().default(''),
  race: text('race').notNull().default(''),
  class: text('class').notNull().default(''),
  level: integer('level'),
  hp: text('hp').notNull().default(''),
  ac: integer('ac'),
  speed: text('speed').notNull().default(''),
  senses: text('senses').notNull().default(''),
  languages: text('languages').notNull().default(''),
  notes: text('notes').notNull().default(''),
  equipment_armor: text('equipment_armor').notNull().default(''),
  equipment_weapons: text('equipment_weapons').notNull().default(''),
  equipment_other: text('equipment_other').notNull().default(''),
  challenge_rating: text('challenge_rating'),
  proficiency_bonus: text('proficiency_bonus'),
  legendary_action_uses: integer('legendary_action_uses'),
  damage_resistances: text('damage_resistances'),
  damage_immunities: text('damage_immunities'),
  condition_immunities: text('condition_immunities'),
  mythic_trait_name: text('mythic_trait_name'),
  mythic_trait_description: text('mythic_trait_description'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type MonsterRow = typeof monsters.$inferSelect;
export type NewMonsterRow = typeof monsters.$inferInsert;

// ── monster_ability_scores ─────────────────────────────────────────────────────
export const monsterAbilityScores = pgTable('monster_ability_scores', {
  monster_id: uuid('monster_id').primaryKey().references(() => monsters.id, { onDelete: 'cascade' }),
  strength: integer('strength').notNull(),
  dexterity: integer('dexterity').notNull(),
  constitution: integer('constitution').notNull(),
  intelligence: integer('intelligence').notNull(),
  wisdom: integer('wisdom').notNull(),
  charisma: integer('charisma').notNull(),
});

export type MonsterAbilityScoreRow = typeof monsterAbilityScores.$inferSelect;
export type NewMonsterAbilityScoreRow = typeof monsterAbilityScores.$inferInsert;

// ── monster_saving_throws ──────────────────────────────────────────────────────
export const monsterSavingThrows = pgTable('monster_saving_throws', {
  id: uuid('id').primaryKey().defaultRandom(),
  monster_id: uuid('monster_id').notNull().references(() => monsters.id, { onDelete: 'cascade' }),
  ability_name: text('ability_name').notNull(),
  value: text('value').notNull(),
});

export type MonsterSavingThrowRow = typeof monsterSavingThrows.$inferSelect;

// ── monster_skills ─────────────────────────────────────────────────────────────
export const monsterSkills = pgTable('monster_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  monster_id: uuid('monster_id').notNull().references(() => monsters.id, { onDelete: 'cascade' }),
  skill_name: text('skill_name').notNull(),
  value: text('value').notNull(),
});

export type MonsterSkillRow = typeof monsterSkills.$inferSelect;

// ── monster_traits ─────────────────────────────────────────────────────────────
export const monsterTraits = pgTable('monster_traits', {
  id: uuid('id').primaryKey().defaultRandom(),
  monster_id: uuid('monster_id').notNull().references(() => monsters.id, { onDelete: 'cascade' }),
  category: traitCategoryEnum('category').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  ordinal: integer('ordinal').notNull().default(0),
});

export type MonsterTraitRow = typeof monsterTraits.$inferSelect;
export type NewMonsterTraitRow = typeof monsterTraits.$inferInsert;
export type TraitCategory = (typeof traitCategoryEnum.enumValues)[number];

// ── monster_regional_effects ───────────────────────────────────────────────────
export const monsterRegionalEffects = pgTable('monster_regional_effects', {
  id: uuid('id').primaryKey().defaultRandom(),
  monster_id: uuid('monster_id').notNull().references(() => monsters.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  ordinal: integer('ordinal').notNull().default(0),
});

export type MonsterRegionalEffectRow = typeof monsterRegionalEffects.$inferSelect;
