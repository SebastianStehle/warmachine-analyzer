import { load } from 'cheerio';

export interface ShopProductContent {
  name: string;
  quantity: number;
}

// A kit that builds one of several models, e.g. "Crucible Guard Toro/Suppressor/Vindicator Warjack".
export interface ShopProductChoice {
  names: string[];
  quantity: number;
}

export interface ShopProduct {
  shopId: string;
  handle: string;
  title: string;
  price: number;
  available: boolean;
  imageUrl: string | null;
  armyTags: string[];
  contents: ShopProductContent[];
  titleContents: ShopProductContent[];
  choices: ShopProductChoice[];
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  tags: string[];
  body_html: string | null;
  variants: { price: string; available: boolean }[];
  images: { src: string }[];
}

const MODEL_PRODUCT_TYPES = ['Miniatures', 'Bundle'];
const TITLE_PREFIX = /^Warmachine\s*(MKIV)?\s*[:\-–]\s*/i;
const CONTENTS_HEADING = /what.s (in the box|included)/i;
// Army boxes often list their models between the paragraphs without a heading, only the type tells models from text.
const MODEL_TYPE = /warcaster|warlock|warjack|warbeast|colossal|gargantuan|battle engine|solo|unit|attachment|structure/i;
// Boxes number the copies of a unit, e.g. "Mechinthrall Swarm B", and describe loadouts, e.g. "Strygon with Snapping Maw".
const COPY_SUFFIX = /\s+[A-Z]$/;
const LOADOUT = /\s+with\s+.*$/i;
// "3 x Lesser Eldritch (Solo)", "1x Drago, the Unchained Beast (80mm Warbeast)" or "Strygon (Light Warbeast)".
// Some lines end with the base size after the type, e.g. "Abyssal King (Gargantuan) - 120mm base", others have several
// parentheses, e.g. "Gallant (Mercenary Character Super Heavy Warjack) (Companion*)", or a note, e.g. "Captain Eira
// Mackay (Warcaster) — Optional Warcaster".
const CONTENTS_LINE = /^(?:(\d+)\s*x?\s+)?([^(]+?)\s*((?:\([^)]+\)\s*)+)(?:[-–—].*)?$/i;
// Terrain and spare parts are listed in the box contents as well, but are not models.
const NO_MODEL = /base size|model size|chassis|counters?|tokens?|cards?|exclusive/i;
const NO_MODEL_PRODUCT = /chassis|\bdefenses\b|\boptions$|\bbundle\b|minicrate/i;
// Single kits are named after the model, e.g. "Khador Winter Korps Heavy Warjack – Great Bear" or "Hydrix Variant".
const TITLE_SUFFIXES =
  /\s+(Variant|Heavy Warjack|Light Warjack|Warjack|Heavy Warbeast|Light Warbeast|Warbeast|Colossal|Gargantuan|Battle Engine|Unit(?: [A-Z])?)$/i;
const TITLE_SEPARATORS = /\s+(?:and|&)\s+/i;
// Kits that build one of several models name them in the title, e.g. "Toro/Suppressor/Vindicator", boxes in a line
// below the chassis, e.g. "Build options: Vindicator, Toro, or Suppressor".
const TITLE_CHOICES = /\S\/\S/;
const BUILD_OPTIONS = /^build options:\s*(.+)$/i;
const CHOICE_SEPARATORS = /\s*(?:,\s*or\s+|,|\s+or\s+|\/)\s*/i;
const CENTS = 100;
const ARMY_TAG_PREFIX = 'warmachine-';

// The feed also contains paints and merchandise, the page is only empty after the last product.
export function parseProductPage(json: string): { products: ShopProduct[]; isEmpty: boolean } {
  const { products } = JSON.parse(json) as { products: ShopifyProduct[] };

  return {
    products: products.filter(({ product_type }) => MODEL_PRODUCT_TYPES.includes(product_type)).map(parseProduct),
    isEmpty: products.length === 0,
  };
}

function parseProduct(product: ShopifyProduct): ShopProduct {
  const [variant] = product.variants;

  return {
    shopId: String(product.id),
    handle: product.handle,
    title: product.title,
    price: Math.round(parseFloat(variant?.price ?? '0') * CENTS),
    available: variant?.available ?? false,
    imageUrl: product.images[0]?.src ?? null,
    armyTags: product.tags
      .filter((tag) => tag.toLowerCase().startsWith(ARMY_TAG_PREFIX))
      .map((tag) => tag.substring(ARMY_TAG_PREFIX.length).replace(/-/g, ' ')),
    contents: parseContents(product),
    titleContents:
      NO_MODEL_PRODUCT.test(product.title) || TITLE_CHOICES.test(product.title) ? [] : parseTitleContents(product.title),
    choices: parseChoices(product),
  };
}

function parseContents(product: ShopifyProduct): ShopProductContent[] {
  // Chassis variants and options come without a complete model, defenses are terrain and bundles contain other products.
  if (NO_MODEL_PRODUCT.test(product.title) || TITLE_CHOICES.test(product.title)) {
    return [];
  }

  const lines = toLines(product.body_html ?? '');

  const heading = lines.findIndex((line) => CONTENTS_HEADING.test(line));
  const result = heading >= 0 ? parseContentLines(lines.slice(heading + 1), false) : parseContentLines(lines, true);

  // Single kits often list the model without its type, e.g. "Meat Thresher", which the title covers as well.
  if (result.length > 0) {
    return result;
  }

  return parseTitleContents(product.title);
}

function parseContentLines(lines: string[], requireType: boolean) {
  const seen = new Set<string>();
  const result: ShopProductContent[] = [];

  for (const line of lines) {
    const match = CONTENTS_LINE.exec(line);
    if (!match) {
      continue;
    }

    const [, quantity, listedName, info] = match;
    // Models with two forms are listed twice, e.g. "Kapitan Kazimir Morozov (Human form) (Warlock)", but are one model.
    if (NO_MODEL.test(listedName) || NO_MODEL.test(info) || (requireType && !MODEL_TYPE.test(info)) || seen.has(listedName)) {
      continue;
    }

    seen.add(listedName);

    const name = listedName.replace(LOADOUT, '').replace(COPY_SUFFIX, '');
    const count = quantity ? parseInt(quantity, 10) : 1;

    const existing = result.find((content) => content.name === name);
    if (existing) {
      existing.quantity += count;
    } else {
      result.push({ name, quantity: count });
    }
  }

  return result;
}

function parseChoices(product: ShopifyProduct): ShopProductChoice[] {
  if (TITLE_CHOICES.test(product.title)) {
    return [{ names: parseTitleContents(product.title)[0].name.split(CHOICE_SEPARATORS), quantity: 1 }];
  }

  const result: ShopProductChoice[] = [];
  for (const line of toLines(product.body_html ?? '')) {
    const match = BUILD_OPTIONS.exec(line);
    if (match) {
      result.push({ names: match[1].split(CHOICE_SEPARATORS).filter((name) => name.length > 0), quantity: 1 });
    }
  }

  return result;
}

function parseTitleContents(title: string): ShopProductContent[] {
  const name = title
    .replace(TITLE_PREFIX, '')
    .split(/\s[–-]\s/)
    .pop()!
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^Variant\s+/i, '')
    .replace(TITLE_SUFFIXES, '')
    .trim();

  return name.split(TITLE_SEPARATORS).map((part) => ({ name: part.trim(), quantity: 1 }));
}

function toLines(html: string) {
  const $ = load(html);
  $('br').replaceWith('\n');
  $('p, li, div, h1, h2, h3, h4, h5, h6').append('\n');

  return $.root()
    .text()
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}
