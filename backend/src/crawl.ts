import 'reflect-metadata';
import { parseArgs } from 'util';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CommandBus } from '@nestjs/cqrs';
import { CoreModule } from './domain/database';
import { DiscoverEvents, ImportEvent, ImportsModule } from './domain/imports';

const USAGE = `Usage:
  npm run crawl -- --event <id> [--refresh]
  npm run crawl -- --from <YYYY-MM-DD> [--to <YYYY-MM-DD>] [--refresh]`;

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
    },
  });

  const { event, from, to, refresh } = values;
  if (!event && !from) {
    console.log(USAGE);
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(CrawlerModule, { logger: ['log', 'warn', 'error'] });
  const commandBus = app.get(CommandBus);
  const logger = new Logger('Crawler');

  try {
    if (event) {
      const { status, lists, games } = await commandBus.execute(new ImportEvent(parseInt(event, 10), refresh));
      logger.log(`Event ${event}: ${status}, ${lists} lists, ${games} games.`);
    } else {
      const until = to ?? new Date().toISOString().substring(0, 10);
      const { found, imported, failed } = await commandBus.execute(new DiscoverEvents(from!, until, refresh));
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
