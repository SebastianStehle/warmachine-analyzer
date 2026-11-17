import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyListEntity, EventEntity } from 'src/domain/database';
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

@QueryHandler(GetCastersQuery)
export class GetCastersHandler implements IQueryHandler<GetCastersQuery, GetCastersResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ armies, range }: GetCastersQuery): Promise<GetCastersResult> {
    const query = applyDateRange(
      this.dataSource
        .getRepository(ArmyListEntity)
        .createQueryBuilder('l')
        .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
        .select('l.caster', 'caster')
        .addSelect('l.army', 'army')
        .addSelect('COUNT(*)', 'lists')
        .where('l.caster IS NOT NULL')
        .groupBy('l.caster')
        .addGroupBy('l.army')
        .orderBy('l.caster', 'ASC'),
      'e',
      range,
    );

    if (armies && armies.length > 0) {
      query.andWhere('l.army IN (:...armies)', { armies });
    }

    const rows = await query.getRawMany<{ caster: string; army: string | null; lists: string }>();

    return new GetCastersResult(rows.map(({ caster, army, lists }) => ({ caster, army, lists: Number(lists) })));
  }
}
