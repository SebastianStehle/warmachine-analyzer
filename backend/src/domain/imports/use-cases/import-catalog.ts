import { Logger } from '@nestjs/common';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { CatalogData, hashCatalog, readCatalog } from 'src/domain/catalog';
import { ArmyEntity, ArmyModelEntity, FactionEntity, ModelEntity, SettingEntity } from 'src/domain/database';
import { CATALOG_HASH_KEY } from '../parser-version';

export class ImportCatalog extends Command<ImportCatalogResult> {
  constructor(public readonly catalog?: CatalogData) {
    super();
  }
}

export class ImportCatalogResult {
  constructor(
    public readonly armies: number,
    public readonly models: number,
  ) {}
}

@CommandHandler(ImportCatalog)
export class ImportCatalogHandler implements ICommandHandler<ImportCatalog, ImportCatalogResult> {
  private readonly logger = new Logger(ImportCatalogHandler.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(command: ImportCatalog): Promise<ImportCatalogResult> {
    const catalog = command.catalog ?? readCatalog();

    await this.dataSource.transaction(async (manager) => {
      await this.save(manager, catalog);
      await manager.save(SettingEntity, { key: CATALOG_HASH_KEY, value: hashCatalog(catalog) });
    });

    this.logger.log(`Imported ${catalog.armies.length} armies with ${catalog.models.length} models.`);
    return new ImportCatalogResult(catalog.armies.length, catalog.models.length);
  }

  private async save(manager: EntityManager, { armies, models }: CatalogData) {
    if (models.length > 0) {
      await manager.upsert(
        ModelEntity,
        // Catalog files written before images were crawled have no image.
        models.map(({ name, type, wikiPage, aliases, imageUrl }) => ({
          name,
          type,
          wikiPage,
          aliases,
          imageUrl: imageUrl ?? null,
        })),
        ['name'],
      );
    }

    const factionNames = [...new Set(armies.map(({ faction }) => faction).filter((faction) => faction !== null))];
    if (factionNames.length > 0) {
      await manager.upsert(
        FactionEntity,
        factionNames.map((name) => ({ name })),
        ['name'],
      );
    }

    const factionIds = await this.loadIds(manager, FactionEntity);
    if (armies.length > 0) {
      await manager.upsert(
        ArmyEntity,
        armies.map(({ name, faction, wikiIndex }) => ({ name, factionId: faction ? factionIds.get(faction)! : null, wikiIndex })),
        ['name'],
      );
    }

    const modelIds = await this.loadIds(manager, ModelEntity);
    const armyIds = await this.loadIds(manager, ArmyEntity);

    const armyModels = armies.flatMap(({ name, models: armyModels }) =>
      armyModels.map(({ name: modelName, isMercenary }) => ({
        armyId: armyIds.get(name)!,
        modelId: modelIds.get(modelName)!,
        isMercenary,
      })),
    );

    await manager.createQueryBuilder().delete().from(ArmyModelEntity).execute();
    if (armyModels.length > 0) {
      await manager.insert(ArmyModelEntity, armyModels);
    }
  }

  private async loadIds(manager: EntityManager, entity: typeof FactionEntity | typeof ArmyEntity | typeof ModelEntity) {
    const rows: { id: number; name: string }[] = await manager.find(entity, { select: { id: true, name: true } });
    return new Map(rows.map(({ id, name }) => [name, id]));
  }
}
