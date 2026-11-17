import { editDistance, normalizeName } from 'src/domain/common/text';
import { ModelType } from 'src/domain/database';
import { ParsedList } from './parser';

export interface CatalogModel {
  id: number;
  name: string;
  type: ModelType | null;
  aliases: string[];
  armies: string[];
}

export interface CatalogArmy {
  id: number;
  name: string;
  faction: string | null;
}

const NUMBER_SUFFIX = /\s+\d+$/;
const PARENTHESES = /\s*\([^)]*\)/g;
const MIN_FUZZY_LENGTH = 6;
const MEDIUM_NAME_LENGTH = 10;
const LONG_NAME_LENGTH = 15;

// Battlegroup models carry their weapons and modules as indented entries without an own model.
const MODELS_WITH_EQUIPMENT: (ModelType | null)[] = ['warjack', 'warbeast', 'battle-engine'];

// Short names are similar to many other names, e.g. "Hunger" and "Hunter", so they get fewer typos and only within the army.
function maxTypos(length: number, inArmy: boolean) {
  if (length >= LONG_NAME_LENGTH) {
    return 3;
  }

  if (length >= MEDIUM_NAME_LENGTH) {
    return 2;
  }

  return inArmy && length >= MIN_FUZZY_LENGTH ? 1 : 0;
}

export class ModelMatcher {
  private readonly byKey = new Map<string, CatalogModel>();
  private readonly keys: { key: string; model: CatalogModel }[] = [];
  private readonly cache = new Map<string, CatalogModel | null>();

  constructor(
    models: CatalogModel[],
    private readonly armies: CatalogArmy[],
  ) {
    for (const model of models) {
      // Names like "Mortar Team (Kithguard)" are written without the army in lists.
      const variants = [model.name, ...model.aliases, model.name.replace(PARENTHESES, '')];

      for (const variant of variants) {
        const key = normalizeName(variant);
        if (key && !this.byKey.has(key)) {
          this.byKey.set(key, model);
          this.keys.push({ key, model });
        }
      }
    }
  }

  // Longshanks and the wiki name some armies differently, e.g. "Kithguard" and "Southern Kriels Kithguard".
  findArmy(army: string | null | undefined) {
    if (!army) {
      return null;
    }

    const name = normalizeName(army);
    return (
      this.armies.find((candidate) => {
        const candidateName = normalizeName(candidate.name);
        return candidateName === name || candidateName.endsWith(name) || name.endsWith(candidateName);
      }) ?? null
    );
  }

  get hasArmies() {
    return this.armies.length > 0;
  }

  match(name: string, army?: string | null) {
    const cacheKey = `${army ?? ''}|${name}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    const result = this.findModel(name, army);
    this.cache.set(cacheKey, result);
    return result;
  }

  private findModel(name: string, army?: string | null) {
    const key = normalizeName(name);
    const withoutNumber = normalizeName(name.replace(NUMBER_SUFFIX, ''));

    const exact = this.byKey.get(key) ?? this.byKey.get(withoutNumber);
    if (exact) {
      return exact;
    }

    // Models of the own army win over similar names of other armies.
    const armyLimit = maxTypos(withoutNumber.length, true);
    const inArmy = army && armyLimit > 0 ? this.closest(withoutNumber, armyLimit, (model) => model.armies.includes(army)) : null;
    if (inArmy) {
      return inArmy;
    }

    const globalLimit = maxTypos(withoutNumber.length, false);
    return globalLimit > 0 ? this.closest(withoutNumber, globalLimit, () => true) : null;
  }

  private closest(key: string, limit: number, filter: (model: CatalogModel) => boolean) {
    let best: CatalogModel | null = null;
    let bestDistance = limit + 1;

    for (const candidate of this.keys) {
      if (Math.abs(candidate.key.length - key.length) > limit || !filter(candidate.model)) {
        continue;
      }

      const distance = editDistance(key, candidate.key);
      if (distance < bestDistance) {
        best = candidate.model;
        bestDistance = distance;
      }
    }

    return best;
  }
}

export function matchListEntries(list: ParsedList, matcher: ModelMatcher, army: string | null) {
  const modelIds: (number | null)[] = [];
  const models: (CatalogModel | null)[] = [];

  for (const entry of list.entries) {
    const model = entry.kind === 'module' ? null : matcher.match(entry.name, army);
    models.push(model);
    modelIds.push(model?.id ?? null);
  }

  const leaderIndex = models.findIndex((model) => model?.type === 'leader');
  if (leaderIndex >= 0) {
    for (let i = 0; i < list.entries.length; i++) {
      if (list.entries[i].kind === 'leader') {
        list.entries[i].kind = 'model';
      }
    }

    list.entries[leaderIndex].kind = 'leader';
  }

  for (let i = 0; i < list.entries.length; i++) {
    const entry = list.entries[i];
    if (models[i] || entry.depth === 0 || entry.kind !== 'model') {
      continue;
    }

    let parent = i - 1;
    while (parent >= 0 && list.entries[parent].depth >= entry.depth) {
      parent--;
    }

    if (parent >= 0 && MODELS_WITH_EQUIPMENT.includes(models[parent]?.type ?? null)) {
      entry.kind = 'module';
    }
  }

  return { modelIds, casterId: leaderIndex >= 0 ? modelIds[leaderIndex] : null };
}
