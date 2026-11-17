import { Logger } from '@nestjs/common';
import { Command, CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, Not } from 'typeorm';
import { ShopProductEntity, ShopProductModelEntity } from 'src/domain/database';
import { loadModelMatcher } from 'src/domain/lists/catalog';
import { ModelMatcher } from 'src/domain/lists/model-matcher';
import { parseProductPage, ShopClient, ShopProduct } from 'src/domain/shop';
import { UpdatePrices } from './update-prices';

export class ImportShop extends Command<ImportShopResult> {}

export class ImportShopResult {
  constructor(
    public readonly products: number,
    public readonly lists: number,
  ) {}
}

// The shop calls some models "The Aberration", but other models have "The" in their name, e.g. "The Wretch".
const LEADING_ARTICLE = /^the\s+/i;

@CommandHandler(ImportShop)
export class ImportShopHandler implements ICommandHandler<ImportShop, ImportShopResult> {
  private readonly logger = new Logger(ImportShopHandler.name);

  constructor(
    private readonly client: ShopClient,
    private readonly commandBus: CommandBus,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(): Promise<ImportShopResult> {
    const products: ShopProduct[] = [];
    for (let page = 1; ; page++) {
      const { products: pageProducts, isEmpty } = parseProductPage(await this.client.getProducts(page));
      if (isEmpty) {
        break;
      }
      products.push(...pageProducts);
    }

    if (products.length === 0) {
      throw new Error('The shop returned no products.');
    }

    const matcher = await loadModelMatcher(this.dataSource);
    if (!matcher.hasArmies) {
      throw new Error('The catalog is empty, run "npm run crawl -- --catalog" first.');
    }

    await this.dataSource.transaction(async (manager) => {
      for (const product of products) {
        await manager.upsert(
          ShopProductEntity,
          {
            shopId: product.shopId,
            title: product.title,
            url: `${this.client.baseUrl}/products/${product.handle}`,
            price: product.price,
            currency: this.client.currency,
            available: product.available,
            imageUrl: product.imageUrl,
          },
          ['shopId'],
        );

        const { id: productId } = await manager.findOneByOrFail(ShopProductEntity, { shopId: product.shopId });

        await manager.delete(ShopProductModelEntity, { productId });

        const models = this.matchContents(product, matcher);
        if (models.size > 0) {
          await manager.insert(
            ShopProductModelEntity,
            [...models].map(([modelId, quantity]) => ({ productId, modelId, quantity })),
          );
        }
      }

      // Products that are no longer sold must not be part of a price anymore.
      await manager.delete(ShopProductEntity, { shopId: Not(In(products.map(({ shopId }) => shopId))) });
    });

    this.logger.log(`Imported ${products.length} products from the shop.`);

    const { lists } = await this.commandBus.execute(new UpdatePrices());
    return new ImportShopResult(products.length, lists);
  }

  // The shop tags products with their faction and army, which resolves short names to the right model.
  private matchContents({ armyTags, contents }: ShopProduct, matcher: ModelMatcher) {
    const armies = armyTags.map((tag) => matcher.findArmy(tag)?.name).filter((army) => !!army);

    const result = new Map<number, number>();
    for (const { name, quantity } of contents) {
      const model = [name, name.replace(LEADING_ARTICLE, '')]
        .flatMap((candidate) => [...armies, null].map((army) => matcher.match(candidate, army)))
        .find((match) => !!match);
      if (model) {
        result.set(model.id, (result.get(model.id) ?? 0) + quantity);
      } else {
        this.logger.debug(`No model found for '${name}' in the shop.`);
      }
    }

    return result;
  }
}
