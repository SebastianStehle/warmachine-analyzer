import { ListEntryKind } from 'src/domain/database';

export interface ParsedListEntry {
  name: string;
  baseName: string;
  points: number | null;
  depth: number;
  kind: ListEntryKind;
}

export interface ParsedList {
  title: string;
  faction: string | null;
  army: string | null;
  format: string | null;
  pointLevel: number | null;
  totalPoints: number | null;
  caster: string | null;
  entries: ParsedListEntry[];
  commandCards: string[];
  warnings: string[];
  rawText: string;
}

// Longshanks stores the War Room export with " || " instead of line breaks.
const LINE_SEPARATOR = ' || ';
// War Room indents attached models (battlegroup, mounts) by this many columns per level.
const INDENT_WIDTH = 4;

const CARD_HEADER = /^PC\s+CARD$/i;
const COMMAND_CARD_HEADER = /^PC\s+COMMAND\s+CARD$/i;
const TOTAL_POINTS = /^TOTAL\s+POINTS\s+(\d+)\s*\/\s*(\d+)/i;
const FORMAT_LINE = /^(.+?)\s+-\s+(\d+)\s*pts$/i;
const ENTRY_LINE = /^\s*(\d+)?\s*(\S.*?)\s*$/;
// Modules of customizable jacks, e.g. "HEAD - Focus Vault" or "RIGHT HEX BLADE - Force Generator Right".
const MODULE_NAME = /^[A-Z][A-Z ]+ - /;
const NUMBER_SUFFIX = /\s+\d+$/;
const MIN_FUZZY_LENGTH = 6;
const MAX_TYPOS = 2;

export function splitLines(text: string) {
  return text.split(text.includes(LINE_SEPARATOR) ? LINE_SEPARATOR : /\r?\n/).map((line) => line.replace(/\s+$/, ''));
}

// A single Longshanks list record can contain several lists, each closed by a TOTAL POINTS line.
export function parseArmyLists(text: string): ParsedList[] {
  const result: ParsedList[] = [];

  let block: string[] = [];
  for (const line of splitLines(text)) {
    if (block.length === 0 && !line.trim()) {
      continue;
    }

    block.push(line);

    if (TOTAL_POINTS.test(line.trim())) {
      result.push(parseArmyList(block));
      block = [];
    }
  }

  if (block.some((line) => line.trim())) {
    result.push(parseArmyList(block));
  }

  return result;
}

function parseArmyList(lines: string[]): ParsedList {
  const list: ParsedList = {
    title: '',
    faction: null,
    army: null,
    format: null,
    pointLevel: null,
    totalPoints: null,
    caster: null,
    entries: [],
    commandCards: [],
    warnings: [],
    rawText: lines.join('\n').trim(),
  };

  const rawEntries: { name: string; points: number | null; column: number }[] = [];

  let section: 'header' | 'cards' | 'commands' = 'header';
  const headerLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const total = TOTAL_POINTS.exec(trimmed);
    if (total) {
      list.totalPoints = parseInt(total[1], 10);
      continue;
    }

    if (CARD_HEADER.test(trimmed)) {
      section = 'cards';
      continue;
    }

    if (COMMAND_CARD_HEADER.test(trimmed)) {
      section = 'commands';
      continue;
    }

    if (section === 'header') {
      headerLines.push(trimmed);

      // Some exports have no card header, the entries start right after the format line.
      if (FORMAT_LINE.test(trimmed)) {
        section = 'cards';
      }
    } else if (section === 'commands') {
      list.commandCards.push(trimmed);
    } else {
      const match = ENTRY_LINE.exec(line);
      if (match) {
        const [, points, name] = match;
        rawEntries.push({ name, points: points ? parseInt(points, 10) : null, column: line.indexOf(name) });
      }
    }
  }

  parseHeader(headerLines, list);

  if (rawEntries.length === 0) {
    list.warnings.push('No entries found.');
    return list;
  }

  let minColumn = Number.MAX_SAFE_INTEGER;
  for (const { column } of rawEntries) {
    minColumn = Math.min(minColumn, column);
  }

  const nameCounts = countBaseNames(rawEntries.map(({ name }) => name));

  for (const { name, points, column } of rawEntries) {
    list.entries.push({
      name,
      baseName: toBaseName(name, nameCounts),
      points,
      depth: Math.max(0, Math.round((column - minColumn) / INDENT_WIDTH)),
      kind: MODULE_NAME.test(name) ? 'module' : 'model',
    });
  }

  const leader = findLeader(list.entries);
  if (leader) {
    leader.kind = 'leader';
    list.caster = leader.name;
  } else {
    list.warnings.push('No leader found.');
  }

  return list;
}

// Some armies list free deployables (Trapdoors, crates) before the caster, so the leader is the last free top level
// entry before the first entry that costs points.
function findLeader(entries: ParsedListEntry[]) {
  let leader: ParsedListEntry | undefined;
  for (const entry of entries) {
    if (entry.kind === 'module') {
      continue;
    }

    if (entry.points !== null) {
      break;
    }

    if (entry.depth === 0) {
      leader = entry;
    }
  }

  return leader ?? entries.find(({ depth, kind }) => depth === 0 && kind !== 'module');
}

function parseHeader(headerLines: string[], list: ParsedList) {
  const textLines: string[] = [];
  for (const line of headerLines) {
    const format = FORMAT_LINE.exec(line);
    if (format) {
      list.format = format[1];
      list.pointLevel = parseInt(format[2], 10);
    } else {
      textLines.push(line);
    }
  }

  // The title is optional and players sometimes add lines like "OR" between lists, so the faction line is found by its pattern.
  let factionIndex = -1;
  for (let i = textLines.length - 1; i >= 0; i--) {
    if (textLines[i].indexOf(' - ') > 0) {
      factionIndex = i;
      break;
    }
  }

  if (factionIndex < 0) {
    list.title = textLines[0] ?? '';
    list.warnings.push('No faction line found.');
    return;
  }

  const factionLine = textLines[factionIndex];
  const separator = factionLine.indexOf(' - ');

  list.title = factionIndex > 0 ? textLines[factionIndex - 1] : factionLine;
  list.faction = factionLine.substring(0, separator).trim();
  list.army = factionLine.substring(separator + 3).trim();
}

// Duplicates are numbered ("Farrow Sapper 1", "Farrow Sapper 2"), but some names end with a number ("War Boar MMD 47").
// Only strip the number when another entry has the same name without it.
function countBaseNames(names: string[]) {
  const counts = new Map<string, number>();
  for (const name of names) {
    if (NUMBER_SUFFIX.test(name)) {
      const base = name.replace(NUMBER_SUFFIX, '');
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }
  }
  return counts;
}

function toBaseName(name: string, counts: Map<string, number>) {
  if (!NUMBER_SUFFIX.test(name)) {
    return name;
  }

  const base = name.replace(NUMBER_SUFFIX, '');
  return (counts.get(base) ?? 0) > 1 ? base : name;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Longshanks shows the leader of a game, e.g. "Ashmael, Keeper of Whispers", the list shows the same name with small differences.
export function isSameCaster(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) {
    return false;
  }

  if (left === right || left.startsWith(right) || right.startsWith(left)) {
    return true;
  }

  // Names are typed by hand, e.g. "Captain Raef Huxely" in Longshanks and "Captain Raef Huxley" in the list.
  const leftName = normalize(a.split(',')[0]);
  const rightName = normalize(b.split(',')[0]);

  return leftName.length >= MIN_FUZZY_LENGTH && editDistance(leftName, rightName) <= MAX_TYPOS;
}

function editDistance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost));
    }
    previous = current;
  }

  return previous[b.length];
}
