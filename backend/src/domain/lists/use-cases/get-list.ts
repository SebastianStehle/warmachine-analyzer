import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyListEntity, GameEntity, GamePlayerEntity, ListEntryEntity, PlayerEntity } from 'src/domain/database';
import { ListDetails } from '../interfaces';
import { createListQuery, ListRow, loadListRecords, toListSummary } from './get-lists';

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

    const games = await this.dataSource
      .getRepository(GamePlayerEntity)
      .createQueryBuilder('gp')
      .innerJoin(GameEntity, 'g', 'g.id = gp.gameId')
      .leftJoin(PlayerEntity, 'o', 'o.id = gp.opponentId')
      .select('g.round', 'round')
      .addSelect('g.scenario', 'scenario')
      .addSelect('o.name', 'opponentName')
      .addSelect('gp.opponentArmy', 'opponentArmy')
      .addSelect('gp.opponentCaster', 'opponentCaster')
      .addSelect('gp.result', 'result')
      .addSelect('gp.controlPoints', 'controlPoints')
      .addSelect('gp.armyPoints', 'armyPoints')
      .where('gp.listId = :listId', { listId })
      .orderBy('g.round', 'ASC')
      .getRawMany();

    const records = await loadListRecords(this.dataSource, [listId]);

    return new GetListResult({
      ...toListSummary(row, records),
      format: list.format ?? null,
      pointLevel: list.pointLevel ?? null,
      rawText: list.rawText,
      commandCards: list.commandCards,
      warnings: list.warnings,
      entries: entries.map(({ name, points, depth, kind }) => ({ name, points: points ?? null, depth, kind })),
      playedGames: games.map(({ round, controlPoints, armyPoints, ...game }) => ({
        ...game,
        round: Number(round),
        controlPoints: controlPoints === null ? null : Number(controlPoints),
        armyPoints: armyPoints === null ? null : Number(armyPoints),
      })),
    });
  }
}
