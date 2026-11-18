import { readFileSync } from 'fs';
import { join } from 'path';
import { ModelType } from 'src/domain/database';
import { ArmyIndex, PageDetails } from 'src/domain/wiki';

export interface CatalogModelData {
  name: string;
  type: ModelType | null;
  wikiPage: string | null;
  aliases: string[];
  imageUrl: string | null;
}

export interface CatalogArmyModelData {
  name: string;
  isMercenary: boolean;
}

export interface CatalogArmyData {
  name: string;
  faction: string | null;
  wikiIndex: string;
  models: CatalogArmyModelData[];
}

export interface CatalogData {
  armies: CatalogArmyData[];
  models: CatalogModelData[];
}

export const CATALOG_FILE = join(__dirname, 'catalog.json');

export function readCatalog(file = CATALOG_FILE): CatalogData {
  return JSON.parse(readFileSync(file, 'utf8')) as CatalogData;
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

// Models appear in the indexes of several armies (mercenaries, allies), so they are merged by name. The output is sorted
// to keep the diff of the catalog file small when the wiki changes.
export function buildCatalog(
  indexes: ArmyIndex[],
  { images, headings }: PageDetails = { images: new Map(), headings: new Map() },
): CatalogData {
  const models = new Map<string, { name: string; type: ModelType | null; wikiPage: string | null; aliases: Set<string> }>();
  const armies = new Map<string, CatalogArmyData>();

  for (const { army, faction, wikiIndex, models: indexModels } of indexes) {
    const armyModels = armies.get(army)?.models ?? [];

    for (const { name, alias, wikiPage, type, isMercenary } of indexModels) {
      const model = models.get(name) ?? { name, type: null, wikiPage: null, aliases: new Set<string>() };

      // Mercenary rows of other armies are less specific than the index of the army the model belongs to.
      if (type && (!model.type || !isMercenary)) {
        model.type = type;
      }

      model.wikiPage ??= wikiPage;
      if (alias) {
        model.aliases.add(alias);
      }

      models.set(name, model);

      if (!armyModels.some((existing) => existing.name === name)) {
        armyModels.push({ name, isMercenary });
      }
    }

    // Additions to an army keep the faction and index of the wiki.
    const existing = armies.get(army);
    armies.set(army, {
      name: army,
      faction: existing?.faction ?? faction,
      wikiIndex: existing?.wikiIndex ?? wikiIndex,
      models: armyModels,
    });
  }

  // The shop uses the full name, e.g. "Emperor Carver Ultimus Esquire III". Companions and attachments are described on
  // the page of another model, so only the model the page is named after gets the heading.
  for (const model of models.values()) {
    const heading = model.wikiPage === model.name ? headings.get(model.wikiPage) : undefined;
    if (heading && heading !== model.name) {
      model.aliases.add(heading);
    }
  }

  return {
    armies: [...armies.values()].map((army) => ({ ...army, models: [...army.models].sort(byName) })).sort(byName),
    models: [...models.values()]
      .map(({ name, type, wikiPage, aliases }) => ({
        name,
        type,
        wikiPage,
        aliases: [...aliases].sort(),
        imageUrl: (wikiPage && images.get(wikiPage)) ?? null,
      }))
      .sort(byName),
  };
}
