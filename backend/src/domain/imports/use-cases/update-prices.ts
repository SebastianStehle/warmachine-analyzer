import { Logger } from '@nestjs/common';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import {
  ArmyListEntity,
  ListEntryEntity,
  ListProductEntity,
  ModelEntity,
  ShopProductEntity,
  ShopProductModelEntity,
} from 'src/domain/database';
import { findCheapestProducts, NOT_SOLD_MODELS, PricedProduct } from 'src/domain/shop';

export class UpdatePrices extends Command<UpdatePricesResult> {
  constructor(public readonly eventId?: number) {
    super();
  }
}

export class UpdatePricesResult {
  constructor(public readonly lists: number) {}
}

@CommandHandler(UpdatePrices)
export class UpdatePricesHandler implements ICommandHandler<UpdatePrices, UpdatePricesResult> {
  private readonly logger = new Logger(UpdatePricesHandler.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ eventId }: UpdatePrices): Promise<UpdatePricesResult> {
    const products = await this.loadProducts();

    const lists = await this.dataSource.getRepository(ArmyListEntity).find({
      where: eventId ? { eventId } : {},
      select: { id: true },
    });
    if (lists.length === 0) {
      return new UpdatePricesResult(0);
    }

    const listIds = lists.map(({ id }) => id);
    const required = await this.loadRequiredModels(listIds);
    const unmatched = await this.countUnmatchedEntries(listIds);

    const selections = new Map<number, Awaited<ReturnType<typeof findCheapestProducts>>>();
    for (const listId of listIds) {
      const selection = await findCheapestProducts(required.get(listId) ?? new Map(), products);
      const unpricedModels = selection.unpricedModels + (unmatched.get(listId) ?? 0);

      // A price for a part of the list looks like a cheap list, so lists only get a price when every model is covered.
      selections.set(listId, { ...selection, price: unpricedModels === 0 ? selection.price : null, unpricedModels });
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ListProductEntity, { listId: In(listIds) });

      for (const [listId, { price, products: selected, unpricedModels }] of selections) {
        await manager.update(ArmyListEntity, listId, { price, unpricedModels });

        if (selected.length > 0) {
          await manager.insert(
            ListProductEntity,
            selected.map(({ id: productId, quantity }) => ({ listId, productId, quantity })),
          );
        }
      }
    });

    this.logger.log(`Updated the prices of ${listIds.length} lists.`);
    return new UpdatePricesResult(listIds.length);
  }

  private async loadProducts() {
    const [products, contents] = await Promise.all([
      this.dataSource.getRepository(ShopProductEntity).find({ select: { id: true, price: true } }),
      this.dataSource.getRepository(ShopProductModelEntity).find(),
    ]);

    const result = new Map<number, PricedProduct>(products.map(({ id, price }) => [id, { id, price, models: new Map() }]));
    for (const { productId, modelId, quantity } of contents) {
      result.get(productId)?.models.set(modelId, quantity);
    }

    return [...result.values()].filter(({ models }) => models.size > 0);
  }

  // Entries that are not in the catalog cannot be bought, but are part of the list. Equipment comes with its model.
  private async countUnmatchedEntries(listIds: number[]) {
    const rows = await this.dataSource
      .getRepository(ListEntryEntity)
      .createQueryBuilder('le')
      .select('le.listId', 'listId')
      .addSelect('COUNT(*)', 'count')
      .where('le.listId IN (:...listIds)', { listIds })
      .andWhere('le.modelId IS NULL')
      .andWhere("le.kind <> 'module'")
      .groupBy('le.listId')
      .getRawMany<{ listId: number; count: string }>();

    return new Map(rows.map(({ listId, count }) => [Number(listId), Number(count)]));
  }

  // Equipment of warjacks and warbeasts comes with the model, so only models count.
  private async loadRequiredModels(listIds: number[]) {
    const entries = await this.dataSource
      .getRepository(ListEntryEntity)
      .createQueryBuilder('le')
      .select('le.listId', 'listId')
      .addSelect('le.modelId', 'modelId')
      .addSelect('COUNT(*)', 'count')
      .innerJoin(ModelEntity, 'm', 'm.id = le.modelId')
      .where('le.listId IN (:...listIds)', { listIds })
      .andWhere("le.kind <> 'module'")
      .andWhere('m.name NOT IN (:...notSold)', { notSold: NOT_SOLD_MODELS })
      .groupBy('le.listId')
      .addGroupBy('le.modelId')
      .getRawMany<{ listId: number; modelId: number; count: string }>();

    const result = new Map<number, Map<number, number>>();
    for (const { listId, modelId, count } of entries) {
      const models = result.get(Number(listId)) ?? new Map<number, number>();
      models.set(Number(modelId), Number(count));
      result.set(Number(listId), models);
    }

    return result;
  }
}
