import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createIntegrationTest, IntegrationTestContext } from 'test/integration/setup/harness';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readCatalog } from 'src/domain/catalog';
import { ArmyEntity, ArmyListEntity } from 'src/domain/database';
import {
  GetCastersQuery,
  GetListPricesQuery,
  GetListQuery,
  GetListsQuery,
  GetPointLevelsQuery,
  GetShopProductsQuery,
  ListsModule,
} from 'src/domain/lists';
import { LongshanksClient } from 'src/domain/longshanks';
import { ShopClient } from 'src/domain/shop';
import { GetFactionDetailsQuery, GetFactionStatsQuery, StatisticsModule } from 'src/domain/statistics';
import { WikiClient } from 'src/domain/wiki';
import { CatalogSeeder } from './catalog-seeder';
import { ImportEvent, ImportShop, ImportsModule, UpdateCatalog } from './index';

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

const WIKI_INDEXES: Record<string, string> = {
  'Template:Dusk Fane of Nyrro Footer': fixture('wiki/dusk-fane-of-nyrro-footer.html'),
  'Template:Dusk House Kallyss Footer': fixture('wiki/dusk-house-kallyss-footer.html'),
  'Template:Southern Kriels Kithguard Footer': fixture('wiki/southern-kriels-kithguard-footer.html'),
};

// A small product feed in the format of the shop, the parser itself is tested with real products.
const SHOP_PAGE = JSON.stringify({
  products: [
    {
      id: 1,
      title: 'Warmachine: Phantasm',
      handle: 'warmachine-dusk-house-kallyss-phantasm',
      product_type: 'Miniatures',
      tags: ['warmachine-dusk', 'warmachine-house-kallyss'],
      body_html: '<p>Colossal by name and by nature.</p>',
      variants: [{ price: '139.99', available: true }],
      images: [],
    },
    {
      id: 2,
      title: 'Warmachine: Dreadguard Archers',
      handle: 'warmachine-dreadguard-archers',
      product_type: 'Miniatures',
      tags: ['warmachine-dusk', 'warmachine-house-kallyss'],
      body_html: '<p>The Dreadguard Archers are also part of the Dusk House Kallyss Auxiliary Expansion</p>',
      variants: [{ price: '30.99', available: true }],
      images: [],
    },
    {
      id: 3,
      title: 'Warmachine: Phantasm Paint Set',
      handle: 'phantasm-paint-set',
      product_type: 'Paint',
      tags: [],
      body_html: '',
      variants: [{ price: '20.00', available: true }],
      images: [],
    },
  ],
});

describe('Imports', () => {
  let context: IntegrationTestContext;
  let listIdsAfterFirstImport: number[];
  const catalogFile = join(mkdtempSync(join(tmpdir(), 'catalog-')), 'catalog.json');

  const loadListIds = async () => {
    const { items } = await context.queryBus.execute(new GetListsQuery({ page: 0, pageSize: 10 }));
    return items.map(({ id }) => id).sort();
  };

  beforeAll(async () => {
    const client = {
      get: (path: string) => {
        if (!(path in PAGES)) {
          throw new Error(`Unexpected request ${path}`);
        }
        return Promise.resolve(PAGES[path]);
      },
    };

    const wikiClient = {
      getTemplates: () =>
        Promise.resolve(JSON.stringify({ query: { allpages: Object.keys(WIKI_INDEXES).map((title) => ({ title })) } })),
      getRenderedPage: (title: string) =>
        Promise.resolve(JSON.stringify({ parse: { title, text: { '*': WIKI_INDEXES[title] } } })),
      getSections: (title: string) => Promise.resolve(JSON.stringify({ parse: { title, tocdata: { sections: [] } } })),
      getPagesUsingTemplate: () => Promise.resolve(JSON.stringify({ query: { embeddedin: [] } })),
      getPageContents: () => Promise.resolve(JSON.stringify({ query: { pages: [] } })),
      getImageUrls: () => Promise.resolve(JSON.stringify({ query: { pages: [] } })),
    };

    const shopClient = {
      baseUrl: 'https://shop.test',
      currency: 'EUR',
      getProducts: (page: number) => Promise.resolve(page === 1 ? SHOP_PAGE : JSON.stringify({ products: [] })),
    };

    context = await createIntegrationTest({ imports: [ImportsModule, ListsModule, StatisticsModule] }, (builder) =>
      builder
        .overrideProvider(ShopClient)
        .useValue(shopClient)
        .overrideProvider(LongshanksClient)
        .useValue(client)
        .overrideProvider(WikiClient)
        .useValue(wikiClient)
        .overrideProvider(CatalogSeeder)
        .useValue({}),
    );

    await context.commandBus.execute(new UpdateCatalog(catalogFile));
    // Updating the catalog twice must update the models instead of duplicating them.
    await context.commandBus.execute(new UpdateCatalog(catalogFile));

    await context.commandBus.execute(new ImportEvent(EVENT_ID));
    listIdsAfterFirstImport = await loadListIds();

    // Importing twice must replace the data instead of duplicating it.
    await context.commandBus.execute(new ImportEvent(EVENT_ID));

    await context.commandBus.execute(new ImportShop());
    // Importing the event after the shop must calculate the prices again.
    await context.commandBus.execute(new ImportEvent(EVENT_ID));
  });

  afterAll(() => context.close());

  it('should write the catalog file when the catalog is updated', () => {
    const { armies, models } = readCatalog(catalogFile);

    expect(armies.map(({ name, faction }) => ({ name, faction }))).toEqual([
      { name: 'Fane of Nyrro', faction: 'Dusk' },
      { name: 'House Kallyss', faction: 'Dusk' },
      { name: 'Kithguard', faction: 'Southern Kriels' },
    ]);
    expect(models.find(({ name }) => name === 'Ghast')).toMatchObject({ type: 'warjack' });
  });

  it('should link every list to the army of the catalog when an event is imported', async () => {
    const dataSource = context.app.get(DataSource);
    const { id } = await dataSource.getRepository(ArmyEntity).findOneByOrFail({ name: 'House Kallyss' });
    const lists = await dataSource.getRepository(ArmyListEntity).find();

    expect(lists.length).toBeGreaterThan(0);
    expect(lists.map(({ armyId }) => armyId)).toEqual(lists.map(() => id));
  });

  it('should only price a list when the shop sells all of its models', async () => {
    const { items } = await context.queryBus.execute(new GetListsQuery({ unit: 'Phantasm', page: 0, pageSize: 10 }));
    const { list } = await context.queryBus.execute(new GetListQuery(items[0].id));

    const archers = list.entries.filter(({ modelName }) => modelName === 'Dreadguard Archers').length;

    // The products for the models the shop sells are still shown.
    expect(list.products.map(({ title, url, price, quantity }) => ({ title, url, price, quantity }))).toEqual([
      {
        title: 'Warmachine: Phantasm',
        url: 'https://shop.test/products/warmachine-dusk-house-kallyss-phantasm',
        price: 13999,
        quantity: 1,
      },
      {
        title: 'Warmachine: Dreadguard Archers',
        url: 'https://shop.test/products/warmachine-dreadguard-archers',
        price: 3099,
        quantity: archers,
      },
    ]);
    expect(list.price).toBeNull();
    expect(list.currency).toEqual('EUR');
    // Models that are not in the shop and entries that are not in the catalog.
    expect(list.unpricedModels).toEqual(expect.arrayContaining(['Hellyth, Scyir of Nightfall', 'Benkei']));
    expect(items[0].price).toBeNull();
  });

  it('should leave out owned products when the prices are calculated on request', async () => {
    const { items } = await context.queryBus.execute(new GetListsQuery({ unit: 'Phantasm', page: 0, pageSize: 10 }));
    const listId = items[0].id;

    const { products } = await context.queryBus.execute(new GetShopProductsQuery());
    const phantasm = products.find(({ title }) => title === 'Warmachine: Phantasm')!;

    expect(phantasm.models).toEqual([{ name: 'Phantasm', quantity: 1 }]);

    const { prices: withoutCollection } = await context.queryBus.execute(new GetListPricesQuery([listId], []));
    const { prices: withCollection, currency } = await context.queryBus.execute(
      new GetListPricesQuery([listId], [{ shopId: phantasm.shopId, quantity: 1 }]),
    );

    expect(withoutCollection[0].products.map(({ title }) => title)).toContain('Warmachine: Phantasm');
    expect(withCollection[0].products.map(({ title }) => title)).not.toContain('Warmachine: Phantasm');
    expect(currency).toEqual('EUR');
  });

  it('should calculate faction stats when an event is imported', async () => {
    const { factions } = await context.queryBus.execute(new GetFactionStatsQuery({}));

    expect(
      factions.map(({ army, players, lists, games, wins, winRate }) => ({ army, players, lists, games, wins, winRate })),
    ).toEqual([
      { army: 'House Kallyss', players: 1, lists: 2, games: 1, wins: 1, winRate: 1 },
      { army: 'Fane of Nyrro', players: 1, lists: 0, games: 1, wins: 0, winRate: 0 },
      { army: 'Kithguard', players: 0, lists: 0, games: 0, wins: 0, winRate: null },
    ]);
  });

  it('should offer the leaders of the catalog as casters when they were never played', async () => {
    const { casters } = await context.queryBus.execute(new GetCastersQuery(['Fane of Nyrro'], {}));

    expect(casters.map(({ caster, lists }) => [caster, lists])).toEqual([
      ['Ashmael, Keeper of Whispers', 0],
      ['Auricant Vorsalys', 0],
      ['Harasheth, The Gorged Darkness', 0],
      ['Hysene, the Executioner', 0],
      ['Nymara, The Shadowblade', 0],
    ]);
  });

  it('should filter lists by the point levels that were played', async () => {
    const { pointLevels } = await context.queryBus.execute(new GetPointLevelsQuery({}));
    const { items: all } = await context.queryBus.execute(new GetListsQuery({ page: 0, pageSize: 10 }));

    expect(pointLevels).toEqual([{ pointLevel: all[0].pointLevel, lists: all.length }]);

    const { total: matching } = await context.queryBus.execute(
      new GetListsQuery({ pointLevel: [all[0].pointLevel!], page: 0, pageSize: 10 }),
    );
    const { total: other } = await context.queryBus.execute(
      new GetListsQuery({ pointLevel: [all[0].pointLevel! + 1], page: 0, pageSize: 10 }),
    );

    expect(matching).toEqual(all.length);
    expect(other).toEqual(0);
  });

  it('should filter lists by the placing of the player', async () => {
    const { total: all } = await context.queryBus.execute(new GetListsQuery({ page: 0, pageSize: 10 }));
    const { total: topTwo } = await context.queryBus.execute(new GetListsQuery({ maxRank: 2, page: 0, pageSize: 10 }));
    const { total: winners } = await context.queryBus.execute(new GetListsQuery({ maxRank: 1, page: 0, pageSize: 10 }));

    // The only imported lists are from the player who placed second.
    expect(topTwo).toEqual(all);
    expect(winners).toEqual(0);
  });

  // The wiki fixtures have no index for Thornfall Alliance.
  it('should ignore armies that are not in the wiki when an event is imported', async () => {
    const { items, total } = await context.queryBus.execute(new GetListsQuery({ page: 0, pageSize: 10 }));

    expect(total).toEqual(2);
    expect(new Set(items.map(({ army }) => army))).toEqual(new Set(['House Kallyss']));
  });

  it('should keep list IDs when an event is imported again', async () => {
    expect(await loadListIds()).toEqual(listIdsAfterFirstImport);
  });

  it('should link games to the played list by caster', async () => {
    const { details } = await context.queryBus.execute(new GetFactionDetailsQuery('House Kallyss', {}));

    expect(details.stats.faction).toEqual('Dusk');
    expect(details.casters.map(({ caster, lists, games }) => [caster, lists, games])).toEqual([
      ['Hellyth, Scyir of Nightfall', 1, 1],
      ['Morayne, The Blade of Twilight', 1, 0],
      ['Hazaroth, Narcissar of Ruin', 0, 0],
      ['Scyrafael, Nis-Issyr of Desolations', 0, 0],
      ['Tyrus, Nis-Arsyr of Spiders', 0, 0],
    ]);
    expect(details.units.find(({ name }) => name === 'Dreadguard Archers')).toMatchObject({
      lists: 2,
      copies: 3,
      games: 1,
      wins: 1,
    });
    expect(details.units.find(({ name }) => name === 'Ghast')).toMatchObject({ type: 'warjack', lists: 1, copies: 2, games: 0 });
    expect(details.units.find(({ name }) => name === 'Eidolon')).toMatchObject({
      type: 'warjack',
      lists: 0,
      wikiPage: 'Eidolon',
    });
    expect(details.units.find(({ name }) => name === 'Dreadguard Archers')?.type).toEqual('unit');
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

    expect(list.entries[0]).toEqual({
      name: 'Hellyth, Scyir of Nightfall',
      points: null,
      depth: 0,
      kind: 'leader',
      modelName: 'Hellyth, Scyir of Nightfall',
      modelType: 'leader',
      wikiPage: 'Hellyth, Scyir of Nightfall',
    });
    expect(list.playedGames).toEqual([
      {
        round: 1,
        opponentId: 53020,
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
