import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseArmyIndex } from 'src/domain/wiki/parsers';
import { CatalogModel, matchListEntries, ModelMatcher, resolveListArmy } from './model-matcher';
import { parseArmyLists } from './parser';

const fixture = (folder: string, name: string) => readFileSync(join(__dirname, '../../../test/fixtures', folder, name), 'utf8');

// The catalog is built from real army indexes of the wiki, like the catalog import does.
function createMatcher() {
  const models = new Map<string, CatalogModel>();

  const armies = [
    ['dusk-house-kallyss-footer.html', 'Template:Dusk House Kallyss Footer'],
    ['southern-kriels-kithguard-footer.html', 'Template:Southern Kriels Kithguard Footer'],
  ].map(([file, title]) => parseArmyIndex(JSON.stringify({ parse: { title, text: { '*': fixture('wiki', file) } } }))!);

  for (const { army, models: indexModels } of armies) {
    for (const { name, alias, type } of indexModels) {
      const model = models.get(name) ?? { id: models.size + 1, name, type, aliases: [], armies: [] };
      model.type ??= type;
      model.armies.push(army);
      if (alias) {
        model.aliases.push(alias);
      }
      models.set(name, model);
    }
  }

  return new ModelMatcher(
    [...models.values()],
    armies.map(({ army, faction }, index) => ({ id: index + 1, name: army, faction })),
  );
}

describe('ModelMatcher', () => {
  let matcher: ModelMatcher;

  beforeAll(() => {
    matcher = createMatcher();
  });

  it('should match a real list to the models of the wiki', () => {
    const [list] = parseArmyLists(fixture('lists', 'kithguard-trapdoors-newlines.txt'));

    const { modelIds, casterId } = matchListEntries(list, matcher, 'Kithguard');

    const matched = list.entries.map(({ name, kind }, i) => [name, kind, modelIds[i] !== null]);
    expect(casterId).toEqual(matcher.match('Captain Tarja Grimtusk', 'Kithguard')?.id);
    expect(matched).toEqual([
      ['Trapdoor 1', 'model', true],
      ['Trapdoor 2', 'model', true],
      ['Trapdoor 3', 'model', true],
      ['Captain Tarja Grimtusk', 'leader', true],
      ['Dozer & Smigg, Siege Breakers', 'model', true],
      ['Jungle Troll 1', 'model', true],
      ['HEAD - Headband', 'module', false],
      ['RIGHT ARM - Machete', 'module', false],
      ['LEFT ARM - Combat Knife', 'module', false],
      ['Jungle Troll 2', 'model', true],
      ['HEAD - Headband', 'module', false],
      ['RIGHT ARM - Machete', 'module', false],
      ['LEFT ARM - Combat Knife', 'module', false],
      ['Vorogger 1', 'model', true],
      ['Vorogger 2', 'model', true],
      ['Guard Post', 'model', true],
      ['Captain Barl "Demolisher" Dunax', 'model', false],
      ['Captain Logan Grindstone', 'model', true],
      ["Mawga'Bawza", 'model', true],
      ['Pvt. Rattles', 'model', true],
      ['Medics', 'model', true],
      ['Scrappers', 'model', true],
      ['Spirit Shamans', 'model', true],
      ['Steelbacks', 'model', true],
      ['Tunnel Rats', 'model', true],
    ]);
  });

  it('should match names with typos, other spellings and without the army in parentheses', () => {
    expect(matcher.match('Captain Tarja Grimtuks', 'Kithguard')?.name).toEqual('Captain Tarja Grimtusk');
    expect(matcher.match('Dozer and Smigg', 'Kithguard')?.name).toEqual('Dozer & Smigg, Siege Breakers');
    expect(matcher.match('Mortar Team', 'Kithguard')?.name).toEqual('Mortar Team (Kithguard)');
    expect(matcher.match('Dreadguard Archers 2', 'House Kallyss')?.name).toEqual('Dreadguard Archers');
  });

  it('should not match when the name is too different or too short for typos', () => {
    expect(matcher.match('Benkei', 'House Kallyss')).toBeNull();
    expect(matcher.match('Ghost', 'House Kallyss')).toBeNull();
  });

  // Wrong matches seen on real lists, the models of other armies only look similar.
  it('should not match short names to similar models of other armies', () => {
    const other = new ModelMatcher(
      [
        { id: 1, name: 'Hunter', type: 'warjack', aliases: [], armies: ['Storm Legion'] },
        { id: 2, name: 'Beaker', type: 'solo', aliases: [], armies: ['Dark Operations'] },
        { id: 3, name: 'Valiant', type: 'warjack', aliases: [], armies: ['First Army'] },
        { id: 4, name: 'Liegeman Wardens', type: 'unit', aliases: [], armies: ['Ravens of War'] },
      ],
      [],
    );

    expect(other.match('Hunger', 'Fane of Nyrro')).toBeNull();
    expect(other.match('Benkei', 'House Kallyss')).toBeNull();
    expect(other.match('Gallant', 'Winter Korps')).toBeNull();
    expect(other.match('Liegemen Wardens 2', 'Ravens of War')?.name).toEqual('Liegeman Wardens');
  });

  it('should prefer the version of the own army when several armies have a model with the same name', () => {
    const armyMatcher = new ModelMatcher(
      [
        {
          id: 1,
          name: 'Exulon Khythos (Dark Operations)',
          type: 'leader',
          aliases: ['Exulon Khythos'],
          armies: ['Dark Operations'],
        },
        {
          id: 2,
          name: 'Exulon Khythos (Necrofactorium)',
          type: 'leader',
          aliases: ['Exulon Khythos'],
          armies: ['Necrofactorium'],
        },
        { id: 3, name: 'Lanyssa Ryssyl, Aransor of Sorrows', type: 'solo', aliases: [], armies: ['House Kallyss'] },
        { id: 4, name: 'Lanyssa Ryssyl, Aransor of Vengeance', type: 'solo', aliases: [], armies: ['Fane of Nyrro'] },
      ],
      [],
    );

    expect(armyMatcher.match('Exulon Khythos', 'Necrofactorium')?.id).toEqual(2);
    expect(armyMatcher.match('Exulon Khythos', 'Dark Operations')?.id).toEqual(1);
    expect(armyMatcher.match('Lanyssa Ryssyl', 'House Kallyss')?.id).toEqual(3);
    expect(armyMatcher.match('Lanyssa Ryssyl', 'Fane of Nyrro')?.id).toEqual(4);
    expect(armyMatcher.match('Lanyssa Ryssyl')).toBeNull();
  });

  it('should match shortened shop names by the end of a model name within the army', () => {
    const shopMatcher = new ModelMatcher(
      [
        { id: 1, name: 'Winter Korps Snipers', type: 'unit', aliases: [], armies: ['Winter Korps'] },
        { id: 2, name: 'Winter Korps Hunting Dog', type: 'attachment', aliases: [], armies: ['Winter Korps'] },
      ],
      [],
    );

    expect(shopMatcher.matchEnding('Hunting Dog', 'Winter Korps')?.id).toEqual(2);
    expect(shopMatcher.matchEnding('Hunting Dog', 'Old Umbrey')).toBeNull();
    expect(shopMatcher.matchEnding('Dog', 'Winter Korps')).toBeNull();
  });

  it('should match shop names that drop words only when the model is unique', () => {
    const shopMatcher = new ModelMatcher(
      [
        { id: 1, name: 'Flameguard Defenders', type: 'unit', aliases: [], armies: ['Covenant of the Flame'] },
        {
          id: 2,
          name: 'Flameguard Defender Standard Bearer',
          type: 'attachment',
          aliases: [],
          armies: ['Covenant of the Flame'],
        },
      ],
      [],
    );

    expect(shopMatcher.matchWords('Flameguard Defenders Standard', 'Covenant of the Flame')?.id).toEqual(2);
    expect(shopMatcher.matchWords('Flameguard Defenders', 'Covenant of the Flame')).toBeNull();
    expect(shopMatcher.matchWords('Flameguard Defenders Support Weapons', 'Covenant of the Flame')).toBeNull();
  });

  it('should match the first part of combined models, names with an epithet and attachments named after their unit', () => {
    const namesMatcher = new ModelMatcher(
      [
        { id: 1, name: 'Wrong Eye & Snapjaw', type: 'solo', aliases: [], armies: ['Blindwater Congregation'] },
        { id: 2, name: 'Azdharak', type: 'warjack', aliases: [], armies: ['Orgoth Sea Raiders'] },
        { id: 3, name: 'Farrow Warlord', type: 'attachment', aliases: [], armies: ['Thornfall Alliance'] },
        { id: 4, name: 'Trollkin Fennblade Officer & Standard', type: 'attachment', aliases: [], armies: ['United Kriels'] },
      ],
      [],
    );

    expect(namesMatcher.match('Wrong Eye', 'Blindwater Congregation')?.id).toEqual(1);
    expect(namesMatcher.match('Azdharak, Herald of Immolation', 'Orgoth Sea Raiders')?.id).toEqual(2);
    expect(namesMatcher.match('Farrow Brigand Warlord', 'Thornfall Alliance')?.id).toEqual(3);
    expect(namesMatcher.match('Trollkin Fennblade Officer', 'United Kriels')).toBeNull();
  });

  it('should treat free entries below a model and cards above the caster as part of them', () => {
    const [list] = parseArmyLists(
      'Test || Dusk - House Kallyss || Grand Melee - 100 pts || PC      CARD ||         Unknown Card ||         Hellyth, Scyir of Nightfall ||             Unknown Pet || 27          Phantasm || TOTAL POINTS  100/100',
    );

    matchListEntries(list, matcher, 'House Kallyss');

    expect(list.entries.map(({ name, kind }) => `${name}:${kind}`)).toEqual([
      'Unknown Card:module',
      'Hellyth, Scyir of Nightfall:leader',
      'Unknown Pet:module',
      'Phantasm:model',
    ]);
  });

  it('should take the army from the caster when the list is registered with the wrong army', () => {
    const [list] = parseArmyLists(fixture('lists', 'kithguard-trapdoors-newlines.txt'));
    list.army = null;

    const army = resolveListArmy(list, matcher, matcher.findArmy('House Kallyss'));

    expect(army?.name).toEqual(matcher.findArmy('Kithguard')?.name);
  });

  it('should treat unknown entries below a warjack as equipment', () => {
    const [list] = parseArmyLists(
      'Test || Dusk - House Kallyss || Grand Melee - 100 pts || PC      CARD ||         Hellyth, Scyir of Nightfall || 27          Phantasm ||     3           Focus Vault || 9       Dreadguard Archers ||             Dreadguard Archer Officer || TOTAL POINTS  100/100',
    );

    matchListEntries(list, matcher, 'House Kallyss');

    expect(list.entries.map(({ name, kind }) => `${name}:${kind}`)).toEqual([
      'Hellyth, Scyir of Nightfall:leader',
      'Phantasm:model',
      'Focus Vault:module',
      'Dreadguard Archers:model',
      'Dreadguard Archer Officer:model',
    ]);
  });

  it('should treat unknown entries indented above the caster as part of the caster', () => {
    const [list] = parseArmyLists(fixture('lists', 'storm-legion-drone-servitor-above-caster.txt'));

    matchListEntries(list, matcher, 'Cygnar Storm Legion');

    expect(list.entries.slice(0, 2).map(({ name, kind }) => `${name}:${kind}`)).toEqual([
      'Drone Servitor:module',
      'Captain Raef Huxley:leader',
    ]);
  });

  it('should find the wiki army when Longshanks names it differently', () => {
    expect(matcher.findArmy('Kithguard')?.name).toEqual('Kithguard');
    expect(matcher.findArmy('Southern Kriels Kithguard')?.name).toEqual('Kithguard');
    expect(matcher.findArmy('Unknown Army')).toBeNull();
  });
});
