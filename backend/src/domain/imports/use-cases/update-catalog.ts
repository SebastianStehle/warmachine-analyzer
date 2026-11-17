import { writeFileSync } from 'fs';
import { Command, CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { buildCatalog, CATALOG_FILE } from 'src/domain/catalog';
import { loadArmyIndexes, WikiClient } from 'src/domain/wiki';
import { ImportCatalog, ImportCatalogResult } from './import-catalog';

export class UpdateCatalog extends Command<ImportCatalogResult> {
  constructor(public readonly file = CATALOG_FILE) {
    super();
  }
}

// The catalog file is committed, so new databases get the catalog without asking the wiki.
@CommandHandler(UpdateCatalog)
export class UpdateCatalogHandler implements ICommandHandler<UpdateCatalog, ImportCatalogResult> {
  constructor(
    private readonly client: WikiClient,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: UpdateCatalog): Promise<ImportCatalogResult> {
    const catalog = buildCatalog(await loadArmyIndexes(this.client));
    if (catalog.armies.length === 0) {
      throw new Error('The wiki returned no army indexes.');
    }

    writeFileSync(command.file, `${JSON.stringify(catalog, null, 2)}\n`);

    return this.commandBus.execute(new ImportCatalog(catalog));
  }
}
