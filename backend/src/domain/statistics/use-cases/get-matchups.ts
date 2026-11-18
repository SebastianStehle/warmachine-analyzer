import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEntity, GameEntity, GamePlayerEntity } from 'src/domain/database';
import { DateRange, GameRecord, MatchupCell, MatchupGroup, MatchupGrouping, MatchupMatrix } from '../interfaces';
import { applyDateRange, byGamesDescending, createRecord, loadArmyNames, RecordRow, selectRecord, toRecord } from '../utils';

export class GetMatchupsQuery extends Query<GetMatchupsResult> {
  constructor(
    public readonly grouping: MatchupGrouping,
    public readonly range: DateRange,
  ) {
    super();
  }
}

export class GetMatchupsResult {
  constructor(public readonly matrix: MatchupMatrix) {}
}

const addRecord = (target: GameRecord | undefined, source: GameRecord) => {
  const { games, wins, losses, draws } = target ?? toRecord();
  return createRecord(games + source.games, wins + source.wins, losses + source.losses, draws + source.draws);
};

@QueryHandler(GetMatchupsQuery)
export class GetMatchupsHandler implements IQueryHandler<GetMatchupsQuery, GetMatchupsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ grouping, range }: GetMatchupsQuery): Promise<GetMatchupsResult> {
    const rows = await selectRecord(
      applyDateRange(
        this.dataSource
          .getRepository(GamePlayerEntity)
          .createQueryBuilder('gp')
          .innerJoin(GameEntity, 'g', 'g.id = gp.gameId')
          .innerJoin(EventEntity, 'e', 'e.id = g.eventId')
          .select('gp.armyId', 'armyId')
          .addSelect('gp.opponentArmyId', 'opponentArmyId')
          .where('gp.armyId IS NOT NULL')
          .andWhere('gp.opponentId IS NOT NULL')
          .andWhere('gp.opponentArmyId IS NOT NULL')
          .andWhere('gp.armyId <> gp.opponentArmyId')
          .groupBy('gp.armyId')
          .addGroupBy('gp.opponentArmyId'),
        'e',
        range,
      ),
      'gp',
    ).getRawMany<{ armyId: number; opponentArmyId: number } & RecordRow>();

    const armies = await loadArmyNames(this.dataSource);
    const groupOf = (armyId: number) => {
      const { name, faction } = armies.get(Number(armyId))!;
      return grouping === 'faction' ? { name: faction ?? name, faction: faction ?? name } : { name, faction };
    };

    const groups = new Map<string, MatchupGroup>();
    const cells = new Map<string, MatchupCell>();

    for (const row of rows) {
      const group = groupOf(row.armyId);
      const opponent = groupOf(row.opponentArmyId);

      // Games between armies of the same faction are mirror matches when grouping by faction.
      if (group.name === opponent.name) {
        continue;
      }

      const record = toRecord(row);
      groups.set(group.name, { ...group, ...addRecord(groups.get(group.name), record) });

      const key = `${group.name}\n${opponent.name}`;
      cells.set(key, { group: group.name, opponent: opponent.name, ...addRecord(cells.get(key), record) });
    }

    return new GetMatchupsResult({
      groups: [...groups.values()].sort((a, b) => byGamesDescending(a, b) || a.name.localeCompare(b.name)),
      cells: [...cells.values()],
    });
  }
}
