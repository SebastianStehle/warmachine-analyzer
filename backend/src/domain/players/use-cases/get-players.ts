import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PageRequest, SortRequest, toSearchPattern, toSqlOrder } from 'src/domain/common/query';
import { ArmyEntity, EventEntity, ParticipantEntity, PlayerEntity } from 'src/domain/database';
import { applyDateRange } from 'src/domain/statistics/utils';

export interface PlayerSummary {
  id: number;
  name: string;
  events: number;
  wins: number;
  losses: number;
  winRate: number | null;
  lastEventDate: string | null;
  mainArmy: string | null;
}

export type PlayerSortField = 'name' | 'events' | 'wins' | 'winRate' | 'lastEvent';

export interface PlayerFilter extends PageRequest, SortRequest<PlayerSortField> {
  search?: string;
  from?: string;
  to?: string;
}

const SORT_EXPRESSIONS: Record<PlayerSortField, string> = {
  name: 'pl.name',
  events: 'COUNT(p.id)',
  wins: 'SUM(p.wins)',
  winRate: 'SUM(p.wins) * 1.0 / (SUM(p.wins) + SUM(p.losses) + 0.0001)',
  lastEvent: 'MAX(e.date)',
};

export class GetPlayersQuery extends Query<GetPlayersResult> {
  constructor(public readonly filter: PlayerFilter) {
    super();
  }
}

export class GetPlayersResult {
  constructor(
    public readonly items: PlayerSummary[],
    public readonly total: number,
  ) {}
}

export function toWinRate(wins: number, losses: number) {
  return wins + losses > 0 ? wins / (wins + losses) : null;
}

export async function loadMainArmies(dataSource: DataSource, playerIds: number[], range: { from?: string; to?: string }) {
  const result = new Map<number, string>();
  if (playerIds.length === 0) {
    return result;
  }

  const rows = await applyDateRange(
    dataSource
      .getRepository(ParticipantEntity)
      .createQueryBuilder('p')
      .innerJoin(EventEntity, 'e', 'e.id = p.eventId')
      .innerJoin(ArmyEntity, 'a', 'a.id = p.armyId')
      .select('p.playerId', 'playerId')
      .addSelect('a.name', 'army')
      .addSelect('COUNT(*)', 'events')
      .addSelect('MAX(e.date)', 'lastDate')
      .where('p.playerId IN (:...playerIds)', { playerIds })
      .groupBy('p.playerId')
      .addGroupBy('a.name'),
    'e',
    range,
  ).getRawMany<{ playerId: number; army: string; events: string; lastDate: string }>();

  const best = new Map<number, { events: number; lastDate: string }>();
  for (const { playerId, army, events, lastDate } of rows) {
    const id = Number(playerId);
    const current = best.get(id);
    if (!current || Number(events) > current.events || (Number(events) === current.events && lastDate > current.lastDate)) {
      best.set(id, { events: Number(events), lastDate });
      result.set(id, army);
    }
  }

  return result;
}

@QueryHandler(GetPlayersQuery)
export class GetPlayersHandler implements IQueryHandler<GetPlayersQuery, GetPlayersResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ filter }: GetPlayersQuery): Promise<GetPlayersResult> {
    const { search, sort, order, page, pageSize } = filter;

    const createQuery = () => {
      const query = applyDateRange(
        this.dataSource
          .getRepository(ParticipantEntity)
          .createQueryBuilder('p')
          .innerJoin(EventEntity, 'e', 'e.id = p.eventId')
          .innerJoin(PlayerEntity, 'pl', 'pl.id = p.playerId'),
        'e',
        filter,
      );

      if (search) {
        query.andWhere('LOWER(pl.name) LIKE :search', { search: toSearchPattern(search) });
      }

      return query;
    };

    const count = await createQuery().select('COUNT(DISTINCT p.playerId)', 'count').getRawOne<{ count: string }>();

    const rows = await createQuery()
      .select('pl.id', 'id')
      .addSelect('pl.name', 'name')
      .addSelect('COUNT(p.id)', 'events')
      .addSelect('SUM(p.wins)', 'wins')
      .addSelect('SUM(p.losses)', 'losses')
      .addSelect('MAX(e.date)', 'lastEventDate')
      .groupBy('pl.id')
      .addGroupBy('pl.name')
      .orderBy(SORT_EXPRESSIONS[sort ?? 'events'], toSqlOrder(order, sort === 'name' ? 'asc' : 'desc'))
      .addOrderBy('pl.name', 'ASC')
      .offset(page * pageSize)
      .limit(pageSize)
      .getRawMany<{ id: number; name: string; events: string; wins: string; losses: string; lastEventDate: string | null }>();

    const mainArmies = await loadMainArmies(
      this.dataSource,
      rows.map(({ id }) => Number(id)),
      filter,
    );

    return new GetPlayersResult(
      rows.map(({ id, name, events, wins, losses, lastEventDate }) => ({
        id: Number(id),
        name,
        events: Number(events),
        wins: Number(wins),
        losses: Number(losses),
        winRate: toWinRate(Number(wins), Number(losses)),
        lastEventDate,
        mainArmy: mainArmies.get(Number(id)) ?? null,
      })),
      Number(count?.count ?? 0),
    );
  }
}
