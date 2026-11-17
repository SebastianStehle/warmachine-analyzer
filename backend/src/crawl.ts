import 'reflect-metadata';
import { parseArgs } from 'util';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CommandBus } from '@nestjs/cqrs';
import { CoreModule } from './domain/database';
import { DiscoverEvents, ImportEvent, ImportShop, ImportsModule, ReparseEvents, UpdateCatalog } from './domain/imports';

const USAGE = `Usage:
  npm run crawl -- --event <id> [--refresh]
  npm run crawl -- --from <YYYY-MM-DD> [--to <YYYY-MM-DD>] [--parallel <events>] [--refresh]
  npm run crawl -- --reparse     re-parse all imported events from stored pages, without downloading
  npm run crawl -- --catalog     load factions, armies and models from the wiki into the catalog file and import it
  npm run crawl -- --catalog --reparse   the same, then re-parse all events so lists use the new catalog
  npm run crawl -- --shop        import the products of the shop and calculate the price of every list`;

@Module({
  imports: [CoreModule, ImportsModule],
})
class CrawlerModule {}

async function crawl() {
  const { values } = parseArgs({
    options: {
      event: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      refresh: { type: 'boolean', default: false },
      parallel: { type: 'string' },
      reparse: { type: 'boolean', default: false },
      catalog: { type: 'boolean', default: false },
      shop: { type: 'boolean', default: false },
    },
  });

  const { event, from, to, refresh, parallel, reparse, catalog, shop } = values;
  if (!event && !from && !reparse && !catalog && !shop) {
    console.log(USAGE);
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(CrawlerModule, { logger: ['log', 'warn', 'error'] });
  const commandBus = app.get(CommandBus);
  const logger = new Logger('Crawler');

  try {
    if (catalog) {
      const { armies, models } = await commandBus.execute(new UpdateCatalog());
      logger.log(`Imported ${armies} armies with ${models} models.`);
    }

    if (shop) {
      const { products, lists } = await commandBus.execute(new ImportShop());
      logger.log(`Imported ${products} products, updated the price of ${lists} lists.`);
    }

    if (reparse) {
      const { reparsed, failed } = await commandBus.execute(new ReparseEvents());
      logger.log(`Re-parsed ${reparsed} events, failed ${failed}.`);
    }

    if (event) {
      const { status, lists, games } = await commandBus.execute(new ImportEvent(parseInt(event, 10), refresh));
      logger.log(`Event ${event}: ${status}, ${lists} lists, ${games} games.`);
    } else if (from) {
      const until = to ?? new Date().toISOString().substring(0, 10);
      const { found, imported, failed } = await commandBus.execute(
        new DiscoverEvents(from, until, refresh, parallel ? parseInt(parallel, 10) : undefined),
      );
      logger.log(`Found ${found} events, imported ${imported}, failed ${failed}.`);
    }
  } finally {
    await app.close();
  }
}

crawl().catch((error) => {
  console.error('Crawl failed:', error);
  process.exit(1);
});
