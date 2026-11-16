import { readFileSync } from 'fs';
import { join } from 'path';
import { createIntegrationTest, IntegrationTestContext } from 'test/integration/setup/harness';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GetListQuery, GetListsQuery, ListsModule } from 'src/domain/lists';
import { LongshanksClient } from 'src/domain/longshanks';
import { GetFactionDetailsQuery, GetFactionStatsQuery, StatisticsModule } from 'src/domain/statistics';
import { ImportEvent, ImportsModule } from './index';

const EVENT_ID = 38573;

const fixture = (name: string) => readFileSync(join(__dirname, '../../../test/fixtures', name), 'utf8');

const PAGES: Record<string, string> = {
  [`/event/${EVENT_ID}/`]: fixture('event.html'),
  [`/events/detail/panel_standings.php?event=${EVENT_ID}&section=player`]: fixture('standings.html'),
  [`/events/detail/panel_games.php?event=${EVENT_ID}&round=1`]: fixture('games.html'),
  [`/events/detail/panel_games.php?event=${EVENT_ID}&round=2`]: '<div id="games"></div>',
  [`/admin/lists/pop_info.php?id=211921&event=${EVENT_ID}`]: fixture('list-record.html'),
  [`/admin/players/pop_info.php?player=59733&event=${EVENT_ID}&tab=list`]: fixture('player-lists.html'),
};

describe('Imports', () => {
  let context: IntegrationTestContext;

  beforeAll(async () => {
    const client = {
      get: (path: string) => {
        if (!(path in PAGES)) {
          throw new Error(`Unexpected request ${path}`);
        }
        return Promise.resolve(PAGES[path]);
      },
    };

    context = await createIntegrationTest({ imports: [ImportsModule, ListsModule, StatisticsModule] }, (builder) =>
      builder.overrideProvider(LongshanksClient).useValue(client),
    );

    await context.commandBus.execute(new ImportEvent(EVENT_ID));
    // Importing twice must replace the data instead of duplicating it.
    await context.commandBus.execute(new ImportEvent(EVENT_ID));
  });

  afterAll(() => context.close());

  it('should calculate faction stats when an event is imported', async () => {
    const { factions } = await context.queryBus.execute(new GetFactionStatsQuery({}));

    expect(
      factions.map(({ army, players, lists, games, wins, winRate }) => ({ army, players, lists, games, wins, winRate })),
    ).toEqual([
      { army: 'House Kallyss', players: 1, lists: 2, games: 1, wins: 1, winRate: 1 },
      { army: 'Thornfall Alliance', players: 1, lists: 2, games: 0, wins: 0, winRate: null },
      { army: 'Fane of Nyrro', players: 1, lists: 0, games: 1, wins: 0, winRate: 0 },
    ]);
  });

  it('should link games to the played list by caster', async () => {
    const { details } = await context.queryBus.execute(new GetFactionDetailsQuery('House Kallyss', {}));

    expect(details.stats.faction).toEqual('Dusk');
    expect(details.casters.map(({ caster, lists, games }) => [caster, lists, games])).toEqual([
      ['Hellyth, Scyir of Nightfall', 1, 1],
      ['Morayne, The Blade of Twilight', 1, 0],
    ]);
    expect(details.units.find(({ name }) => name === 'Dreadguard Archers')).toMatchObject({
      lists: 2,
      copies: 3,
      games: 1,
      wins: 1,
    });
    expect(details.units.find(({ name }) => name === 'Ghast')).toMatchObject({ lists: 1, copies: 2, games: 0 });
    expect(details.matchups).toEqual([{ opponent: 'Fane of Nyrro', games: 1, wins: 1, losses: 0, draws: 0, winRate: 1 }]);
  });

  it('should filter lists by unit and return details with games', async () => {
    const { items, total } = await context.queryBus.execute(new GetListsQuery({ unit: 'Phantasm', page: 0, pageSize: 10 }));

    expect(total).toEqual(1);
    expect(items[0]).toMatchObject({
      caster: 'Hellyth, Scyir of Nightfall',
      playerName: 'Balrog Steve',
      rank: 2,
      games: 1,
      wins: 1,
    });

    const { list } = await context.queryBus.execute(new GetListQuery(items[0].id));

    expect(list.entries[0]).toEqual({ name: 'Hellyth, Scyir of Nightfall', points: null, depth: 0, kind: 'leader' });
    expect(list.playedGames).toEqual([
      {
        round: 1,
        scenario: 'Two Fronts',
        opponentName: 'KingWulph',
        opponentArmy: 'Fane of Nyrro',
        opponentCaster: 'Ashmael, Keeper of Whispers',
        result: 'win',
        controlPoints: 13,
        armyPoints: 60,
      },
    ]);
  });
});
