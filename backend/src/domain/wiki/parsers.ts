import { load } from 'cheerio';
import { ModelType } from 'src/domain/database';

export interface IndexModel {
  name: string;
  alias: string | null;
  wikiPage: string | null;
  type: ModelType | null;
  isMercenary: boolean;
}

export interface ArmyIndex {
  army: string;
  faction: string | null;
  wikiIndex: string;
  models: IndexModel[];
}

const TYPE_PATTERNS: [RegExp, ModelType][] = [
  [/warcaster|warlock|master/, 'leader'],
  [/warjack|colossal|vector|monstrosit|avatar/, 'warjack'],
  [/warbeast|horror/, 'warbeast'],
  [/battle engine/, 'battle-engine'],
  [/attachment/, 'attachment'],
  [/solo/, 'solo'],
  [/unit/, 'unit'],
  [/structure|defense|marker|airdrop|army/, 'structure'],
];

const MISSING_PAGE_SUFFIX = ' (page does not exist)';

const cleanText = (value: string) => value.replace(/\s+/g, ' ').trim();

export function toModelType(label: string): ModelType | null {
  const normalized = label.toLowerCase();
  for (const [pattern, type] of TYPE_PATTERNS) {
    if (pattern.test(normalized)) {
      return type;
    }
  }

  return null;
}

// "Mercenaries" rows do not tell the type, it comes from the index of the army the model belongs to.
export function isMercenaryLabel(label: string) {
  return /mercenar|additional/i.test(label);
}

export function parseTemplateTitles(json: string) {
  const response = JSON.parse(json) as {
    query: { allpages: { title: string }[] };
    continue?: { apcontinue: string };
  };

  return {
    titles: response.query.allpages.map(({ title }) => title),
    next: response.continue?.apcontinue ?? null,
  };
}

export function isArmyIndexTitle(title: string) {
  return /Footer$/.test(title) && !/Legacy|Unlimited/i.test(title);
}

export function parseArmyIndex(json: string): ArmyIndex | null {
  const response = JSON.parse(json) as { parse: { title: string; text: { '*': string } } };
  const { title } = response.parse;
  const $ = load(response.parse.text['*']);

  const header = $('td[colspan] b').first();
  const headerText = cleanText(header.text()).replace(/\s+Index$/, '');

  // Legacy indexes list models that cannot be played in Mk4 lists anymore.
  if (/Legacy|Unlimited/i.test(headerText)) {
    return null;
  }

  let army = title.replace(/^Template:/, '').replace(/\s+Footer$/, '');
  let faction: string | null = null;

  const headerLinks = header.find('a');
  if (headerText) {
    army = headerLinks.length > 0 ? cleanText(headerLinks.last().text()) : headerText;

    const prefix = cleanText(headerText.substring(0, headerText.lastIndexOf(army)));
    faction = prefix || null;
  }

  const models: IndexModel[] = [];
  $('tr').each((_, row) => {
    const cells = $(row).children('td');
    if (cells.length < 2) {
      return;
    }

    const label = cleanText(cells.first().text());
    const type = toModelType(label);
    const isMercenary = isMercenaryLabel(label);

    cells
      .eq(1)
      .find('a')
      .each((_, link) => {
        const text = cleanText($(link).text());
        const linkTitle = $(link).attr('title') ?? text;
        const hasPage = !$(link).hasClass('new') && !linkTitle.endsWith(MISSING_PAGE_SUFFIX);
        const name = hasPage ? linkTitle : text;

        models.push({
          name,
          alias: text !== name ? text : null,
          wikiPage: hasPage ? linkTitle : null,
          type,
          isMercenary,
        });
      });
  });

  if (models.length === 0) {
    return null;
  }

  return { army, faction, wikiIndex: title, models };
}
