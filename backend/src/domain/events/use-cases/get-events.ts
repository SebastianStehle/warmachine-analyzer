import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyListEntity, EventEntity } from 'src/domain/database';

export interface EventSummary {
  id: number;
  name: string;
  date: string;
  location: string | null;
  type: string | null;
  playerCount: number;
  rounds: number;
  lists: number;
}

export class GetEventsQuery extends Query<GetEventsResult> {
  constructor(
    public readonly page: number,
    public readonly pageSize: number,
  ) {
    super();
  }
}

export class GetEventsResult {
  constructor(
    public readonly items: EventSummary[],
    public readonly total: number,
  ) {}
}

@QueryHandler(GetEventsQuery)
export class GetEventsHandler implements IQueryHandler<GetEventsQuery, GetEventsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ page, pageSize }: GetEventsQuery): Promise<GetEventsResult> {
    const [events, total] = await this.dataSource.getRepository(EventEntity).findAndCount({
      order: { date: 'DESC', id: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    const listCounts = new Map<number, number>();
    if (events.length > 0) {
      const rows = await this.dataSource
        .getRepository(ArmyListEntity)
        .createQueryBuilder('l')
        .select('l.eventId', 'eventId')
        .addSelect('COUNT(*)', 'lists')
        .where('l.eventId IN (:...ids)', { ids: events.map(({ id }) => id) })
        .groupBy('l.eventId')
        .getRawMany<{ eventId: number; lists: string }>();

      for (const { eventId, lists } of rows) {
        listCounts.set(Number(eventId), Number(lists));
      }
    }

    return new GetEventsResult(
      events.map(({ id, name, date, location, type, playerCount, rounds }) => ({
        id,
        name,
        date,
        location: location ?? null,
        type: type ?? null,
        playerCount,
        rounds,
        lists: listCounts.get(id) ?? 0,
      })),
      total,
    );
  }
}
