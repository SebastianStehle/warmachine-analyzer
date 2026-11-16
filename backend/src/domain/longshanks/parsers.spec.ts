import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseEventPage, parseGames, parseListTexts, parseResultEventIds, parseRounds, parseStandings } from './parsers';

const fixture = (name: string) => readFileSync(join(__dirname, '../../../test/fixtures', name), 'utf8');

describe('Longshanks parsers', () => {
  it('should parse the event header when the event is finished', () => {
    expect(parseEventPage(fixture('event.html'), 38573)).toEqual({
      id: 38573,
      name: 'Lock & Load US 2026 Steamroller',
      date: '2026-11-07',
      location: '191 West Port Plaza Drive St. Louis, MO 63146, Missouri, United States',
      type: 'Rated tournament',
      playerCount: 37,
      isFinished: true,
    });
  });

  it('should parse players, results and list references from the standings', () => {
    const [first, second, third] = parseStandings(fixture('standings.html'));

    expect(first).toEqual({
      playerId: 64009,
      playerName: 'Decimus',
      rank: 1,
      army: 'Thornfall Alliance',
      tournamentPoints: 5,
      wins: 5,
      losses: 0,
      strengthOfSchedule: 13,
      controlPoints: 30,
      armyPoints: 284,
      listReference: { type: 'record', id: 211921 },
    });
    expect(second.listReference).toEqual({ type: 'player' });
    expect(third.listReference).toBeNull();
  });

  it('should parse games with leaders, scores and byes', () => {
    const html = fixture('games.html');
    const [bye, game] = parseGames(html);

    expect(parseRounds(html)).toEqual([1, 2]);
    expect(bye).toMatchObject({ id: 742216, round: 1, isBye: true });
    expect(game).toEqual({
      id: 742198,
      round: 1,
      table: 1,
      scenario: 'Two Fronts',
      isBye: false,
      sides: [
        {
          playerId: 53020,
          playerName: 'KingWulph',
          army: 'Fane of Nyrro',
          caster: 'Ashmael, Keeper of Whispers',
          result: 'loss',
          controlPoints: 1,
          armyPoints: 15,
        },
        {
          playerId: 59733,
          playerName: 'Balrog Steve',
          army: 'House Kallyss',
          caster: 'Hellyth, Scyir of Nightfall',
          result: 'win',
          controlPoints: 13,
          armyPoints: 60,
        },
      ],
    });
  });

  it('should read the raw list text from both list popups', () => {
    const [record] = parseListTexts(fixture('list-record.html'));
    const players = parseListTexts(fixture('player-lists.html'));

    expect(record.sourceId).toEqual(211921);
    expect(record.text).toContain('Sturm & Drang');
    expect(players.map(({ sourceId }) => sourceId)).toEqual([211771, 211772]);
  });

  it('should only collect links to events of this game system', () => {
    expect(parseResultEventIds(fixture('event.html'))).toEqual([]);
  });
});
