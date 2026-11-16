import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ArmyListEntity,
  EventEntity,
  GamePlayerEntity,
  ListEntryEntity,
  ParticipantEntity,
  PlayerEntity,
} from 'src/domain/database';
import { applyDateRange } from 'src/domain/statistics/utils';
import { ListFilter, ListSummary } from '../interfaces';

export class GetListsQuery extends Query<GetListsResult> {
  constructor(public readonly filter: ListFilter) {
    super();
  }
}

export class GetListsResult {
  constructor(
    public readonly items: ListSummary[],
    public readonly total: number,
  ) {}
}

export interface ListRow {
  id: number;
  title: string;
  faction: string | null;
  army: string | null;
  caster: string | null;
  totalPoints: number | null;
  eventId: number;
  eventName: string;
  eventDate: string;
  eventPlayers: number;
  playerId: number;
  playerName: string;
  rank: number | null;
  eventWins: number | null;
  eventLosses: number | null;
}

export function createListQuery(dataSource: DataSource) {
  return dataSource
    .getRepository(ArmyListEntity)
    .createQueryBuilder('l')
    .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
    .innerJoin(PlayerEntity, 'pl', 'pl.id = l.playerId')
    .leftJoin(ParticipantEntity, 'p', 'p.eventId = l.eventId AND p.playerId = l.playerId')
    .select('l.id', 'id')
    .addSelect('l.title', 'title')
    .addSelect('l.faction', 'faction')
    .addSelect('l.army', 'army')
    .addSelect('l.caster', 'caster')
    .addSelect('l.totalPoints', 'totalPoints')
    .addSelect('e.id', 'eventId')
    .addSelect('e.name', 'eventName')
    .addSelect('e.date', 'eventDate')
    .addSelect('e.playerCount', 'eventPlayers')
    .addSelect('pl.id', 'playerId')
    .addSelect('pl.name', 'playerName')
    .addSelect('p.rank', 'rank')
    .addSelect('p.wins', 'eventWins')
    .addSelect('p.losses', 'eventLosses');
}

export async function loadListRecords(dataSource: DataSource, listIds: number[]) {
  const result = new Map<number, { games: number; wins: number }>();
  if (listIds.length === 0) {
    return result;
  }

  const rows = await dataSource
    .getRepository(GamePlayerEntity)
    .createQueryBuilder('gp')
    .select('gp.listId', 'listId')
    .addSelect('COUNT(*)', 'games')
    .addSelect(`SUM(CASE WHEN gp.result = 'win' THEN 1 ELSE 0 END)`, 'wins')
    .where('gp.listId IN (:...listIds)', { listIds })
    .andWhere('gp.opponentId IS NOT NULL')
    .groupBy('gp.listId')
    .getRawMany<{ listId: number; games: string; wins: string }>();

  for (const { listId, games, wins } of rows) {
    result.set(Number(listId), { games: Number(games), wins: Number(wins) });
  }

  return result;
}

export function toListSummary(row: ListRow, records: Map<number, { games: number; wins: number }>): ListSummary {
  const { id, eventId, eventPlayers, playerId, rank, eventWins, eventLosses, totalPoints } = row;

  const toNumber = (value: unknown) => (value === null || value === undefined ? null : Number(value));

  return {
    ...row,
    id: Number(id),
    eventId: Number(eventId),
    eventPlayers: Number(eventPlayers),
    playerId: Number(playerId),
    rank: toNumber(rank),
    eventWins: toNumber(eventWins),
    eventLosses: toNumber(eventLosses),
    totalPoints: toNumber(totalPoints),
    games: records.get(Number(id))?.games ?? 0,
    wins: records.get(Number(id))?.wins ?? 0,
  };
}

@QueryHandler(GetListsQuery)
export class GetListsHandler implements IQueryHandler<GetListsQuery, GetListsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ filter }: GetListsQuery): Promise<GetListsResult> {
    const { army, caster, unit, page, pageSize } = filter;

    const query = applyDateRange(createListQuery(this.dataSource), 'e', filter);

    if (army) {
      query.andWhere('l.army = :army', { army });
    }

    if (caster) {
      query.andWhere('l.caster = :caster', { caster });
    }

    if (unit) {
      const withUnit = this.dataSource
        .getRepository(ListEntryEntity)
        .createQueryBuilder('le')
        .select('le.listId')
        .where('le.baseName = :unit');

      query.andWhere(`l.id IN (${withUnit.getQuery()})`, { unit });
    }

    const total = await query.getCount();

    const rows = await query
      .orderBy('e.date', 'DESC')
      .addOrderBy('p.rank', 'ASC')
      .addOrderBy('l.id', 'ASC')
      .offset(page * pageSize)
      .limit(pageSize)
      .getRawMany<ListRow>();

    const records = await loadListRecords(
      this.dataSource,
      rows.map(({ id }) => Number(id)),
    );

    return new GetListsResult(
      rows.map((row) => toListSummary(row, records)),
      total,
    );
  }
}
