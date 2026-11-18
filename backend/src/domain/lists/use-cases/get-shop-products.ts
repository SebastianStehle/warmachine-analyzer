import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ModelEntity, ShopProductEntity, ShopProductModelEntity } from 'src/domain/database';
import { ShopProduct } from '../interfaces';
import { loadCurrency } from './get-lists';

export class GetShopProductsQuery extends Query<GetShopProductsResult> {}

export class GetShopProductsResult {
  constructor(
    public readonly products: ShopProduct[],
    public readonly currency: string | null,
  ) {}
}

// Only products with models are offered, paints and terrain do not change the price of a list.
@QueryHandler(GetShopProductsQuery)
export class GetShopProductsHandler implements IQueryHandler<GetShopProductsQuery, GetShopProductsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(): Promise<GetShopProductsResult> {
    const products = await this.dataSource.getRepository(ShopProductEntity).find({ order: { title: 'ASC' } });

    const contents = await this.dataSource
      .getRepository(ShopProductModelEntity)
      .createQueryBuilder('spm')
      .innerJoin(ModelEntity, 'm', 'm.id = spm.modelId')
      .select('spm.productId', 'productId')
      .addSelect('m.name', 'name')
      .addSelect('spm.quantity', 'quantity')
      .orderBy('m.name', 'ASC')
      .getRawMany<{ productId: number; name: string; quantity: number }>();

    const models = new Map<number, { name: string; quantity: number }[]>();
    for (const { productId, name, quantity } of contents) {
      const id = Number(productId);
      models.set(id, [...(models.get(id) ?? []), { name, quantity: Number(quantity) }]);
    }

    return new GetShopProductsResult(
      products
        .filter(({ id }) => models.has(id))
        .map(({ id, shopId, title, url, imageUrl, price, available }) => ({
          shopId,
          title,
          url,
          imageUrl,
          price,
          available,
          models: models.get(id)!,
        })),
      await loadCurrency(this.dataSource),
    );
  }
}
