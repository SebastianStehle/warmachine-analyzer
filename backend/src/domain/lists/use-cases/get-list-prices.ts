import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { ShopProductEntity } from 'src/domain/database';
import { ListPricing } from 'src/domain/shop';
import { ListPrice, OwnedProduct } from '../interfaces';
import { loadCurrency } from './get-lists';

export class GetListPricesQuery extends Query<GetListPricesResult> {
  constructor(
    public readonly listIds: number[],
    public readonly owned: OwnedProduct[],
  ) {
    super();
  }
}

export class GetListPricesResult {
  constructor(
    public readonly prices: ListPrice[],
    public readonly currency: string | null,
  ) {}
}

// The collection of a user is only stored in the browser, so the prices without the owned products are calculated on request.
@QueryHandler(GetListPricesQuery)
export class GetListPricesHandler implements IQueryHandler<GetListPricesQuery, GetListPricesResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly pricing: ListPricing,
  ) {}

  async execute({ listIds, owned }: GetListPricesQuery): Promise<GetListPricesResult> {
    const selections = await this.pricing.priceLists(
      listIds,
      new Map(owned.filter(({ quantity }) => quantity > 0).map(({ shopId, quantity }) => [shopId, quantity])),
    );

    const productIds = [...new Set([...selections.values()].flatMap(({ products }) => products.map(({ id }) => id)))];
    const products = new Map(
      productIds.length > 0
        ? (await this.dataSource.getRepository(ShopProductEntity).findBy({ id: In(productIds) })).map((product) => [
            product.id,
            product,
          ])
        : [],
    );

    const prices = [...selections].map(([listId, { price, products: selected }]) => ({
      listId,
      price,
      products: selected
        .map(({ id, quantity }) => ({ product: products.get(id)!, quantity }))
        .sort((a, b) => b.product.price - a.product.price)
        .map(({ product, quantity }) => ({
          title: product.title,
          url: product.url,
          imageUrl: product.imageUrl,
          price: product.price,
          quantity,
          available: product.available,
        })),
    }));

    return new GetListPricesResult(prices, await loadCurrency(this.dataSource));
  }
}
