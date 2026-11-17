import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { isSameCaster, parseArmyLists, ParsedList } from './parser';

// Real lists from Longshanks, as stored in the hidden textarea of the list popup.
const parseFixture = (name: string) =>
  parseArmyLists(readFileSync(join(__dirname, '../../../test/fixtures/lists', `${name}.txt`), 'utf8'));

const summarize = ({ title, faction, army, format, pointLevel, totalPoints, caster, warnings }: ParsedList) => ({
  title,
  faction,
  army,
  format,
  pointLevel,
  totalPoints,
  caster,
  warnings,
});

const modelsOf = ({ entries }: ParsedList) => entries.filter(({ kind }) => kind === 'model').map(({ baseName }) => baseName);

const modulesOf = ({ entries }: ParsedList) => entries.filter(({ kind }) => kind === 'module').map(({ name }) => name);

describe('parseArmyLists', () => {
  it('should split a record into one list per total points line when it contains two lists', () => {
    const lists = parseFixture('thornfall-two-lists-in-one-record');

    expect(lists.map(summarize)).toEqual([
      {
        title: 'Just A Prick',
        faction: 'Mercenaries',
        army: 'Thornfall Alliance',
        format: 'Grand Melee',
        pointLevel: 100,
        totalPoints: 100,
        caster: 'Dr. Arkadius',
        warnings: [],
      },
      {
        title: 'Sturm Troopers',
        faction: 'Mercenaries',
        army: 'Thornfall Alliance',
        format: 'Grand Melee',
        pointLevel: 100,
        totalPoints: 100,
        caster: 'Sturm & Drang',
        warnings: [],
      },
    ]);
    expect(lists[0].commandCards).toEqual([
      'Bite and Hold',
      'Blessings of the Gods',
      'Careful Reconnaissance',
      'Duck And Cover!',
      'Put The Fires Out',
    ]);
  });

  it('should keep points, indentation and numbered duplicates when parsing entries', () => {
    const [list] = parseFixture('thornfall-two-lists-in-one-record');

    expect(list.entries.slice(0, 7).map(({ baseName, points, depth, kind }) => [baseName, points, depth, kind])).toEqual([
      ['Dr. Arkadius', null, 0, 'leader'],
      ['Battle Boar', 6, 1, 'model'],
      ['Razor Boar', 3, 1, 'model'],
      ['Splatter Boar', 8, 1, 'model'],
      ['Splatter Boar', 8, 1, 'model'],
      ['War Boar MMD 47', 17, 1, 'model'],
      ['Brynhildr', 5, 0, 'model'],
    ]);
  });

  it('should use the faction line as title when the list has no title', () => {
    const [list] = parseFixture('winter-korps-no-title');

    expect(summarize(list)).toMatchObject({
      title: 'Khador - Winter Korps',
      faction: 'Khador',
      army: 'Winter Korps',
      caster: 'Kapitan Ekaterina Baranova',
      warnings: [],
    });
    expect(modulesOf(list)).toEqual([
      'HEAD - Shock Assault',
      'RIGHT SHOULDER - Right Shoulder Mounted Heavy Cannon',
      'LEFT SHOULDER - Left Shoulder Mounted Heavy Cannon',
      'RIGHT ARM - Great Axe',
      'LEFT ARM - Dozer Fist',
    ]);
  });

  it('should find the caster when free entries are listed before it', () => {
    const [fane] = parseFixture('fane-hunger-before-caster');
    const [kithguard] = parseFixture('kithguard-trapdoors-newlines');

    expect(fane.caster).toEqual('Nymara, The Shadowblade');
    expect(modelsOf(fane).slice(0, 3)).toEqual(['Hunger', 'Horkos', 'Strygon']);
    expect(modulesOf(fane)).toContain('CONDITIONING - Blind Obedience');

    expect(kithguard.caster).toEqual('Captain Tarja Grimtusk');
    expect(modelsOf(kithguard).slice(0, 4)).toEqual(['Trapdoor', 'Trapdoor', 'Trapdoor', 'Dozer & Smigg, Siege Breakers']);
  });

  it('should handle line breaks inside the separators when exported with Windows line endings', () => {
    const [list] = parseFixture('kithguard-trapdoors-newlines');

    expect(summarize(list)).toMatchObject({ army: 'Kithguard', totalPoints: 100, warnings: [] });
    expect(modelsOf(list)).toContain('Captain Barl "Demolisher" Dunax');
  });

  it('should parse entries when the card header is missing', () => {
    const [list] = parseFixture('sea-raiders-no-card-header');

    expect(summarize(list)).toMatchObject({
      title: 'Sabbreth 1.0',
      army: 'Sea Raiders',
      caster: 'Sabbreth, The Eternal Annihilation',
      warnings: [],
    });
    expect(modelsOf(list)).toEqual([
      'Jackal',
      'Jackal',
      'Tyrant',
      'Tyrant',
      'Koldun Lord Damien Korovnik',
      'Reaver Commander',
      'Vulcar Forge Master',
      'Assault Reavers',
      'Reaver Skirmishers',
      'Rhok Harriers',
      'Rhok Harriers',
      'The Execrators',
      'Ulkor Axers',
      'Ulkor Barragers',
      'Warwitch Coven',
    ]);
  });

  it('should ignore separator lines between two lists', () => {
    const lists = parseFixture('blindwater-or-separator');

    expect(lists.map(({ title, army, caster }) => ({ title, army, caster }))).toEqual([
      { title: 'Smegulok Hundo', army: 'Blindwater Congregation', caster: 'Maelok the Dreadbound' },
      { title: 'JagaJanky', army: 'Blindwater Congregation', caster: 'Jaga-Jaga, the Death Charmer' },
    ]);
  });

  it('should return a list without entries when the record ends with the start of another list', () => {
    const [full, stub] = parseFixture('brineblood-cut-off-stub');

    expect(full.caster).toEqual('Admiral Boomhowler');
    expect(stub.entries).toEqual([]);
    expect(stub.warnings).toContain('No entries found.');
  });

  it('should treat numbered equipment slots and weapons as modules', () => {
    const [list] = parseArmyLists(
      [
        'Shard',
        'Khymaera - Shadowflame Shard',
        'Grand Melee - 100 pts',
        'PC      CARD',
        '        Lylyth, the Raven Vengeance',
        '22          Abyssal King',
        '    2           TENTACLE WEAPON 1 - Powder Cask',
        '    1           SMALLER HEAD 2 - Gnashing Fangs',
        '4       Defenses',
        '            DEFENSE OPTION 1 - Barrier',
        '            DEFENSE OPTION 2  - No option',
        'TOTAL POINTS  100/100',
      ].join(' || '),
    );

    expect(modulesOf(list)).toEqual([
      'TENTACLE WEAPON 1 - Powder Cask',
      'SMALLER HEAD 2 - Gnashing Fangs',
      'DEFENSE OPTION 1 - Barrier',
      'DEFENSE OPTION 2  - No option',
    ]);
    expect(modelsOf(list)).toEqual(['Abyssal King', 'Defenses']);
  });
});

describe('isSameCaster', () => {
  it('should match when the names differ in epithet or typos', () => {
    expect(isSameCaster('Hellyth, Scyir of Nightfall', 'Hellyth, Scyir of Nightfall')).toBe(true);
    expect(isSameCaster('Morayne, The Blade of Twilight', 'Morayne')).toBe(true);
    expect(isSameCaster('Captain Raef Huxely', 'Captain Raef Huxley')).toBe(true);
  });

  it('should not match when the casters are different', () => {
    expect(isSameCaster('Hunger', 'Nymara, the Shadowblade')).toBe(false);
    expect(isSameCaster('Kapitan Zahara Vilkul', 'Kapitan Ekaterina Baranova')).toBe(false);
  });
});
