import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ListEntryEntity, ModelEntity, ShopProductEntity, ShopProductModelEntity } from 'src/domain/database';
import { findCheapestProducts, NOT_SOLD_MODELS, PricedProduct, ProductSelection } from './pricing';

// Keeps the number of query parameters far below the limits of the databases.
const LISTS_PER_QUERY = 1000;

@Injectable()
export class ListPricing {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // Owned products are keyed by the ID of the shop, because the IDs of the database change when the shop is imported again.
  async priceLists(listIds: number[], owned = new Map<string, number>()) {
    const result = new Map<number, ProductSelection>();
    if (listIds.length === 0) {
      return result;
    }

    const products = await this.loadProducts();
    const ownedModels = await this.loadOwnedModels(owned);
    const required = await this.loadRequiredModels(listIds);
    const unmatched = await this.countUnmatchedEntries(listIds);

    for (const listId of listIds) {
      const missing = new Map<number, number>();
      for (const [modelId, count] of required.get(listId) ?? []) {
        const left = count - (ownedModels.get(modelId) ?? 0);
        if (left > 0) {
          missing.set(modelId, left);
        }
      }

      const selection =
        missing.size > 0 ? await findCheapestProducts(missing, products) : { price: 0, products: [], unpricedModels: 0 };
      const unpricedModels = selection.unpricedModels + (unmatched.get(listId) ?? 0);

      // A price for a part of the list looks like a cheap list, so lists only get a price when every model is covered.
      result.set(listId, { ...selection, price: unpricedModels === 0 ? selection.price : null, unpricedModels });
    }

    return result;
  }

  // Entries that are not in the catalog count as missing, because nobody can tell whether the collection contains them.
  async countMissingModels(listIds: number[], owned: Map<string, number>) {
    const result = new Map<number, number>();
    if (listIds.length === 0) {
      return result;
    }

    const ownedModels = await this.loadOwnedModels(owned);

    for (let start = 0; start < listIds.length; start += LISTS_PER_QUERY) {
      const chunk = listIds.slice(start, start + LISTS_PER_QUERY);
      const required = await this.loadRequiredModels(chunk);
      const unmatched = await this.countUnmatchedEntries(chunk);

      for (const listId of chunk) {
        let missing = unmatched.get(listId) ?? 0;
        for (const [modelId, count] of required.get(listId) ?? []) {
          missing += Math.max(0, count - (ownedModels.get(modelId) ?? 0));
        }
        result.set(listId, missing);
      }
    }

    return result;
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

  private async loadOwnedModels(owned: Map<string, number>) {
    const result = new Map<number, number>();
    if (owned.size === 0) {
      return result;
    }

    const contents = await this.dataSource
      .getRepository(ShopProductModelEntity)
      .createQueryBuilder('spm')
      .innerJoin(ShopProductEntity, 'p', 'p.id = spm.productId')
      .select('p.shopId', 'shopId')
      .addSelect('spm.modelId', 'modelId')
      .addSelect('spm.quantity', 'quantity')
      .where('p.shopId IN (:...shopIds)', { shopIds: [...owned.keys()] })
      .getRawMany<{ shopId: string; modelId: number; quantity: number }>();

    for (const { shopId, modelId, quantity } of contents) {
      const id = Number(modelId);
      result.set(id, (result.get(id) ?? 0) + Number(quantity) * (owned.get(shopId) ?? 0));
    }

    return result;
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
