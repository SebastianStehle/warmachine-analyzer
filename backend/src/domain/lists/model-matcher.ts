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

// Units and attachments share words like "Officer", so only characters are found by the first part of their name.
const SPLIT_NAME_TYPES: (ModelType | null)[] = ['leader', 'solo', 'warjack', 'warbeast'];
const NAME_PARTS = /\s+&\s+/;
const EPITHET = /,.*$/;
const MIN_ATTACHMENT_WORDS = 2;

const toWords = (name: string) =>
  name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);

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
  // Several armies have their own version of a model with the same name, e.g. "Exulon Khythos (Necrofactorium)".
  private readonly byKey = new Map<string, CatalogModel[]>();
  private readonly keys: { key: string; model: CatalogModel }[] = [];
  private readonly ambiguousShortNames = new Map<string, CatalogModel[]>();
  private readonly attachments: { words: string[]; model: CatalogModel }[] = [];
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
        const candidates = this.byKey.get(key) ?? [];
        if (key && !candidates.includes(model)) {
          this.byKey.set(key, [...candidates, model]);
          this.keys.push({ key, model });
        }
      }
    }

    // The shop and some lists shorten names like "Gwyn Faryll, the Misery of Merywyn". Several models of the same
    // character share the short name, then only the army can tell them apart.
    const shortNames = new Map<string, CatalogModel[]>();
    for (const model of models) {
      const separator = model.name.indexOf(',');
      if (separator > 0) {
        const key = normalizeName(model.name.substring(0, separator));
        shortNames.set(key, [...(shortNames.get(key) ?? []), model]);
      }
    }

    // Lists write models like "Wrong Eye & Snapjaw" as two entries, the first one is the model, the second comes with it.
    for (const model of models) {
      const parts = model.name.split(NAME_PARTS);
      const key = normalizeName(parts[0]);
      if (parts.length > 1 && SPLIT_NAME_TYPES.includes(model.type) && !this.byKey.has(key)) {
        this.byKey.set(key, [model]);
      }

      if (model.type === 'attachment') {
        this.attachments.push({ words: toWords(model.name), model });
      }
    }

    for (const [key, candidates] of shortNames) {
      if (this.byKey.has(key)) {
        continue;
      }

      if (candidates.length === 1) {
        this.byKey.set(key, candidates);
        this.keys.push({ key, model: candidates[0] });
      } else {
        this.ambiguousShortNames.set(key, candidates);
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

  findArmiesOfFaction(faction: string) {
    const name = normalizeName(faction);
    return this.armies.filter((army) => army.faction !== null && normalizeName(army.faction) === name);
  }

  armyName(armyId: number | null) {
    return this.armies.find((army) => army.id === armyId)?.name ?? null;
  }

  findArmyByName(name: string) {
    return this.armies.find((army) => army.name === name) ?? null;
  }

  get hasArmies() {
    return this.armies.length > 0;
  }

  // The shop shortens names in titles, e.g. "Hunting Dog" for "Winter Korps Hunting Dog". Only unique endings within the army count.
  matchEnding(name: string, army: string) {
    const key = normalizeName(name);
    if (key.length < MEDIUM_NAME_LENGTH) {
      return null;
    }

    const found = new Set<CatalogModel>();
    for (const candidate of this.keys) {
      if (candidate.key.endsWith(key) && candidate.model.armies.includes(army)) {
        found.add(candidate.model);
      }
    }

    return found.size === 1 ? [...found][0] : null;
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
      return exact.find((model) => army && model.armies.includes(army)) ?? exact[0];
    }

    const inArmyVersions = (this.ambiguousShortNames.get(key) ?? []).filter((model) => army && model.armies.includes(army));
    if (inArmyVersions.length === 1) {
      return inArmyVersions[0];
    }

    // Lists sometimes add the epithet that the wiki leaves out, e.g. "Azdharak, Herald of Immolation".
    const withoutEpithet = this.byKey
      .get(normalizeName(name.replace(EPITHET, '')))
      ?.find((model) => army && model.armies.includes(army));
    if (withoutEpithet && name.includes(',')) {
      return withoutEpithet;
    }

    // Lists name attachments after their unit, e.g. "Farrow Brigand Warlord" for "Farrow Warlord".
    const attachment = army ? this.findAttachment(name, army) : null;
    if (attachment) {
      return attachment;
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

  private findAttachment(name: string, army: string) {
    const words = new Set(toWords(name.replace(NUMBER_SUFFIX, '')));

    const found = this.attachments.filter(
      (candidate) =>
        candidate.words.length >= MIN_ATTACHMENT_WORDS &&
        candidate.model.armies.includes(army) &&
        candidate.words.every((word) => words.has(word)),
    );

    return found.length === 1 ? found[0].model : null;
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

  // War Room lists cards and things that come with the caster above it, e.g. "The Four Gifts Of Menoth" or the Drone Servitor.
  const leader = list.entries.findIndex(({ kind }) => kind === 'leader');
  for (let i = 0; i < leader; i++) {
    const entry = list.entries[i];
    if (!models[i] && entry.kind === 'model' && (entry.points === null || entry.depth > list.entries[leader].depth)) {
      entry.kind = 'module';
    }
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

    // Free entries below a model come with it, e.g. the Wights of a Void Engine or Snapjaw below Wrong Eye. Below units they are attachments.
    const comesWithParent = parent >= 0 && !!models[parent] && models[parent]?.type !== 'unit' && entry.points === null;
    if (parent >= 0 && (MODELS_WITH_EQUIPMENT.includes(models[parent]?.type ?? null) || comesWithParent)) {
      entry.kind = 'module';
    }
  }

  return { modelIds, casterId: leaderIndex >= 0 ? modelIds[leaderIndex] : null };
}

function findCaster(list: ParsedList, matcher: ModelMatcher, army: string | null) {
  for (const entry of list.entries) {
    const model = entry.kind === 'module' ? null : matcher.match(entry.name, army);
    if (model?.type === 'leader') {
      return model;
    }
  }

  return null;
}

// Longshanks and the list header are sometimes wrong, but the catalog knows which armies a caster can lead.
export function resolveListArmy(list: ParsedList, matcher: ModelMatcher, registered: CatalogArmy | null) {
  const header = matcher.findArmy(list.army);
  const candidates = [registered, header].filter((army): army is CatalogArmy => army !== null);

  let caster: CatalogModel | null = candidates.length === 0 ? findCaster(list, matcher, null) : null;
  for (const army of candidates) {
    const found = findCaster(list, matcher, army.name);
    if (found?.armies.includes(army.name)) {
      return army;
    }
    caster ??= found;
  }

  if (caster?.armies.length === 1) {
    return matcher.findArmyByName(caster.armies[0]) ?? candidates[0] ?? null;
  }

  return candidates[0] ?? null;
}
