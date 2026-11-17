import { existsSync } from 'fs';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { CATALOG_FILE } from 'src/domain/catalog';
import { ModelEntity, ModelRepository } from 'src/domain/database';
import { ImportCatalog } from './use-cases';

// Lists can only be matched to models when the catalog exists, so a new database gets it before the first import.
@Injectable()
export class CatalogSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogSeeder.name);

  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(ModelEntity)
    private readonly models: ModelRepository,
  ) {}

  async onApplicationBootstrap() {
    if ((await this.models.count()) > 0) {
      return;
    }

    if (!existsSync(CATALOG_FILE)) {
      this.logger.warn('No catalog file found, run "npm run crawl -- --catalog" to create it from the wiki.');
      return;
    }

    this.logger.log('Seeding the catalog of factions, armies and models.');
    await this.commandBus.execute(new ImportCatalog());
  }
}
