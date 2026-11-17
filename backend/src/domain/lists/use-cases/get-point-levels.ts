import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyListEntity, EventEntity } from 'src/domain/database';
import { DateRange } from 'src/domain/statistics';
import { applyDateRange } from 'src/domain/statistics/utils';
import { PointLevelOption } from '../interfaces';

export class GetPointLevelsQuery extends Query<GetPointLevelsResult> {
  constructor(public readonly range: DateRange) {
    super();
  }
}

export class GetPointLevelsResult {
  constructor(public readonly pointLevels: PointLevelOption[]) {}
}

@QueryHandler(GetPointLevelsQuery)
export class GetPointLevelsHandler implements IQueryHandler<GetPointLevelsQuery, GetPointLevelsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ range }: GetPointLevelsQuery): Promise<GetPointLevelsResult> {
    const rows = await applyDateRange(
      this.dataSource
        .getRepository(ArmyListEntity)
        .createQueryBuilder('l')
        .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
        .select('l.pointLevel', 'pointLevel')
        .addSelect('COUNT(*)', 'lists')
        .where('l.pointLevel IS NOT NULL')
        .groupBy('l.pointLevel')
        .orderBy('l.pointLevel', 'ASC'),
      'e',
      range,
    ).getRawMany<{ pointLevel: number; lists: string }>();

    return new GetPointLevelsResult(
      rows.map(({ pointLevel, lists }) => ({ pointLevel: Number(pointLevel), lists: Number(lists) })),
    );
  }
}
