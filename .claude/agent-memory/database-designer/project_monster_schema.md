---
name: monster_schema_design
description: PostgreSQL schema designed for D&D 5e monster/character stat blocks using Drizzle ORM with postgres.js
type: project
---

Schema is in migration `0001_monsters.sql`. It uses 6 tables:

- `monsters` — core stat block, handles both general and legendary templates in one row
- `monster_ability_scores` — exactly 6 rows per monster (fixed abilities)
- `monster_saving_throws` — only proficient saves, keyed by ability name
- `monster_skills` — only notable skills, keyed by skill name
- `monster_traits` — unified table for all Record<string,string> groups, discriminated by `trait_category` enum: special_trait, action, bonus_action, reaction, legendary_trait, legendary_action_option, lair_action
- `monster_regional_effects` — ordered string array with ordinal column

**Why:** All Record<string,string> trait groups share identical shape; using a single table with an enum discriminator avoids 7 identical tables. Fixed-shape fields (Equipment, MythicTrait) are inlined as columns.

**Key decisions:**
- HP stored as `text` (e.g. "135 (18d10 + 36)") not integer
- Ability modifier stored as `text` ("+3", "-1") matching template format
- `legendary_action_uses` is a column on `monsters`, not a trait row
- No JSONB anywhere — fully normalized
- Existing migration `0000_heavy_violations.sql` (creates `work_items`) must not be touched

**How to apply:** When asked to add Drizzle schema files or extend the schema, refer to this table structure. The `trait_category` enum is the extension point for new action types.
