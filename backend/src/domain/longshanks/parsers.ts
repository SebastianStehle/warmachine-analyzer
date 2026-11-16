import { Cheerio, load } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { GameResult } from 'src/domain/database';

export interface EventInfo {
  id: number;
  name: string;
  date: string;
  location: string | null;
  type: string | null;
  playerCount: number;
  isFinished: boolean;
}

export type ListReference = { type: 'record'; id: number } | { type: 'player' };

export interface Standing {
  playerId: number;
  playerName: string;
  rank: number;
  army: string | null;
  tournamentPoints: number;
  wins: number;
  losses: number;
  strengthOfSchedule: number | null;
  controlPoints: number | null;
  armyPoints: number | null;
  listReference: ListReference | null;
}

export interface GameSide {
  playerId: number | null;
  playerName: string;
  army: string | null;
  caster: string | null;
  result: GameResult;
  controlPoints: number | null;
  armyPoints: number | null;
}

export interface ParsedGame {
  id: number;
  round: number;
  table: number | null;
  scenario: string | null;
  isBye: boolean;
  sides: GameSide[];
}

export interface ListText {
  sourceId: number;
  text: string;
}

const LEADER_SUFFIX = /\s+-\s+.+\s+Leader$/;

const toInt = (value: string | undefined | null) => {
  const match = /-?\d+/.exec(value ?? '');
  return match ? parseInt(match[0], 10) : null;
};

const cleanText = (value: string) => value.replace(/\s+/g, ' ').trim();

const playerIdOf = (element: Cheerio<AnyNode>) => toInt(/pop_user\((\d+)/.exec(element.attr('onclick') ?? '')?.[1]);

export function parseEventPage(html: string, id: number): EventInfo {
  const $ = load(html);

  const detail = (alt: string) => {
    const cell = $(`.event_display .details img[alt="${alt}"]`).closest('tr').find('td').last();
    cell.find('br').replaceWith(', ');
    return cell.length ? cleanText(cell.text()) : null;
  };

  const statusTexts = $('.event_status .entry .text')
    .map((_, element) => cleanText($(element).text()))
    .get();

  const size = detail('Event size') ?? '';
  const playerCount = toInt(/(\d+)\s+(of\s+\d+\s+)?players/i.exec(size)?.[1]) ?? 0;

  return {
    id,
    name: cleanText($('.event_display .event_name span.desktop').first().text() || $('h1').first().text()),
    date: detail('Date') ?? '',
    location: detail('Location'),
    type: statusTexts.find((text) => /tournament|league|event/i.test(text)) ?? null,
    playerCount,
    isFinished: statusTexts.some((text) => text.toLowerCase() === 'finished'),
  };
}

export function parseStandings(html: string): Standing[] {
  const $ = load(html);
  const result: Standing[] = [];

  $('.ranking div.player[id^="player_"]').each((_, element) => {
    const row = $(element);
    const playerId = toInt(row.attr('id'));
    if (!playerId) {
      return;
    }

    const breakers = new Map<string, number | null>();
    row.find('.stat table tr').each((_, tr) => {
      breakers.set(cleanText($(tr).find('th').text()).toUpperCase(), toInt($(tr).find('td').text()));
    });

    result.push({
      playerId,
      playerName: cleanText(row.find('.name a.player_link').first().text()),
      rank: toInt(row.find('.rank > div').first().text()) ?? 0,
      army: row.find('.factions .logo[title]').first().attr('title') ?? null,
      tournamentPoints: toInt(row.find('.stat.skinny').first().text()) ?? 0,
      wins: toInt(row.find('.wins').first().text()) ?? 0,
      losses: toInt(row.find('.loss').first().text()) ?? 0,
      strengthOfSchedule: breakers.get('SOS') ?? null,
      controlPoints: breakers.get('VPS') ?? null,
      armyPoints: breakers.get('APS') ?? null,
      listReference: parseListReference(row.find('.factions img[onclick*="list"]').attr('onclick')),
    });
  });

  return result;
}

function parseListReference(onclick: string | undefined): ListReference | null {
  if (!onclick) {
    return null;
  }

  const record = /pop_list\((\d+)/.exec(onclick);
  if (record) {
    return { type: 'record', id: parseInt(record[1], 10) };
  }

  if (/pop_user\(.*list/.test(onclick)) {
    return { type: 'player' };
  }

  return null;
}

export function parseRounds(html: string) {
  const $ = load(html);
  const rounds: number[] = [];

  $('#round_selector option').each((_, element) => {
    const round = toInt($(element).attr('value'));
    if (round) {
      rounds.push(round);
    }
  });

  return rounds.sort((a, b) => a - b);
}

export function parseGames(html: string): ParsedGame[] {
  const $ = load(html);
  const result: ParsedGame[] = [];

  $('.game[id^="game_"]').each((_, element) => {
    const game = $(element);
    const id = toInt(game.attr('id'));
    if (!id) {
      return;
    }

    const detailValue = (header: string) => {
      const item = game
        .find('.details .item')
        .filter((_, x) => $(x).find('.header').first().text().trim() === header)
        .first();
      return item;
    };

    const roundItem = detailValue('Round');
    const roundText = cleanText(roundItem.text());
    const scenario = detailValue('Scenario').find('span[title]').first().attr('title') ?? null;

    result.push({
      id,
      round: toInt(/Round\s+(\d+)/.exec(roundText)?.[1]) ?? 0,
      table: toInt(/Table\s+(\d+)/.exec(roundText)?.[1]),
      scenario,
      isBye: game.find('.details .header').filter((_, x) => /bye/i.test($(x).text())).length > 0,
      sides: game
        .find('.results > .player')
        .map((_, side) => parseGameSide($(side)))
        .get(),
    });
  });

  return result;
}

function parseGameSide(side: Cheerio<AnyNode>): GameSide {
  const link = side.find('.name a.player_link').first();
  const leaderTitle = side.find('.faction .subfaction[title]').first().attr('title') ?? null;

  let army = side.find('.faction img.logo[title]').first().attr('title') ?? null;
  if (!army && leaderTitle) {
    army = /\s+-\s+(.+)\s+Leader$/.exec(leaderTitle)?.[1] ?? null;
  }

  return {
    playerId: link.length ? playerIdOf(link) : null,
    playerName: cleanText(link.length ? link.text() : side.find('.name').text()),
    army,
    caster: leaderTitle ? leaderTitle.replace(LEADER_SUFFIX, '') : null,
    result: side.hasClass('winner') ? 'win' : side.hasClass('loser') ? 'loss' : 'draw',
    controlPoints: toInt(side.find('.score.vp').first().text()),
    armyPoints: toInt(side.find('.score.ap').first().text()),
  };
}

// Works for both list popups: a single list record and the list tab of a player.
export function parseListTexts(html: string): ListText[] {
  const $ = load(html);
  const result: ListText[] = [];

  $('textarea[id^="list_"]').each((_, element) => {
    const textarea = $(element);
    const sourceId = toInt(textarea.attr('id'));
    if (sourceId) {
      result.push({ sourceId, text: textarea.text() });
    }
  });

  return result;
}

export function parseResultEventIds(html: string) {
  const $ = load(html);
  const ids = new Set<number>();

  $('a[href^="/event/"]').each((_, element) => {
    const id = toInt(/\/event\/(\d+)\//.exec($(element).attr('href') ?? '')?.[1]);
    if (id) {
      ids.add(id);
    }
  });

  return [...ids];
}
