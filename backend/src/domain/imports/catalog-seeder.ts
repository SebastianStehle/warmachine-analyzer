import { existsSync } from 'fs';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { CATALOG_FILE, hashCatalog, readCatalog } from 'src/domain/catalog';
import { ModelEntity, ModelRepository, SettingEntity, SettingRepository } from 'src/domain/database';
import { CATALOG_HASH_KEY } from './parser-version';
import { ImportCatalog } from './use-cases';

// Lists can only be matched to models when the catalog exists, so a new database gets it before the first import. A
// deployment with a changed catalog file imports it as well, the re-parse on startup then uses the new models.
@Injectable()
export class CatalogSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogSeeder.name);

  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(ModelEntity)
    private readonly models: ModelRepository,
    @InjectRepository(SettingEntity)
    private readonly settings: SettingRepository,
  ) {}

  async onApplicationBootstrap() {
    if (!existsSync(CATALOG_FILE)) {
      if ((await this.models.count()) === 0) {
        this.logger.warn('No catalog file found, run "npm run crawl -- --catalog" to create it from the wiki.');
      }
      return;
    }

    const catalog = readCatalog();
    const stored = await this.settings.findOneBy({ key: CATALOG_HASH_KEY });
    if (stored?.value === hashCatalog(catalog) && (await this.models.count()) > 0) {
      return;
    }

    this.logger.log(stored ? 'The catalog file changed, importing it.' : 'Seeding the catalog of factions, armies and models.');
    await this.commandBus.execute(new ImportCatalog(catalog));
  }
}
