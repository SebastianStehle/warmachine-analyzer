import { DataSource, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { ArmyEntity, GameResult } from 'src/domain/database';
import { DateRange, GameRecord } from './interfaces';

export function applyDateRange<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  eventAlias: string,
  { from, to }: DateRange,
) {
  if (from) {
    query.andWhere(`${eventAlias}.date >= :from`, { from });
  }

  if (to) {
    query.andWhere(`${eventAlias}.date <= :to`, { to });
  }

  return query;
}

export interface RecordRow {
  games: string;
  wins: string;
  losses: string;
  draws: string;
}

export function selectRecord<T extends ObjectLiteral>(query: SelectQueryBuilder<T>, alias: string) {
  return query
    .addSelect('COUNT(*)', 'games')
    .addSelect(`SUM(CASE WHEN ${alias}.result = 'win' THEN 1 ELSE 0 END)`, 'wins')
    .addSelect(`SUM(CASE WHEN ${alias}.result = 'loss' THEN 1 ELSE 0 END)`, 'losses')
    .addSelect(`SUM(CASE WHEN ${alias}.result = 'draw' THEN 1 ELSE 0 END)`, 'draws');
}

export function toRecord(row?: { games?: unknown; wins?: unknown; losses?: unknown; draws?: unknown }): GameRecord {
  return createRecord(Number(row?.games ?? 0), Number(row?.wins ?? 0), Number(row?.losses ?? 0), Number(row?.draws ?? 0));
}

export function createRecord(games: number, wins: number, losses: number, draws: number): GameRecord {
  return { games, wins, losses, draws, winRate: games > 0 ? (wins + draws / 2) / games : null };
}

export class RecordCounter {
  private games = 0;
  private wins = 0;
  private losses = 0;
  private draws = 0;

  add(result: GameResult) {
    this.games++;
    if (result === 'win') {
      this.wins++;
    } else if (result === 'loss') {
      this.losses++;
    } else {
      this.draws++;
    }
  }

  toRecord() {
    return createRecord(this.games, this.wins, this.losses, this.draws);
  }
}

export const byGamesDescending = (a: { games: number; lists?: number }, b: { games: number; lists?: number }) =>
  (b.lists ?? 0) - (a.lists ?? 0) || b.games - a.games;

export async function loadArmyNames(dataSource: DataSource) {
  const armies = await dataSource.getRepository(ArmyEntity).find({ relations: { faction: true } });
  return new Map(armies.map(({ id, name, faction }) => [id, { name, faction: faction?.name ?? null }]));
}
