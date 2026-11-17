import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyEntity, ArmyListEntity, ArmyModelEntity, EventEntity, ModelEntity } from 'src/domain/database';
import { DateRange } from 'src/domain/statistics';
import { applyDateRange } from 'src/domain/statistics/utils';
import { CasterOption } from '../interfaces';

export class GetCastersQuery extends Query<GetCastersResult> {
  constructor(
    public readonly armies: string[] | undefined,
    public readonly range: DateRange,
  ) {
    super();
  }
}

export class GetCastersResult {
  constructor(public readonly casters: CasterOption[]) {}
}

// The leaders come from the catalog, the lists only add how often they were played.
@QueryHandler(GetCastersQuery)
export class GetCastersHandler implements IQueryHandler<GetCastersQuery, GetCastersResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ armies, range }: GetCastersQuery): Promise<GetCastersResult> {
    const leaders = this.dataSource
      .getRepository(ModelEntity)
      .createQueryBuilder('m')
      .innerJoin(ArmyModelEntity, 'am', 'am.modelId = m.id')
      .innerJoin(ArmyEntity, 'a', 'a.id = am.armyId')
      .select('m.id', 'casterId')
      .addSelect('m.name', 'caster')
      .addSelect('a.id', 'armyId')
      .addSelect('a.name', 'army')
      .where("m.type = 'leader'")
      .orderBy('m.name', 'ASC')
      .addOrderBy('a.name', 'ASC');

    const lists = applyDateRange(
      this.dataSource
        .getRepository(ArmyListEntity)
        .createQueryBuilder('l')
        .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
        .innerJoin(ArmyEntity, 'a', 'a.id = l.armyId')
        .select('l.casterId', 'casterId')
        .addSelect('l.armyId', 'armyId')
        .addSelect('COUNT(*)', 'lists')
        .where('l.casterId IS NOT NULL')
        .groupBy('l.casterId')
        .addGroupBy('l.armyId'),
      'e',
      range,
    );

    if (armies && armies.length > 0) {
      leaders.andWhere('a.name IN (:...armies)', { armies });
      lists.andWhere('a.name IN (:...armies)', { armies });
    }

    const counts = new Map<string, number>();
    for (const { casterId, armyId, lists: count } of await lists.getRawMany<{
      casterId: number;
      armyId: number;
      lists: string;
    }>()) {
      counts.set(`${casterId}|${armyId}`, Number(count));
    }

    const rows = await leaders.getRawMany<{ casterId: number; caster: string; armyId: number; army: string }>();

    return new GetCastersResult(
      rows.map(({ casterId, caster, armyId, army }) => ({ caster, army, lists: counts.get(`${casterId}|${armyId}`) ?? 0 })),
    );
  }
}
