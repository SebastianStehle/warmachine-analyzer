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

const ATTACHMENT_HEADING = /^(?:command|weapon)\s+attachments?\s*:\s*(.+)$/i;
const LIMITED_BATTLEGROUP = /\{\{\s*Limited Battlegroup\s*\|([^}]+)\}\}/i;
const NAME_SEPARATORS = /\s+(?:and|&)\s+|\s*,\s*/i;
const BOLD_TEXT = /'''(.+?)'''/;
const WIKI_LINK = /\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g;
const PAGE_HEADING = /^=\s*(.+?)\s*=$/;
const FIRST_FILE = /\[\[\s*(?:File|Image)\s*:\s*([^|\]]+)/i;
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

// The army indexes do not list most command attachments, they are only described as sections of the unit page.
export function parseAttachments(json: string, unit: string): string[] {
  const response = JSON.parse(json) as { parse?: { tocdata?: { sections: { line: string }[] } } };
  const sections = response.parse?.tocdata?.sections ?? [];

  const result: string[] = [];
  for (const { line } of sections) {
    const match = ATTACHMENT_HEADING.exec(cleanText(load(line).text()));
    if (!match) {
      continue;
    }

    const name = match[1].trim();
    // Lists name attachments like "Bosun" after their unit, e.g. "Marauder Crew Bosun".
    const fullName = name.includes(' ') ? name : `${unit} ${name}`;
    if (!result.includes(fullName)) {
      result.push(fullName);
    }
  }

  return result;
}

export function parseEmbeddingPages(json: string) {
  const response = JSON.parse(json) as {
    query: { embeddedin: { title: string }[] };
    continue?: { eicontinue: string };
  };

  return {
    titles: response.query.embeddedin.map(({ title }) => title),
    next: response.continue?.eicontinue ?? null,
  };
}

export interface Companion {
  name: string;
  type: ModelType | null;
}

// Some solos come with their own warjack or warbeast, which is only described on the page of the solo.
export function parseCompanions(json: string): Companion[] {
  const response = JSON.parse(json) as { parse?: { wikitext?: string } };
  const wikitext = response.parse?.wikitext ?? '';

  const match = LIMITED_BATTLEGROUP.exec(wikitext);
  if (!match) {
    return [];
  }

  const lines = wikitext.split('\n').map((line) => line.trim());

  return match[1]
    .split(NAME_SEPARATORS)
    .map((name) => cleanText(name))
    .filter((name) => name.length > 0)
    .map((name) => ({ name, type: findSectionType(lines, name) }));
}

// The section of a companion starts with a line like "'''[[Mercenary Prime|Mercenary]] [[Super Heavy Monstrosity]]'''".
function findSectionType(lines: string[], name: string) {
  const heading = lines.findIndex((line) => /^=+[^=]+=+$/.test(line) && cleanText(line.replace(/=/g, '')) === name);
  if (heading < 0) {
    return null;
  }

  for (const line of lines.slice(heading + 1)) {
    if (line.startsWith('=')) {
      return null;
    }

    const bold = BOLD_TEXT.exec(line);
    if (bold) {
      return toModelType(bold[1].replace(WIKI_LINK, '$1'));
    }
  }

  return null;
}

interface QueryResponse<T> {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: T[];
  };
}

// The wiki answers with the normalized and redirected title, so the result is mapped back to the requested titles.
function toRequestedTitles<T>(response: QueryResponse<unknown>, byTitle: Map<string, T>, requested: string[]) {
  const aliases = new Map<string, string>();
  for (const { from, to } of [...(response.query?.normalized ?? []), ...(response.query?.redirects ?? [])]) {
    aliases.set(from, to);
  }

  const result = new Map<string, T>();
  for (const title of requested) {
    let current = title;
    for (let i = 0; i < 3 && aliases.has(current); i++) {
      current = aliases.get(current)!;
    }

    const value = byTitle.get(current);
    if (value !== undefined) {
      result.set(title, value);
    }
  }

  return result;
}

// The first image of a model page is the picture of the model, the icons for weapons come later.
export function parsePageImages(json: string, requested: string[]) {
  const response = JSON.parse(json) as QueryResponse<{
    title: string;
    revisions?: { slots: { main: { content?: string } } }[];
  }>;

  const byTitle = new Map<string, string>();
  for (const { title, revisions } of response.query?.pages ?? []) {
    const match = FIRST_FILE.exec(revisions?.[0]?.slots.main.content ?? '');
    if (match) {
      byTitle.set(title, match[1].trim());
    }
  }

  return toRequestedTitles(response, byTitle, requested);
}

// The first heading is the full name of the model, e.g. "= Emperor {{PAGENAME}} Esquire III =" on the page "Carver Ultimus".
export function parsePageHeadings(json: string, requested: string[]) {
  const response = JSON.parse(json) as QueryResponse<{
    title: string;
    revisions?: { slots: { main: { content?: string } } }[];
  }>;

  const byTitle = new Map<string, string>();
  for (const { title, revisions } of response.query?.pages ?? []) {
    const lines = (revisions?.[0]?.slots.main.content ?? '').split('\n').map((line) => line.trim());
    const heading = lines.map((line) => PAGE_HEADING.exec(line)).find((match) => !!match);
    if (heading) {
      byTitle.set(title, cleanText(heading[1].replace(/\{\{\s*PAGENAME\s*\}\}/gi, title)));
    }
  }

  return toRequestedTitles(response, byTitle, requested);
}

export function parseImageUrls(json: string, files: string[]) {
  const response = JSON.parse(json) as QueryResponse<{
    title: string;
    imageinfo?: { url: string; thumburl?: string }[];
  }>;

  const byTitle = new Map<string, string>();
  for (const { title, imageinfo } of response.query?.pages ?? []) {
    const info = imageinfo?.[0];
    if (info) {
      byTitle.set(title, info.thumburl ?? info.url);
    }
  }

  const result = new Map<string, string>();
  for (const [title, url] of toRequestedTitles(
    response,
    byTitle,
    files.map((file) => `File:${file}`),
  )) {
    result.set(title.substring('File:'.length), url);
  }

  return result;
}
