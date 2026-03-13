import { describe, expect, it } from 'vitest';
import { renderMonsterHtml } from '../../../src/domain/monster-html.js';
import { createMonster } from '../../../src/domain/monster.js';
import { generalTemplate, legendaryTemplate } from '../../fixtures.js';

describe('renderMonsterHtml — general monster', () => {
  const monster = createMonster('general', generalTemplate);
  let html: string;

  it('returns a non-empty HTML string', () => {
    html = renderMonsterHtml(monster);
    expect(html).toBeTruthy();
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('contains the character name', () => {
    expect(html).toContain('Goblin');
  });

  it('renders ability scores with modifiers', () => {
    // Strength 8 → -1
    expect(html).toContain('8 (-1)');
    // Dexterity 14 → +2
    expect(html).toContain('14 (+2)');
    // Constitution 10 → +0
    expect(html).toContain('10 (+0)');
  });

  it('renders the stat block headers STR/DEX/CON/INT/WIS/CHA', () => {
    expect(html).toContain('<th>STR</th>');
    expect(html).toContain('<th>DEX</th>');
    expect(html).toContain('<th>CHA</th>');
  });

  it('does not contain legendary-only sections', () => {
    expect(html).not.toContain('Legendary Actions');
    expect(html).not.toContain('Challenge Rating');
    expect(html).not.toContain('Regional Effects');
  });

  it('renders special traits and actions', () => {
    expect(html).toContain('Nimble Escape');
    expect(html).toContain('Scimitar');
  });

  it('escapes HTML special characters in text', () => {
    const xssTemplate = {
      ...generalTemplate,
      CharacterName: '<script>alert("xss")</script>',
    };
    const xssMonster = createMonster('general', xssTemplate);
    const xssHtml = renderMonsterHtml(xssMonster);
    expect(xssHtml).not.toContain('<script>');
    expect(xssHtml).toContain('&lt;script&gt;');
  });
});

describe('renderMonsterHtml — legendary monster', () => {
  const monster = createMonster('legendary', legendaryTemplate);
  const html = renderMonsterHtml(monster);

  it('contains the character name', () => {
    expect(html).toContain('Ancient Red Dragon');
  });

  it('renders challenge rating and proficiency bonus', () => {
    expect(html).toContain('Challenge Rating');
    expect(html).toContain('24');
    expect(html).toContain('Proficiency Bonus');
    expect(html).toContain('+7');
  });

  it('renders legendary actions section', () => {
    expect(html).toContain('Legendary Actions');
    expect(html).toContain('Detect');
  });

  it('renders regional effects', () => {
    expect(html).toContain('Regional Effects');
    expect(html).toContain('Streams in the area run red with blood.');
  });

  it('renders damage immunities', () => {
    expect(html).toContain('Damage Immunities');
    expect(html).toContain('Fire');
  });

  it('omits mythic trait section when name is empty', () => {
    // legendaryTemplate has MythicTrait.Name = ''
    expect(html).not.toContain('Mythic Trait');
  });

  it('renders mythic trait section when name is present', () => {
    const withMythic = createMonster('legendary', {
      ...legendaryTemplate,
      MythicTrait: { Name: 'Mythic Resistance', Description: 'The dragon ignores death once.' },
    });
    const mythicHtml = renderMonsterHtml(withMythic);
    expect(mythicHtml).toContain('Mythic Trait');
    expect(mythicHtml).toContain('Mythic Resistance');
  });
});
