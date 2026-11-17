import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import {
  ArmyEntity,
  ArmyListEntity,
  GameEntity,
  GamePlayerEntity,
  ListEntryEntity,
  ListProductEntity,
  ModelEntity,
  PlayerEntity,
  ShopProductModelEntity,
} from 'src/domain/database';
import { NOT_SOLD_MODELS } from 'src/domain/shop';
import { ListDetails } from '../interfaces';
import { createListQuery, ListRow, loadCurrency, loadListRecords, toListSummary, toNullableNumber } from './get-lists';

export class GetListQuery extends Query<GetListResult> {
  constructor(public readonly listId: number) {
    super();
  }
}

export class GetListResult {
  constructor(public readonly list: ListDetails) {}
}

@QueryHandler(GetListQuery)
export class GetListHandler implements IQueryHandler<GetListQuery, GetListResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ listId }: GetListQuery): Promise<GetListResult> {
    const row = await createListQuery(this.dataSource).where('l.id = :listId', { listId }).getRawOne<ListRow>();
    if (!row) {
      throw new NotFoundException(`List ${listId} not found.`);
    }

    const list = await this.dataSource.getRepository(ArmyListEntity).findOneByOrFail({ id: listId });

    const entries = await this.dataSource.getRepository(ListEntryEntity).find({
      where: { listId },
      order: { position: 'ASC' },
    });

    const modelIds = entries.map(({ modelId }) => modelId).filter((id): id is number => !!id);
    const models = new Map<number, ModelEntity>();
    if (modelIds.length > 0) {
      for (const model of await this.dataSource.getRepository(ModelEntity).findBy({ id: In(modelIds) })) {
        models.set(model.id, model);
      }
    }

    const games = await this.dataSource
      .getRepository(GamePlayerEntity)
      .createQueryBuilder('gp')
      .innerJoin(GameEntity, 'g', 'g.id = gp.gameId')
      .leftJoin(PlayerEntity, 'o', 'o.id = gp.opponentId')
      .leftJoin(ArmyEntity, 'oa', 'oa.id = gp.opponentArmyId')
      .leftJoin(ModelEntity, 'oc', 'oc.id = gp.opponentCasterId')
      .select('g.round', 'round')
      .addSelect('g.scenario', 'scenario')
      .addSelect('gp.opponentId', 'opponentId')
      .addSelect('o.name', 'opponentName')
      .addSelect('oa.name', 'opponentArmy')
      .addSelect('oc.name', 'opponentCaster')
      .addSelect('gp.result', 'result')
      .addSelect('gp.controlPoints', 'controlPoints')
      .addSelect('gp.armyPoints', 'armyPoints')
      .where('gp.listId = :listId', { listId })
      .orderBy('g.round', 'ASC')
      .getRawMany();

    const records = await loadListRecords(this.dataSource, [listId]);
    const currency = await loadCurrency(this.dataSource);

    const products = await this.dataSource.getRepository(ListProductEntity).find({
      where: { listId },
      relations: { product: true },
      order: { product: { price: 'DESC' } },
    });

    return new GetListResult({
      ...toListSummary(row, records, currency),
      casterImageUrl: (list.casterId && models.get(list.casterId)?.imageUrl) || null,
      format: list.format ?? null,
      rawText: list.rawText,
      commandCards: list.commandCards,
      warnings: list.warnings,
      entries: entries.map(({ name, points, depth, kind, modelId }) => {
        const model = modelId ? models.get(modelId) : undefined;

        return {
          name,
          points: points ?? null,
          depth,
          kind,
          modelName: model?.name ?? null,
          modelType: model?.type ?? null,
          wikiPage: model?.wikiPage ?? null,
        };
      }),
      products: products.map(({ product, quantity }) => ({
        title: product.title,
        url: product.url,
        imageUrl: product.imageUrl,
        price: product.price,
        quantity,
        available: product.available,
      })),
      unpricedModels: currency ? await this.loadUnpricedModels(entries, models) : [],
      playedGames: games.map((game) => ({
        round: Number(game.round),
        opponentId: toNullableNumber(game.opponentId),
        scenario: game.scenario,
        opponentName: game.opponentName,
        opponentArmy: game.opponentArmy,
        opponentCaster: game.opponentCaster,
        result: game.result,
        controlPoints: toNullableNumber(game.controlPoints),
        armyPoints: toNullableNumber(game.armyPoints),
      })),
    });
  }

  private async loadUnpricedModels(entries: ListEntryEntity[], models: Map<number, ModelEntity>) {
    const unmatched = entries.filter(({ kind, modelId }) => kind !== 'module' && !modelId).map(({ name }) => name);

    const modelIds = [
      ...new Set(
        entries
          .filter(({ kind, modelId }) => kind !== 'module' && modelId && !NOT_SOLD_MODELS.includes(models.get(modelId)!.name))
          .map(({ modelId }) => modelId!),
      ),
    ];
    if (modelIds.length === 0) {
      return unmatched;
    }

    const sold = await this.dataSource.getRepository(ShopProductModelEntity).find({
      where: { modelId: In(modelIds) },
      select: { modelId: true },
    });
    const soldIds = new Set(sold.map(({ modelId }) => modelId));

    return [...modelIds.filter((id) => !soldIds.has(id)).map((id) => models.get(id)!.name), ...unmatched];
  }
}
