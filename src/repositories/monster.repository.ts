import { eq } from 'drizzle-orm';
import type { Logger } from 'pino';
import type { Db } from '../db.js';
import {
  abilityModifier,
  reconstituteMonster,
  type AbilityScores,
  type GeneralMonsterTemplate,
  type LegendaryMonsterTemplate,
  type Monster,
  type MonsterId,
} from '../domain/monster.js';
import {
  monsters,
  monsterAbilityScores,
  monsterSavingThrows,
  monsterSkills,
  monsterTraits,
  monsterRegionalEffects,
  type NewMonsterTraitRow,
} from '../schema/monsters.schema.js';
import type { IMonsterRepository } from './monster.repository.interface.js';

type TraitCategory =
  | 'special_trait'
  | 'action'
  | 'bonus_action'
  | 'reaction'
  | 'legendary_trait'
  | 'legendary_action_option'
  | 'lair_action';

function isLegendaryData(
  type: 'general' | 'legendary',
  data: GeneralMonsterTemplate | LegendaryMonsterTemplate,
): data is LegendaryMonsterTemplate {
  return type === 'legendary';
}

export class DrizzleMonsterRepository implements IMonsterRepository {
  constructor(
    private readonly db: Db,
    private readonly log: Logger,
  ) {}

  private traitsFromRecord(
    monsterId: string,
    category: TraitCategory,
    entries: Record<string, string>,
  ): NewMonsterTraitRow[] {
    return Object.entries(entries).map(([name, description], index) => ({
      monster_id: monsterId,
      category,
      name,
      description,
      ordinal: index,
    }));
  }

  async save(monster: Monster): Promise<Monster> {
    try {
      const { data } = monster;
      const legendary = isLegendaryData(monster.type, data);

      await this.db.transaction(async (tx) => {
        // 1. monsters table
        await tx.insert(monsters).values({
          id: monster.id,
          type: monster.type,
          character_name: data.CharacterName,
          alignment: data.Alignment,
          race: data.Race,
          class: data.Class,
          level: data.Level,
          hp: data.HP,
          ac: data.AC,
          speed: data.Speed,
          senses: data.Senses,
          languages: data.Languages,
          notes: data.Notes,
          equipment_armor: data.Equipment.Armor,
          equipment_weapons: data.Equipment.Weapons,
          equipment_other: data.Equipment.Other,
          challenge_rating: legendary ? data.ChallengeRating : undefined,
          proficiency_bonus: legendary ? data.ProficiencyBonus : undefined,
          legendary_action_uses: legendary
            ? (() => {
                const uses = parseInt(data.LegendaryActions['Legendary Action Uses'], 10);
                if (isNaN(uses)) {
                  this.log.warn({ monsterId: monster.id, raw: data.LegendaryActions['Legendary Action Uses'] }, 'Invalid Legendary Action Uses — defaulting to 2');
                  return 2;
                }
                return uses;
              })()
            : undefined,
          damage_resistances: legendary ? data.DamageResistances : undefined,
          damage_immunities: legendary ? data.DamageImmunities : undefined,
          condition_immunities: legendary ? data.ConditionImmunities : undefined,
          mythic_trait_name: legendary ? data.MythicTrait.Name : undefined,
          mythic_trait_description: legendary ? data.MythicTrait.Description : undefined,
          created_at: monster.createdAt,
        });

        // 2. ability scores
        await tx.insert(monsterAbilityScores).values({
          monster_id: monster.id,
          strength: data.AbilityScores.Strength.Score,
          dexterity: data.AbilityScores.Dexterity.Score,
          constitution: data.AbilityScores.Constitution.Score,
          intelligence: data.AbilityScores.Intelligence.Score,
          wisdom: data.AbilityScores.Wisdom.Score,
          charisma: data.AbilityScores.Charisma.Score,
        });

        // 3. saving throws
        const savingThrowRows = Object.entries(data.SavingThrows).map(
          ([abilityName, value]) => ({
            monster_id: monster.id,
            ability_name: abilityName,
            value,
          }),
        );
        if (savingThrowRows.length > 0) {
          await tx.insert(monsterSavingThrows).values(savingThrowRows);
        }

        // 4. skills
        const skillRows = Object.entries(data.Skills).map(
          ([skillName, value]) => ({
            monster_id: monster.id,
            skill_name: skillName,
            value,
          }),
        );
        if (skillRows.length > 0) {
          await tx.insert(monsterSkills).values(skillRows);
        }

        // 5. traits
        const allTraits: NewMonsterTraitRow[] = [
          ...this.traitsFromRecord(monster.id, 'special_trait', data.SpecialTraits),
          ...this.traitsFromRecord(monster.id, 'action', data.Actions),
        ];

        if (legendary) {
          allTraits.push(
            ...this.traitsFromRecord(monster.id, 'bonus_action', data.BonusActions),
            ...this.traitsFromRecord(monster.id, 'reaction', data.Reactions),
            ...this.traitsFromRecord(monster.id, 'legendary_trait', data.LegendaryTraits),
            ...this.traitsFromRecord(monster.id, 'legendary_action_option', data.LegendaryActions.Options),
            ...this.traitsFromRecord(monster.id, 'lair_action', data.LairActions),
          );
        }

        if (allTraits.length > 0) {
          await tx.insert(monsterTraits).values(allTraits);
        }

        // 6. regional effects (legendary only)
        if (legendary && data.RegionalEffects.length > 0) {
          const regionalRows = data.RegionalEffects.map((description, index) => ({
            monster_id: monster.id,
            description,
            ordinal: index,
          }));
          await tx.insert(monsterRegionalEffects).values(regionalRows);
        }
      });

      this.log.debug({ monsterId: monster.id }, 'Monster saved');
      return monster;
    } catch (error: unknown) {
      this.log.error({ err: error, monsterId: monster.id }, 'Failed to save monster');
      throw error;
    }
  }

  async findById(id: MonsterId): Promise<Monster | null> {
    try {
      const [monsterRows, abilityRows, savingThrowRows, skillRows, traitRows, regionalEffectRows] =
        await Promise.all([
          this.db.select().from(monsters).where(eq(monsters.id, id)).limit(1),
          this.db.select().from(monsterAbilityScores).where(eq(monsterAbilityScores.monster_id, id)),
          this.db.select().from(monsterSavingThrows).where(eq(monsterSavingThrows.monster_id, id)),
          this.db.select().from(monsterSkills).where(eq(monsterSkills.monster_id, id)),
          this.db.select().from(monsterTraits).where(eq(monsterTraits.monster_id, id)).orderBy(monsterTraits.ordinal),
          this.db.select().from(monsterRegionalEffects).where(eq(monsterRegionalEffects.monster_id, id)).orderBy(monsterRegionalEffects.ordinal),
        ]);

      const monsterRow = monsterRows[0];
      if (!monsterRow) {
        return null;
      }

      const abilityRow = abilityRows[0];
      if (!abilityRow) {
        this.log.error({ monsterId: id }, 'Monster found but missing ability scores row');
        throw new Error(`Ability scores row missing for monster ${id}`);
      }

      // Reconstitute ability scores with calculated modifiers
      const abilityScores: AbilityScores = {
        Strength:     { Score: abilityRow.strength,     Modifier: abilityModifier(abilityRow.strength) },
        Dexterity:    { Score: abilityRow.dexterity,    Modifier: abilityModifier(abilityRow.dexterity) },
        Constitution: { Score: abilityRow.constitution, Modifier: abilityModifier(abilityRow.constitution) },
        Intelligence: { Score: abilityRow.intelligence, Modifier: abilityModifier(abilityRow.intelligence) },
        Wisdom:       { Score: abilityRow.wisdom,       Modifier: abilityModifier(abilityRow.wisdom) },
        Charisma:     { Score: abilityRow.charisma,     Modifier: abilityModifier(abilityRow.charisma) },
      };

      // Build saving throws record
      const savingThrows: Record<string, string> = {};
      for (const row of savingThrowRows) {
        savingThrows[row.ability_name] = row.value;
      }

      // Build skills record
      const skills: Record<string, string> = {};
      for (const row of skillRows) {
        skills[row.skill_name] = row.value;
      }

      // Build trait records by category
      function traitsOfCategory(category: TraitCategory): Record<string, string> {
        const result: Record<string, string> = {};
        for (const row of traitRows) {
          if (row.category === category) {
            result[row.name] = row.description;
          }
        }
        return result;
      }

      const specialTraits = traitsOfCategory('special_trait');
      const actions = traitsOfCategory('action');

      const isLegendary = monsterRow.type === 'legendary';

      if (isLegendary) {
        const legendaryData: LegendaryMonsterTemplate = {
          CharacterName: monsterRow.character_name,
          Level: monsterRow.level ?? 0,
          Race: monsterRow.race,
          Class: monsterRow.class,
          Alignment: monsterRow.alignment,
          HP: monsterRow.hp,
          AC: monsterRow.ac ?? 0,
          Speed: monsterRow.speed,
          AbilityScores: abilityScores,
          SavingThrows: savingThrows,
          Skills: skills,
          Senses: monsterRow.senses,
          Languages: monsterRow.languages,
          SpecialTraits: specialTraits,
          Actions: actions,
          Equipment: {
            Armor: monsterRow.equipment_armor,
            Weapons: monsterRow.equipment_weapons,
            Other: monsterRow.equipment_other,
          },
          Notes: monsterRow.notes,
          DamageResistances: monsterRow.damage_resistances ?? '',
          DamageImmunities: monsterRow.damage_immunities ?? '',
          ConditionImmunities: monsterRow.condition_immunities ?? '',
          ChallengeRating: monsterRow.challenge_rating ?? '',
          ProficiencyBonus: monsterRow.proficiency_bonus ?? '',
          BonusActions: traitsOfCategory('bonus_action'),
          Reactions: traitsOfCategory('reaction'),
          LegendaryTraits: traitsOfCategory('legendary_trait'),
          LegendaryActions: {
            'Legendary Action Uses': String(monsterRow.legendary_action_uses ?? 3),
            Options: traitsOfCategory('legendary_action_option'),
          },
          MythicTrait: {
            Name: monsterRow.mythic_trait_name ?? '',
            Description: monsterRow.mythic_trait_description ?? '',
          },
          LairActions: traitsOfCategory('lair_action'),
          RegionalEffects: regionalEffectRows.map((row) => row.description),
        };

        return reconstituteMonster(monsterRow.id, 'legendary', legendaryData, monsterRow.created_at);
      }

      const generalData: GeneralMonsterTemplate = {
        CharacterName: monsterRow.character_name,
        Level: monsterRow.level ?? 0,
        Race: monsterRow.race,
        Class: monsterRow.class,
        Alignment: monsterRow.alignment,
        HP: monsterRow.hp,
        AC: monsterRow.ac ?? 0,
        Speed: monsterRow.speed,
        AbilityScores: abilityScores,
        SavingThrows: savingThrows,
        Skills: skills,
        Senses: monsterRow.senses,
        Languages: monsterRow.languages,
        SpecialTraits: specialTraits,
        Actions: actions,
        Equipment: {
          Armor: monsterRow.equipment_armor,
          Weapons: monsterRow.equipment_weapons,
          Other: monsterRow.equipment_other,
        },
        Notes: monsterRow.notes,
      };

      return reconstituteMonster(monsterRow.id, 'general', generalData, monsterRow.created_at);
    } catch (error: unknown) {
      this.log.error({ err: error, monsterId: id }, 'Failed to find monster by ID');
      throw error;
    }
  }
}
