import { describe, expect, it } from 'vitest';
import { isSameCaster, parseArmyLists } from './parser';

const TWO_LISTS = [
  'Just A Prick',
  'Mercenaries - Thornfall Alliance',
  'Grand Melee - 100 pts',
  '',
  'PC      CARD',
  '',
  '        Dr. Arkadius',
  '',
  '6           Battle Boar',
  '',
  '17          War Boar MMD 47',
  '',
  '5       Brynhildr',
  '',
  '20      Exulon Nostilla',
  '',
  '            Aberration',
  '',
  '2       Farrow Sapper 1',
  '',
  '2       Farrow Sapper 2',
  '',
  'PC      COMMAND CARD',
  '        Bite and Hold',
  '        Duck And Cover!',
  '',
  'TOTAL POINTS  100/100',
  '',
  '',
  'Sturm Troopers ',
  'Mercenaries - Thornfall Alliance',
  'Grand Melee - 100 pts',
  '',
  'PC      CARD',
  '',
  '        Sturm & Drang',
  '',
  '            Drang',
  '',
  '27      Phantasm',
  '    3       HEAD - Focus Vault',
  '',
  'TOTAL POINTS  100/100',
].join(' || ');

describe('parseArmyLists', () => {
  const lists = parseArmyLists(TWO_LISTS);

  it('should split a record into one list per total points line', () => {
    expect(lists.map(({ title }) => title)).toEqual(['Just A Prick', 'Sturm Troopers']);
  });

  it('should parse the header when the list starts with title, faction and format', () => {
    const [{ faction, army, format, pointLevel, totalPoints, caster }] = lists;

    expect({ faction, army, format, pointLevel, totalPoints, caster }).toEqual({
      faction: 'Mercenaries',
      army: 'Thornfall Alliance',
      format: 'Grand Melee',
      pointLevel: 100,
      totalPoints: 100,
      caster: 'Dr. Arkadius',
    });
  });

  it('should keep points, indentation and kind when parsing entries', () => {
    expect(lists[0].entries.map(({ baseName, points, depth, kind }) => [baseName, points, depth, kind])).toEqual([
      ['Dr. Arkadius', null, 0, 'leader'],
      ['Battle Boar', 6, 1, 'model'],
      ['War Boar MMD 47', 17, 1, 'model'],
      ['Brynhildr', 5, 0, 'model'],
      ['Exulon Nostilla', 20, 0, 'model'],
      ['Aberration', null, 1, 'model'],
      ['Farrow Sapper', 2, 0, 'model'],
      ['Farrow Sapper', 2, 0, 'model'],
    ]);
  });

  it('should detect modules and command cards when present', () => {
    expect(lists[0].commandCards).toEqual(['Bite and Hold', 'Duck And Cover!']);
    expect(lists[1].entries.find(({ kind }) => kind === 'module')?.name).toEqual('HEAD - Focus Vault');
  });

  it('should find the caster when free deployables are listed before it', () => {
    const [list] = parseArmyLists(
      'Southern Kriels - Kithguard || Grand Melee - 100 pts ||  || PC      CARD ||  ||         Trapdoor 1 ||  ||         Trapdoor 2 ||  ||         Captain Tarja Grimtusk ||  || 19          Dozer & Smigg, Siege Breakers ||  || TOTAL POINTS  100/100',
    );

    expect({ title: list.title, army: list.army, caster: list.caster, warnings: list.warnings }).toEqual({
      title: 'Southern Kriels - Kithguard',
      army: 'Kithguard',
      caster: 'Captain Tarja Grimtusk',
      warnings: [],
    });
  });

  it('should parse entries when the card header is missing', () => {
    const [list] = parseArmyLists(
      'Sabbreth 1.0 || Orgoth - Sea Raiders || Grand Melee - 100 pts ||  ||         Sabbreth, The Eternal Annihilation  ||  || 6           Jackal 1 ||   2             HEAD - Arc Node ||  || 6           Jackal 2',
    );

    expect(list.caster).toEqual('Sabbreth, The Eternal Annihilation');
    expect(list.entries.map(({ baseName, kind }) => `${baseName}:${kind}`)).toEqual([
      'Sabbreth, The Eternal Annihilation:leader',
      'Jackal:model',
      'HEAD - Arc Node:module',
      'Jackal:model',
    ]);
  });

  it('should ignore separator lines when a record contains several lists', () => {
    const [, second] = parseArmyLists(
      'First || Mercenaries - Blindwater Congregation || Grand Melee - 100 pts || PC      CARD ||         Maelok the Dreadbound || TOTAL POINTS  100/100 ||  || OR ||  || JagaJanky || Mercenaries - Blindwater Congregation || Grand Melee - 100 pts || PC      CARD ||         Jaga-Jaga, the Death Charmer || TOTAL POINTS  100/100',
    );

    expect({ title: second.title, army: second.army, caster: second.caster }).toEqual({
      title: 'JagaJanky',
      army: 'Blindwater Congregation',
      caster: 'Jaga-Jaga, the Death Charmer',
    });
  });

  it('should add a warning when the list has no entries', () => {
    const [list] = parseArmyLists('Just some text');

    expect(list.warnings).toContain('No entries found.');
  });
});

describe('isSameCaster', () => {
  it('should match when the names differ in punctuation or epithet', () => {
    expect(isSameCaster('Hellyth, Scyir of Nightfall', 'Hellyth, Scyir of Nightfall')).toBe(true);
    expect(isSameCaster('Morayne, The Blade of Twilight', 'Morayne')).toBe(true);
    expect(isSameCaster('Captain Raef Huxely', 'Captain Raef Huxley')).toBe(true);
  });

  it('should not match when the casters are different', () => {
    expect(isSameCaster('Hunger', 'Nymara, the Shadowblade')).toBe(false);
    expect(isSameCaster('Kapitan Zahara Vilkul', 'Kapitan Ekaterina Baranova')).toBe(false);
  });
});
