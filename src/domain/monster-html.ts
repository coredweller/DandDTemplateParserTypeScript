import {
  isLegendaryMonster,
  type AbilityScores,
  type Monster,
} from './monster.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Renders a description that may contain \n\n paragraph breaks.
// Lines matching "Label (detail): content" (e.g. spell slot lines) get their
// label bolded so spellcasting entries display cleanly.
function renderDesc(text: string): string {
  const paragraphs = text.split('\n\n');
  const rendered = paragraphs.map((para, i) => {
    if (i === 0) return escapeHtml(para);
    // Detect "Something (detail): rest" — covers all spell-slot lines
    const match = /^([^:(]+(?:\([^)]*\))?)\s*:\s*(.+)$/s.exec(para);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      return `<span class="spell-level"><strong>${escapeHtml(match[1].trim())}:</strong> ${escapeHtml(match[2].trim())}</span>`;
    }
    return escapeHtml(para).replace(/\n/g, '<br>');
  });
  return rendered.join('<br>');
}

function renderSection(title: string, entries: Record<string, string>): string {
  const items = Object.entries(entries);
  if (items.length === 0) return '';
  const rows = items
    .map(([name, desc]) => `<p><strong><em>${escapeHtml(name)}.</em></strong> ${renderDesc(desc)}</p>`)
    .join('');
  return `<h2>${escapeHtml(title)}</h2>${rows}`;
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
  const headers = stats.map((s) => `<th>${s.label}</th>`).join('');
  const values = stats
    .map((s) => `<td>${s.data.Score} (${escapeHtml(s.data.Modifier)})</td>`)
    .join('');
  return `<table class="ability-scores"><tr>${headers}</tr><tr>${values}</tr></table>`;
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

// ── CSS ──────────────────────────────────────────────────────────────────────
const STYLES = `
  body { margin:0; padding:20px; background:#f5f0e1; font-family:'Palatino Linotype',Palatino,'Book Antiqua',serif; color:#000; }
  .stat-block { max-width:600px; margin:0 auto; background:#FDF1DC; border:1px solid #C9AD6A; padding:20px 24px; box-shadow:0 2px 8px rgba(0,0,0,0.3); }
  h1 { color:#7B1C1C; font-size:1.8em; margin:0 0 2px 0; font-variant:small-caps; letter-spacing:1px; }
  .subtitle { font-style:italic; color:#555; margin:0 0 8px 0; }
  .divider { border:none; height:2px; background:#C9AD6A; margin:10px 0; }
  h2 { color:#7B1C1C; font-size:1.2em; border-bottom:1px solid #C9AD6A; padding-bottom:4px; margin:16px 0 8px 0; }
  p { margin:4px 0; line-height:1.5; }
  .ability-scores { width:100%; text-align:center; border-collapse:collapse; margin:8px 0; }
  .ability-scores th { color:#7B1C1C; font-weight:bold; padding:4px 8px; font-size:0.9em; }
  .ability-scores td { padding:4px 8px; font-size:0.9em; }
  ul { margin:4px 0; padding-left:20px; }
  li { margin:2px 0; line-height:1.5; }
  .spell-level { display:block; margin:3px 0 3px 12px; line-height:1.5; }
  .spell-level strong { color:#7B1C1C; }
  .equipment-section { font-size:0.9em; color:#333; }
  .notes-section { font-style:italic; color:#444; margin-top:12px; }
`.trim();

export function renderMonsterHtml(monster: Monster): string {
  const d = monster.data;

  // ── Legendary-only sections ───────────────────────────────────────────────
  let legendaryPropertiesHtml = '';
  let legendarySectionsHtml = '';

  if (isLegendaryMonster(monster)) {
    const ld = monster.data;
    legendaryPropertiesHtml = [
      ld.DamageResistances ? renderPropertyLine('Damage Resistances', ld.DamageResistances) : '',
      ld.DamageImmunities ? renderPropertyLine('Damage Immunities', ld.DamageImmunities) : '',
      ld.ConditionImmunities ? renderPropertyLine('Condition Immunities', ld.ConditionImmunities) : '',
      ld.ChallengeRating ? renderPropertyLine('Challenge Rating', ld.ChallengeRating) : '',
      ld.ProficiencyBonus ? renderPropertyLine('Proficiency Bonus', ld.ProficiencyBonus) : '',
    ].filter(Boolean).join('');

    const optionEntries = Object.entries(ld.LegendaryActions.Options)
      .map(([name, desc]) => `<p><strong><em>${escapeHtml(name)}.</em></strong> ${escapeHtml(desc)}</p>`)
      .join('');

    const legendaryActionsHtml = `<h2>Legendary Actions</h2><p><em>${escapeHtml(ld.LegendaryActions['Legendary Action Uses'])}</em></p>${optionEntries}`;

    const mythicTraitHtml = ld.MythicTrait.Name
      ? `<h2>Mythic Trait</h2><p><strong><em>${escapeHtml(ld.MythicTrait.Name)}.</em></strong> ${escapeHtml(ld.MythicTrait.Description)}</p>`
      : '';

    const regionalEffectsHtml = ld.RegionalEffects.length > 0
      ? `<h2>Regional Effects</h2><ul>${ld.RegionalEffects.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`
      : '';

    legendarySectionsHtml = [
      renderSection('Bonus Actions', ld.BonusActions),
      renderSection('Reactions', ld.Reactions),
      renderSection('Legendary Traits', ld.LegendaryTraits),
      legendaryActionsHtml,
      mythicTraitHtml,
      renderSection('Lair Actions', ld.LairActions),
      regionalEffectsHtml,
    ].filter(Boolean).join('');
  }

  // ── Assemble body ─────────────────────────────────────────────────────────
  const body = [
    `<h1>${escapeHtml(d.CharacterName)}</h1>`,
    `<p class="subtitle"><em>Level ${d.Level} ${escapeHtml(d.Race)} ${escapeHtml(d.Class)} &mdash; ${escapeHtml(d.Alignment)}</em></p>`,
    '<hr class="divider">',
    renderPropertyLine('Hit Points', d.HP),
    renderPropertyLine('Armor Class', String(d.AC)),
    renderPropertyLine('Speed', d.Speed),
    renderAbilityScores(d.AbilityScores),
    '<hr class="divider">',
    renderRecordInline('Saving Throws', d.SavingThrows),
    renderRecordInline('Skills', d.Skills),
    renderPropertyLine('Senses', d.Senses),
    renderPropertyLine('Languages', d.Languages),
    legendaryPropertiesHtml,
    '<hr class="divider">',
    renderSection('Special Traits', d.SpecialTraits),
    renderSection('Actions', d.Actions),
    legendarySectionsHtml,
    `<div class="equipment-section"><h2>Equipment</h2>${renderPropertyLine('Armor', d.Equipment.Armor)}${renderPropertyLine('Weapons', d.Equipment.Weapons)}${renderPropertyLine('Other', d.Equipment.Other)}</div>`,
    `<div class="notes-section"><p><strong>Notes:</strong> ${escapeHtml(d.Notes)}</p></div>`,
  ].filter(Boolean).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(d.CharacterName)} — D&amp;D Stat Block</title><style>${STYLES}</style></head><body><div class="stat-block">${body}</div></body></html>`;
}
