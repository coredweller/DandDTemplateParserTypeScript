-- Migration: 0001_monsters
-- Purpose: Create fully normalized schema for D&D 5e monster/character stat blocks.
--          Handles both general templates (characters/simple monsters) and legendary
--          templates (bosses with legendary actions, mythic traits, lair actions, etc.).

-- ============================================================
-- DOWN (run in reverse order of creation to drop safely)
-- ============================================================
-- DROP TABLE IF EXISTS monster_regional_effects;
-- DROP TABLE IF EXISTS monster_traits;
-- DROP TABLE IF EXISTS monster_skills;
-- DROP TABLE IF EXISTS monster_saving_throws;
-- DROP TABLE IF EXISTS monster_ability_scores;
-- DROP TABLE IF EXISTS monsters;
-- DROP TYPE  IF EXISTS trait_category;
-- ============================================================

--> statement-breakpoint

-- Discriminator enum for the unified trait/action table.
-- Covers every Record<string, string> group across both templates.
CREATE TYPE trait_category AS ENUM (
    'special_trait',
    'action',
    'bonus_action',
    'reaction',
    'legendary_trait',
    'legendary_action_option',
    'lair_action'
);

--> statement-breakpoint

-- ============================================================
-- Core stat-block table
-- One row = one monster or character stat block.
-- Columns that only apply to legendary/boss monsters are nullable.
-- ============================================================
CREATE TABLE monsters (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    character_name          text        NOT NULL,
    alignment               text        NOT NULL DEFAULT '',
    race                    text        NOT NULL DEFAULT '',

    -- General-template fields
    class                   text        NOT NULL DEFAULT '',
    level                   integer,            -- characters / class-based monsters
    hp                      text        NOT NULL DEFAULT '',   -- stored as text: "135 (18d10 + 36)"
    ac                      integer,
    speed                   text        NOT NULL DEFAULT '',
    senses                  text        NOT NULL DEFAULT '',
    languages               text        NOT NULL DEFAULT '',
    notes                   text        NOT NULL DEFAULT '',

    -- Equipment (fixed 3-field shape — no child table needed)
    equipment_armor         text        NOT NULL DEFAULT '',
    equipment_weapons       text        NOT NULL DEFAULT '',
    equipment_other         text        NOT NULL DEFAULT '',

    -- Legendary-template fields (nullable — absent on general monsters)
    challenge_rating        text,               -- "17" or "1/2" or "—"
    proficiency_bonus       text,               -- "+6"
    legendary_action_uses   integer,            -- typically 3
    damage_resistances      text,
    damage_immunities       text,
    condition_immunities    text,

    -- MythicTrait (fixed 2-field shape)
    mythic_trait_name       text,
    mythic_trait_description text,

    -- Audit
    created_at              timestamp with time zone NOT NULL DEFAULT now(),
    updated_at              timestamp with time zone NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- ============================================================
-- Ability scores — one row per monster, one column per ability.
-- Modifier is derived: floor((score - 10) / 2). Not stored.
-- ============================================================
CREATE TABLE monster_ability_scores (
    monster_id      uuid        PRIMARY KEY REFERENCES monsters (id) ON DELETE CASCADE,
    strength        integer     NOT NULL,
    dexterity       integer     NOT NULL,
    constitution    integer     NOT NULL,
    intelligence    integer     NOT NULL,
    wisdom          integer     NOT NULL,
    charisma        integer     NOT NULL
);

--> statement-breakpoint

-- ============================================================
-- Saving throws — Record<string, string> keyed by ability name.
-- Not every ability needs an entry; only proficient saves are listed.
-- ============================================================
CREATE TABLE monster_saving_throws (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    monster_id      uuid        NOT NULL REFERENCES monsters (id) ON DELETE CASCADE,
    ability_name    text        NOT NULL,   -- 'Strength', 'Wisdom', etc.
    value           text        NOT NULL,   -- "+8", "+11"

    CONSTRAINT uq_monster_saving_throw UNIQUE (monster_id, ability_name)
);

--> statement-breakpoint

-- ============================================================
-- Skills — Record<string, string> keyed by skill name.
-- Only proficient/notable skills are stored.
-- ============================================================
CREATE TABLE monster_skills (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    monster_id      uuid        NOT NULL REFERENCES monsters (id) ON DELETE CASCADE,
    skill_name      text        NOT NULL,   -- 'Perception', 'Stealth', etc.
    value           text        NOT NULL,   -- "+14", "+7"

    CONSTRAINT uq_monster_skill UNIQUE (monster_id, skill_name)
);

--> statement-breakpoint

-- ============================================================
-- Traits and actions — unified table for all Record<string, string>
-- groups. The category column discriminates between:
--   special_trait, action, bonus_action, reaction,
--   legendary_trait, legendary_action_option, lair_action
--
-- ordinal preserves insertion order within a category so that
-- the stat block can be rendered in authored sequence.
-- ============================================================
CREATE TABLE monster_traits (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    monster_id      uuid            NOT NULL REFERENCES monsters (id) ON DELETE CASCADE,
    category        trait_category  NOT NULL,
    name            text            NOT NULL,   -- trait/action name
    description     text            NOT NULL,   -- full text description
    ordinal         integer         NOT NULL DEFAULT 0,  -- render order within category

    CONSTRAINT uq_monster_trait_name UNIQUE (monster_id, category, name)
);

--> statement-breakpoint

-- ============================================================
-- Regional effects — ordered array of strings.
-- ordinal preserves the array index from the template.
-- ============================================================
CREATE TABLE monster_regional_effects (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    monster_id      uuid        NOT NULL REFERENCES monsters (id) ON DELETE CASCADE,
    description     text        NOT NULL,
    ordinal         integer     NOT NULL DEFAULT 0,

    CONSTRAINT uq_monster_regional_effect_ordinal UNIQUE (monster_id, ordinal)
);

--> statement-breakpoint

-- ============================================================
-- Indexes — based on expected query patterns:
--   - Look up a stat block by name (DM search)
--   - List all traits/actions for a given monster by category
--   - List all ability scores for a monster
--   - List saving throws / skills for a monster
-- ============================================================

-- Name search (case-insensitive prefix/contains queries)
CREATE INDEX idx_monsters_character_name ON monsters (character_name);

-- Challenge rating lookups (encounter builder queries)
CREATE INDEX idx_monsters_challenge_rating ON monsters (challenge_rating)
    WHERE challenge_rating IS NOT NULL;

-- Foreign key traversals (Postgres does not auto-index FKs)
-- monster_ability_scores.monster_id is the PK — no separate index needed.
CREATE INDEX idx_saving_throws_monster_id      ON monster_saving_throws  (monster_id);
CREATE INDEX idx_skills_monster_id             ON monster_skills          (monster_id);
CREATE INDEX idx_traits_monster_id             ON monster_traits          (monster_id);
CREATE INDEX idx_traits_monster_category       ON monster_traits          (monster_id, category);
CREATE INDEX idx_regional_effects_monster_id   ON monster_regional_effects (monster_id);
