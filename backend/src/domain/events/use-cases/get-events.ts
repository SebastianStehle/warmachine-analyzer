import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PageRequest, SortRequest, toSearchPattern, toSqlOrder } from 'src/domain/common/query';
import { ArmyListEntity, EventEntity } from 'src/domain/database';
import { applyDateRange } from 'src/domain/statistics/utils';

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

export type EventSortField = 'date' | 'name' | 'players' | 'rounds';

export interface EventFilter extends PageRequest, SortRequest<EventSortField> {
  search?: string;
  from?: string;
  to?: string;
}

const SORT_COLUMNS: Record<EventSortField, string> = {
  date: 'e.date',
  name: 'e.name',
  players: 'e.playerCount',
  rounds: 'e.rounds',
};

export class GetEventsQuery extends Query<GetEventsResult> {
  constructor(public readonly filter: EventFilter) {
    super();
  }
}

export class GetEventsResult {
  constructor(
    public readonly items: EventSummary[],
    public readonly total: number,
  ) {}
}

export async function loadListCounts(dataSource: DataSource, eventIds: number[]) {
  const result = new Map<number, number>();
  if (eventIds.length === 0) {
    return result;
  }

  const rows = await dataSource
    .getRepository(ArmyListEntity)
    .createQueryBuilder('l')
    .select('l.eventId', 'eventId')
    .addSelect('COUNT(*)', 'lists')
    .where('l.eventId IN (:...eventIds)', { eventIds })
    .groupBy('l.eventId')
    .getRawMany<{ eventId: number; lists: string }>();

  for (const { eventId, lists } of rows) {
    result.set(Number(eventId), Number(lists));
  }

  return result;
}

export function toEventSummary(event: EventEntity, lists: number): EventSummary {
  const { id, name, date, location, type, playerCount, rounds } = event;

  return { id, name, date, location: location ?? null, type: type ?? null, playerCount, rounds, lists };
}

@QueryHandler(GetEventsQuery)
export class GetEventsHandler implements IQueryHandler<GetEventsQuery, GetEventsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ filter }: GetEventsQuery): Promise<GetEventsResult> {
    const { search, sort, order, page, pageSize } = filter;

    const query = applyDateRange(this.dataSource.getRepository(EventEntity).createQueryBuilder('e'), 'e', filter);

    if (search) {
      query.andWhere('(LOWER(e.name) LIKE :search OR LOWER(e.location) LIKE :search)', {
        search: toSearchPattern(search),
      });
    }

    const [events, total] = await query
      .orderBy(SORT_COLUMNS[sort ?? 'date'], toSqlOrder(order, sort === 'name' ? 'asc' : 'desc'))
      .addOrderBy('e.id', 'DESC')
      .skip(page * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const listCounts = await loadListCounts(
      this.dataSource,
      events.map(({ id }) => id),
    );

    return new GetEventsResult(
      events.map((event) => toEventSummary(event, listCounts.get(event.id) ?? 0)),
      total,
    );
  }
}
