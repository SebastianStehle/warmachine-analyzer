import { Logger } from '@nestjs/common';
import { Command, CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, Not } from 'typeorm';
import { ShopProductEntity, ShopProductModelEntity } from 'src/domain/database';
import { loadModelMatcher } from 'src/domain/lists/catalog';
import { CatalogModel, ModelMatcher } from 'src/domain/lists/model-matcher';
import { parseProductPage, ShopClient, ShopProduct, ShopProductContent } from 'src/domain/shop';
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
// Boxes name a unit together with its attachment, e.g. "Dominated Stormblades & Dominator".
const NAME_PARTS = /\s+&\s+/;

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
        const rows: Pick<ShopProductModelEntity, 'productId' | 'modelId' | 'quantity' | 'choice'>[] = [...models].map(
          ([modelId, quantity]) => ({ productId, modelId, quantity, choice: null }),
        );

        for (const [choice, modelIds] of this.matchChoices(product, matcher).entries()) {
          for (const [modelId, quantity] of modelIds) {
            if (!models.has(modelId)) {
              rows.push({ productId, modelId, quantity, choice });
            }
          }
        }

        if (rows.length > 0) {
          await manager.insert(ShopProductModelEntity, rows);
        }
      }

      // Products that are no longer sold must not be part of a price anymore.
      await manager.delete(ShopProductEntity, { shopId: Not(In(products.map(({ shopId }) => shopId))) });
    });

    this.logger.log(`Imported ${products.length} products from the shop.`);

    const { lists } = await this.commandBus.execute(new UpdatePrices());
    return new ImportShopResult(products.length, lists);
  }

  private matchContents({ armyTags, contents, titleContents }: ShopProduct, matcher: ModelMatcher) {
    const armies = findArmies(armyTags, matcher);

    // Some descriptions name the model differently than the catalog, e.g. "Fane Rider" for "Strygon Rider".
    const result = this.matchNames(contents, armies, matcher);
    return result.size > 0 ? result : this.matchNames(titleContents, armies, matcher);
  }

  private matchChoices({ armyTags, choices }: ShopProduct, matcher: ModelMatcher) {
    const armies = findArmies(armyTags, matcher);

    return choices.map(({ names, quantity }) =>
      this.matchNames(
        names.map((name) => ({ name, quantity })),
        armies,
        matcher,
      ),
    );
  }

  private matchNames(contents: ShopProductContent[], armies: string[], matcher: ModelMatcher) {
    const result = new Map<number, number>();
    for (const { name, quantity } of contents) {
      const models = findModels(name, armies, matcher);
      if (models.size === 0) {
        this.logger.debug(`No model found for '${name}' in the shop.`);
      }

      // Boxes list combined models in parts, e.g. "Baldwin Gearhart" and "Mr Clogg" for "Baldwin Gearhart & Mr. Clogg".
      for (const { id } of models) {
        result.set(id, Math.max(result.get(id) ?? 0, quantity));
      }
    }

    return result;
  }
}

// The shop tags products with their faction and army, which resolves short names to the right model. A product for
// several armies contains the version of each army, e.g. "Lanyssa Ryssyl" for House Kallyss and Fane of Nyrro.
function findArmies(armyTags: string[], matcher: ModelMatcher) {
  const armies = armyTags.map((tag) => matcher.findArmy(tag)?.name).filter((army): army is string => !!army);

  // Some products are only tagged with the faction, e.g. "warmachine-khador", then every army of it is a candidate.
  return armies.length > 0 ? armies : armyTags.flatMap((tag) => matcher.findArmiesOfFaction(tag).map(({ name }) => name));
}

function findModels(name: string, armies: string[], matcher: ModelMatcher) {
  const names = [...new Set([name, name.replace(LEADING_ARTICLE, ''), name.split(NAME_PARTS)[0]])];

  // Titles start with the faction and army, e.g. "Southern Kriels Kithguard Medics", or add the army after a single
  // name, e.g. "Trikhymaerax Shadowflame Shard". Longer starts are often another model, e.g. "Kithguard Infantry".
  const words = name.split(/\s+/);
  const suffixes: string[] = [];
  for (let i = 1; i < words.length; i++) {
    suffixes.push(words.slice(i).join(' '));
  }

  const first = (candidates: string[], find: (candidate: string) => CatalogModel | null) => {
    for (const candidate of candidates) {
      const model = find(candidate);
      if (model) {
        return model;
      }
    }

    return null;
  };

  const models = new Set<CatalogModel>();
  for (const army of armies) {
    const model =
      first(names, (candidate) => matcher.match(candidate, army)) ??
      first(names, (candidate) => matcher.matchEnding(candidate, army)) ??
      first(suffixes, (candidate) => matcher.matchExact(candidate, army) ?? matcher.matchEnding(candidate, army)) ??
      (words.length > 1 ? matcher.matchExact(words[0], army) : null) ??
      first(names, (candidate) => matcher.matchWords(candidate, army));
    if (model) {
      models.add(model);
    }
  }

  if (models.size === 0) {
    const model =
      first(names, (candidate) => matcher.match(candidate, null)) ??
      first(names, (candidate) => matcher.matchEnding(candidate, null)) ??
      first(names, (candidate) => matcher.matchWords(candidate, null));
    if (model) {
      models.add(model);
    }
  }

  return models;
}
