import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ArmyIndex, parseArmyIndex } from 'src/domain/wiki';
import { buildCatalog } from './catalog-file';

const parseFixture = (name: string, title: string) =>
  parseArmyIndex(
    JSON.stringify({
      parse: { title, text: { '*': readFileSync(join(__dirname, '../../../test/fixtures/wiki', `${name}.html`), 'utf8') } },
    }),
  )!;

describe('buildCatalog', () => {
  const kallyss = parseFixture('dusk-house-kallyss-footer', 'Template:Dusk House Kallyss Footer');
  const kithguard = parseFixture('southern-kriels-kithguard-footer', 'Template:Southern Kriels Kithguard Footer');

  it('should sort armies and models by name when built from the wiki indexes', () => {
    const { armies, models } = buildCatalog([kithguard, kallyss]);

    expect(armies.map(({ name }) => name)).toEqual(['House Kallyss', 'Kithguard']);
    expect(models.map(({ name }) => name)).toEqual([...models.map(({ name }) => name)].sort((a, b) => a.localeCompare(b)));
  });

  it('should merge models that appear in several indexes when building the catalog', () => {
    const shared: ArmyIndex = {
      army: 'Other Army',
      faction: null,
      wikiIndex: 'Template:Other Army Footer',
      models: [{ name: 'Ghast', alias: 'Ghasty', wikiPage: null, type: null, isMercenary: true }],
    };

    const { armies, models } = buildCatalog([kallyss, shared], {
      images: new Map([['Ghast', 'https://wiki.test/ghast.png']]),
      headings: new Map([['Ghast', 'The Ghast']]),
    });

    expect(models.filter(({ name }) => name === 'Ghast')).toEqual([
      {
        name: 'Ghast',
        type: 'warjack',
        wikiPage: 'Ghast',
        aliases: ['Ghasty', 'The Ghast'],
        imageUrl: 'https://wiki.test/ghast.png',
      },
    ]);
    expect(armies.find(({ name }) => name === 'Other Army')?.models).toEqual([{ name: 'Ghast', isMercenary: true }]);
  });
});
