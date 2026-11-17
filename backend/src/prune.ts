import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import AppDataSource from './domain/database/data-source';

// Runs without the Nest application, so the database is not migrated and seeded right before it is dropped.
async function prune() {
  const logger = new Logger('Prune');

  await AppDataSource.initialize();
  try {
    await AppDataSource.dropDatabase();
    logger.log('Dropped all tables. Migrations and the catalog are applied again on the next start.');
  } finally {
    await AppDataSource.destroy();
  }
}

prune().catch((error) => {
  console.error('Prune failed:', error);
  process.exit(1);
});
