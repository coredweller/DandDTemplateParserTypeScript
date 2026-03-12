import type {
  AbilityScores,
  GeneralMonsterTemplate,
  LegendaryMonsterTemplate,
  Monster,
} from './monster.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSection(title: string, entries: Record<string, string>): string {
  const items = Object.entries(entries);
  if (items.length === 0) return '';

  const rendered = items
    .map(([name, desc]) => `<p><strong><em>${escapeHtml(name)}.</em></strong> ${escapeHtml(desc)}</p>`)
    .join('\n      ');

  return `
      <h2>${escapeHtml(title)}</h2>
      ${rendered}`;
}

function renderAbilityScores(scores: AbilityScores): string {
  const stats = [
    { label: 'STR', data: scores.Strength },
    { label: 'DEX', data: scores.Dexterity },
    { label: 'CON', data: scores.Constitution },
    { label: 'INT', data: scores.Intelligence },
    { label: 'WIS', data: scores.Wisdom },
    { label: 'CHA', data: scores.Charisma },
  ];

  const headerCells = stats.map((s) => `<th>${s.label}</th>`).join('');
  const valueCells = stats
    .map((s) => `<td>${s.data.Score} (${escapeHtml(s.data.Modifier)})</td>`)
    .join('');

  return `
      <table class="ability-scores">
        <tr>${headerCells}</tr>
        <tr>${valueCells}</tr>
      </table>`;
}

function renderPropertyLine(label: string, value: string): string {
  return `<p><strong>${escapeHtml(label)}</strong> ${escapeHtml(value)}</p>`;
}

function renderRecordInline(label: string, entries: Record<string, string>): string {
  const entryList = Object.entries(entries);
  if (entryList.length === 0) return '';
  const parts = entryList.map(([k, v]) => `${escapeHtml(k)} ${escapeHtml(v)}`).join(', ');
  return `<p><strong>${escapeHtml(label)}</strong> ${parts}</p>`;
}

function isLegendary(data: GeneralMonsterTemplate | LegendaryMonsterTemplate): data is LegendaryMonsterTemplate {
  return 'ChallengeRating' in data;
}

export function renderMonsterHtml(monster: Monster): string {
  const d = monster.data;

  // Build the core stat block sections
  let legendaryPropertiesHtml = '';
  let legendarySectionsHtml = '';

  if (isLegendary(d)) {
    const legendaryProps = [
      d.DamageResistances ? renderPropertyLine('Damage Resistances', d.DamageResistances) : '',
      d.DamageImmunities ? renderPropertyLine('Damage Immunities', d.DamageImmunities) : '',
      d.ConditionImmunities ? renderPropertyLine('Condition Immunities', d.ConditionImmunities) : '',
      d.ChallengeRating ? renderPropertyLine('Challenge Rating', d.ChallengeRating) : '',
      d.ProficiencyBonus ? renderPropertyLine('Proficiency Bonus', d.ProficiencyBonus) : '',
    ].filter(Boolean).join('\n      ');

    legendaryPropertiesHtml = legendaryProps ? `\n      ${legendaryProps}` : '';

    const bonusActionsHtml = renderSection('Bonus Actions', d.BonusActions);
    const reactionsHtml = renderSection('Reactions', d.Reactions);
    const legendaryTraitsHtml = renderSection('Legendary Traits', d.LegendaryTraits);

    // Legendary actions have a special structure
    let legendaryActionsHtml = '';
    if (d.LegendaryActions) {
      const optionEntries = Object.entries(d.LegendaryActions.Options)
        .map(([name, desc]) => `<p><strong><em>${escapeHtml(name)}.</em></strong> ${escapeHtml(desc)}</p>`)
        .join('\n      ');

      legendaryActionsHtml = `
      <h2>Legendary Actions</h2>
      <p><em>${escapeHtml(d.LegendaryActions['Legendary Action Uses'])}</em></p>
      ${optionEntries}`;
    }

    let mythicTraitHtml = '';
    if (d.MythicTrait) {
      mythicTraitHtml = `
      <h2>Mythic Trait</h2>
      <p><strong><em>${escapeHtml(d.MythicTrait.Name)}.</em></strong> ${escapeHtml(d.MythicTrait.Description)}</p>`;
    }

    const lairActionsHtml = renderSection('Lair Actions', d.LairActions);

    let regionalEffectsHtml = '';
    if (d.RegionalEffects.length > 0) {
      const items = d.RegionalEffects.map((e) => `<li>${escapeHtml(e)}</li>`).join('\n        ');
      regionalEffectsHtml = `
      <h2>Regional Effects</h2>
      <ul>
        ${items}
      </ul>`;
    }

    legendarySectionsHtml = [
      bonusActionsHtml,
      reactionsHtml,
      legendaryTraitsHtml,
      legendaryActionsHtml,
      mythicTraitHtml,
      lairActionsHtml,
      regionalEffectsHtml,
    ].filter(Boolean).join('\n');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(d.CharacterName)} — D&amp;D Stat Block</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #f5f0e1;
      font-family: 'Palatino Linotype', Palatino, 'Book Antiqua', serif;
      color: #000;
    }
    .stat-block {
      max-width: 600px;
      margin: 0 auto;
      background: #FDF1DC;
      border: 1px solid #C9AD6A;
      padding: 20px 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    h1 {
      color: #7B1C1C;
      font-size: 1.8em;
      margin: 0 0 2px 0;
      font-variant: small-caps;
      letter-spacing: 1px;
    }
    .subtitle {
      font-style: italic;
      color: #555;
      margin: 0 0 8px 0;
    }
    .divider {
      border: none;
      height: 2px;
      background: #C9AD6A;
      margin: 10px 0;
    }
    h2 {
      color: #7B1C1C;
      font-size: 1.2em;
      border-bottom: 1px solid #C9AD6A;
      padding-bottom: 4px;
      margin: 16px 0 8px 0;
    }
    p {
      margin: 4px 0;
      line-height: 1.5;
    }
    .ability-scores {
      width: 100%;
      text-align: center;
      border-collapse: collapse;
      margin: 8px 0;
    }
    .ability-scores th {
      color: #7B1C1C;
      font-weight: bold;
      padding: 4px 8px;
      font-size: 0.9em;
    }
    .ability-scores td {
      padding: 4px 8px;
      font-size: 0.9em;
    }
    ul {
      margin: 4px 0;
      padding-left: 20px;
    }
    li {
      margin: 2px 0;
      line-height: 1.5;
    }
    .equipment-section {
      font-size: 0.9em;
      color: #333;
    }
    .notes-section {
      font-style: italic;
      color: #444;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="stat-block">
    <h1>${escapeHtml(d.CharacterName)}</h1>
    <p class="subtitle"><em>Level ${d.Level} ${escapeHtml(d.Race)} ${escapeHtml(d.Class)} &mdash; ${escapeHtml(d.Alignment)}</em></p>

    <hr class="divider">

    ${renderPropertyLine('Hit Points', d.HP)}
    ${renderPropertyLine('Armor Class', String(d.AC))}
    ${renderPropertyLine('Speed', d.Speed)}

    ${renderAbilityScores(d.AbilityScores)}

    <hr class="divider">

    ${renderRecordInline('Saving Throws', d.SavingThrows)}
    ${renderRecordInline('Skills', d.Skills)}
    ${renderPropertyLine('Senses', d.Senses)}
    ${renderPropertyLine('Languages', d.Languages)}${legendaryPropertiesHtml}

    <hr class="divider">

    ${renderSection('Special Traits', d.SpecialTraits)}
    ${renderSection('Actions', d.Actions)}
${legendarySectionsHtml}

    <div class="equipment-section">
      <h2>Equipment</h2>
      ${renderPropertyLine('Armor', d.Equipment.Armor)}
      ${renderPropertyLine('Weapons', d.Equipment.Weapons)}
      ${renderPropertyLine('Other', d.Equipment.Other)}
    </div>

    <div class="notes-section">
      <p><strong>Notes:</strong> ${escapeHtml(d.Notes)}</p>
    </div>
  </div>
</body>
</html>`;
}
