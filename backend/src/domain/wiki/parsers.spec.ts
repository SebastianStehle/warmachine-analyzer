import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  isArmyIndexTitle,
  parseArmyIndex,
  parseAttachments,
  parseCompanions,
  parseImageUrls,
  parsePageHeadings,
  parsePageImages,
  toModelType,
} from './parsers';

const parseFixture = (name: string, title: string) =>
  parseArmyIndex(
    JSON.stringify({
      parse: { title, text: { '*': readFileSync(join(__dirname, '../../../test/fixtures/wiki', `${name}.html`), 'utf8') } },
    }),
  );

describe('parseArmyIndex', () => {
  it('should read army, faction and models with their types', () => {
    const index = parseFixture('dusk-house-kallyss-footer', 'Template:Dusk House Kallyss Footer');

    expect(index?.army).toEqual('House Kallyss');
    expect(index?.faction).toEqual('Dusk');
    expect(index?.models.filter(({ type }) => type === 'leader').map(({ name }) => name)).toEqual([
      'Hazaroth, Narcissar of Ruin',
      'Hellyth, Scyir of Nightfall',
      'Morayne, The Blade of Twilight',
      'Scyrafael, Nis-Issyr of Desolations',
      'Tyrus, Nis-Arsyr of Spiders',
    ]);
    expect(index?.models.find(({ name }) => name === 'Phantasm')).toEqual({
      name: 'Phantasm',
      alias: null,
      wikiPage: 'Phantasm',
      type: 'warjack',
      isMercenary: false,
    });
  });

  it('should mark mercenaries without a type and keep models without a wiki page', () => {
    const index = parseFixture('dusk-house-kallyss-footer', 'Template:Dusk House Kallyss Footer');

    expect(index?.models.find(({ name }) => name === 'Carver Ultimus')).toMatchObject({ type: null, isMercenary: true });
    expect(index?.models.find(({ name }) => name === 'Hellslinger Phantom')).toMatchObject({ wikiPage: null, isMercenary: true });
  });

  it('should use the page title as name and the link text as alias when they differ', () => {
    const index = parseFixture('southern-kriels-kithguard-footer', 'Template:Southern Kriels Kithguard Footer');

    expect(index?.army).toEqual('Kithguard');
    expect(index?.faction).toEqual('Southern Kriels');
    expect(index?.models.find(({ alias }) => alias === 'Dozer & Smigg')).toMatchObject({
      name: 'Dozer & Smigg, Siege Breakers',
      type: 'warbeast',
    });
    expect(index?.models.find(({ name }) => name === 'Trap Door')?.type).toEqual('structure');
    expect(index?.models.find(({ name }) => name === 'Krueger, Wrath of Blighterghast')).toMatchObject({
      type: 'solo',
      isMercenary: true,
    });
  });
});

describe('index helpers', () => {
  it('should map the type labels of all indexes', () => {
    expect(
      ['Warcasters', 'Warlocks', 'Masters', 'Light Warjacks', 'Colossals', 'Vectors', 'Monstrosities', 'Horrors'].map(
        toModelType,
      ),
    ).toEqual(['leader', 'leader', 'leader', 'warjack', 'warjack', 'warjack', 'warjack', 'warbeast']);
    expect(
      ['Battle Engine', 'Command Attachments', 'Additional Solos', 'Units', 'Airdrops', 'Mercenaries'].map(toModelType),
    ).toEqual(['battle-engine', 'attachment', 'solo', 'unit', 'structure', null]);
  });

  it('should skip legacy indexes when listing templates', () => {
    expect(isArmyIndexTitle('Template:Dusk House Kallyss Footer')).toBe(true);
    expect(isArmyIndexTitle('Template:Circle Orboros (Legacy) Footer')).toBe(false);
    expect(isArmyIndexTitle('Template:Trollbloods Unlimited Footer')).toBe(false);
    expect(isArmyIndexTitle('Template:Army Status Table')).toBe(false);
  });
});

describe('parseAttachments', () => {
  const sections = (name: string) => readFileSync(join(__dirname, '../../../test/fixtures/wiki', `${name}.json`), 'utf8');

  it('should read command attachments from the sections of a unit page, also when the name comes first', () => {
    expect(parseAttachments(sections('pyg-shockers-sections'), 'Pyg Shockers')).toEqual(['Pyg Coxswain']);
    expect(parseAttachments(sections('winter-korps-snipers-sections'), 'Winter Korps Snipers')).toEqual([
      'Winter Korps Hunting Dog',
    ]);
  });

  it('should prefix single word attachments with the unit, as lists do', () => {
    expect(parseAttachments(sections('marauder-crew-sections'), 'Marauder Crew')).toEqual([
      'Marauder Crew Bosun',
      'Marauder Crew Quartermaster',
      'Marauder Crew Tapper',
    ]);
  });
});

describe('parseCompanions', () => {
  const wikitext = (name: string) => readFileSync(join(__dirname, '../../../test/fixtures/wiki', `${name}.json`), 'utf8');

  it('should read the companion of a solo with its type', () => {
    expect(parseCompanions(wikitext('exulon-nostilla-wikitext'))).toEqual([{ name: 'Aberration', type: 'warjack' }]);
  });

  it('should read several companions and take the type from the Fury statistic when the section has no type', () => {
    expect(parseCompanions(wikitext('lanyssa-ryssyl-wikitext'))).toEqual([
      { name: 'Benkei', type: 'warbeast' },
      { name: 'Sasha', type: 'warbeast' },
    ]);
  });
});

describe('images', () => {
  const fixture = (name: string) => readFileSync(join(__dirname, '../../../test/fixtures/wiki', `${name}.json`), 'utf8');

  it('should take the first image of a page, also when the page is a redirect', () => {
    const images = parsePageImages(fixture('page-contents'), [
      'Hellyth, Scyir of Nightfall',
      'Dr. Arkadius',
      'Exulon Nostilla & Aberration',
    ]);

    expect(Object.fromEntries(images)).toEqual({
      'Hellyth, Scyir of Nightfall': 'Hellyth1.jpg',
      'Dr. Arkadius': 'Arkadius 1.webp',
      'Exulon Nostilla & Aberration': 'Exulon Nostilla and Aberration.webp',
    });
  });

  it('should read the full name of a model from the first heading of its page', () => {
    const headings = parsePageHeadings(fixture('page-contents'), ['Carver Ultimus', 'Dr. Arkadius']);

    expect(Object.fromEntries(headings)).toEqual({
      'Carver Ultimus': 'Emperor Carver Ultimus Esquire III',
      'Dr. Arkadius': 'Dr. Arkadius',
    });
  });

  it('should prefer the thumbnail of an image', () => {
    const urls = parseImageUrls(fixture('image-urls'), ['Hellyth1.jpg', 'Arkadius 1.webp', 'Missing.png']);

    expect(Object.fromEntries(urls)).toEqual({
      'Hellyth1.jpg': 'https://static.wikitide.net/warmachineacademywiki/thumb/2/2e/Hellyth1.jpg/400px-Hellyth1.jpg',
      'Arkadius 1.webp': 'https://static.wikitide.net/warmachineacademywiki/thumb/e/e2/Arkadius_1.webp/400px-Arkadius_1.webp.png',
    });
  });
});
