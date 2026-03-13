import type { GeneralMonsterTemplate, LegendaryMonsterTemplate } from '../src/domain/monster.js';

/** Domain-level fixture — includes computed Modifier (required by domain types). */
export const generalTemplate: GeneralMonsterTemplate = {
  CharacterName: 'Goblin',
  Level: 1,
  Race: 'Goblinoid',
  Class: 'Fighter',
  Alignment: 'Neutral Evil',
  HP: '7 (2d6)',
  AC: 15,
  Speed: '30 ft.',
  AbilityScores: {
    Strength:     { Score: 8,  Modifier: '-1' },
    Dexterity:    { Score: 14, Modifier: '+2' },
    Constitution: { Score: 10, Modifier: '+0' },
    Intelligence: { Score: 10, Modifier: '+0' },
    Wisdom:       { Score: 8,  Modifier: '-1' },
    Charisma:     { Score: 8,  Modifier: '-1' },
  },
  SavingThrows: { Dex: '+4' },
  Skills: { Stealth: '+6' },
  Senses: 'Darkvision 60 ft., Passive Perception 9',
  Languages: 'Common, Goblin',
  SpecialTraits: { 'Nimble Escape': 'The goblin can take the Disengage or Hide action as a bonus action.' },
  Actions: { Scimitar: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6+2) slashing.' },
  Equipment: { Armor: 'Leather armor, shield', Weapons: 'Scimitar', Other: '' },
  Notes: 'A basic goblin warrior.',
};

export const legendaryTemplate: LegendaryMonsterTemplate = {
  ...generalTemplate,
  CharacterName: 'Ancient Red Dragon',
  Level: 20,
  DamageResistances: '',
  DamageImmunities: 'Fire',
  ConditionImmunities: 'Frightened',
  ChallengeRating: '24',
  ProficiencyBonus: '+7',
  BonusActions: {},
  Reactions: { 'Wing Attack': 'The dragon beats its wings.' },
  LegendaryTraits: {},
  LegendaryActions: {
    'Legendary Action Uses': '3',
    Options: { Detect: 'The dragon makes a Wisdom (Perception) check.' },
  },
  MythicTrait: { Name: '', Description: '' },
  LairActions: {},
  RegionalEffects: ['Streams in the area run red with blood.'],
};

/** HTTP request body fixtures — no Modifier field (API no longer accepts it). */
export const generalRequestBody = {
  CharacterName: 'Goblin',
  Level: 1,
  Race: 'Goblinoid',
  Class: 'Fighter',
  Alignment: 'Neutral Evil',
  HP: '7 (2d6)',
  AC: 15,
  Speed: '30 ft.',
  AbilityScores: {
    Strength:     { Score: 8  },
    Dexterity:    { Score: 14 },
    Constitution: { Score: 10 },
    Intelligence: { Score: 10 },
    Wisdom:       { Score: 8  },
    Charisma:     { Score: 8  },
  },
  SavingThrows: { Dex: '+4' },
  Skills: { Stealth: '+6' },
  Senses: 'Darkvision 60 ft., Passive Perception 9',
  Languages: 'Common, Goblin',
  SpecialTraits: { 'Nimble Escape': 'The goblin can take the Disengage or Hide action as a bonus action.' },
  Actions: { Scimitar: 'Melee Weapon Attack: +4 to hit.' },
  Equipment: { Armor: 'Leather armor, shield', Weapons: 'Scimitar', Other: '' },
  Notes: 'A basic goblin warrior.',
};

export const legendaryRequestBody = {
  ...generalRequestBody,
  CharacterName: 'Ancient Red Dragon',
  Level: 20,
  DamageResistances: '',
  DamageImmunities: 'Fire',
  ConditionImmunities: 'Frightened',
  ChallengeRating: '24',
  ProficiencyBonus: '+7',
  BonusActions: {},
  Reactions: { 'Wing Attack': 'The dragon beats its wings.' },
  LegendaryTraits: {},
  LegendaryActions: {
    'Legendary Action Uses': '3',
    Options: { Detect: 'The dragon makes a Wisdom (Perception) check.' },
  },
  MythicTrait: { Name: '', Description: '' },
  LairActions: {},
  RegionalEffects: ['Streams in the area run red with blood.'],
};
