import { load } from 'cheerio';

export interface ShopProductContent {
  name: string;
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
const CONTENTS_HEADING = /what.s in the box/i;
// "3 x Lesser Eldritch (Solo)", "1x Drago, the Unchained Beast (80mm Warbeast)" or "Strygon (Light Warbeast)".
// Some lines end with the base size after the type, e.g. "Abyssal King (Gargantuan) - 120mm base", others have several
// parentheses, e.g. "Gallant (Mercenary Character Super Heavy Warjack) (Companion*)".
const CONTENTS_LINE = /^(?:(\d+)\s*x?\s+)?([^(]+?)\s*((?:\([^)]+\)\s*)+)(?:[-–].*)?$/i;
// Terrain and spare parts are listed in the box contents as well, but are not models.
const NO_MODEL = /base size|model size|chassis|counters?|tokens?|cards?/i;
const NO_MODEL_PRODUCT = /chassis|\bdefenses\b/i;
// Single kits are named after the model, e.g. "Khador Winter Korps Heavy Warjack – Great Bear" or "Hydrix Variant".
const TITLE_SUFFIXES =
  /\s+(Variant|Heavy Warjack|Light Warjack|Warjack|Heavy Warbeast|Light Warbeast|Warbeast|Colossal|Gargantuan|Battle Engine|Unit)$/i;
const TITLE_SEPARATORS = /\s+(?:and|&)\s+/i;
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
  };
}

function parseContents(product: ShopifyProduct): ShopProductContent[] {
  // Chassis variants come without weapons and heads, and defenses are terrain, so neither is a playable model.
  if (NO_MODEL_PRODUCT.test(product.title)) {
    return [];
  }

  const lines = toLines(product.body_html ?? '');

  const heading = lines.findIndex((line) => CONTENTS_HEADING.test(line));
  if (heading >= 0) {
    const result: ShopProductContent[] = [];
    for (const line of lines.slice(heading + 1)) {
      const match = CONTENTS_LINE.exec(line);
      if (!match) {
        continue;
      }

      const [, quantity, name, info] = match;
      // Models with two forms are listed twice, e.g. "Kapitan Kazimir Morozov (Human form) (Warlock)", but are one model.
      if (!NO_MODEL.test(name) && !NO_MODEL.test(info) && !result.some((content) => content.name === name)) {
        result.push({ name, quantity: quantity ? parseInt(quantity, 10) : 1 });
      }
    }

    // Single kits often list the model without its type, e.g. "Meat Thresher", which the title covers as well.
    if (result.length > 0) {
      return result;
    }
  }

  return parseTitle(product.title).map((name) => ({ name, quantity: 1 }));
}

function parseTitle(title: string) {
  const name = title
    .replace(TITLE_PREFIX, '')
    .split(/\s[–-]\s/)
    .pop()!
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^Variant\s+/i, '')
    .replace(TITLE_SUFFIXES, '')
    .trim();

  return name.split(TITLE_SEPARATORS).map((part) => part.trim());
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
