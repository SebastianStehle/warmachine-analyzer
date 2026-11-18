import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { ArmyEntity, ArmyListEntity, ArmyModelEntity, EventEntity, ModelEntity } from 'src/domain/database';
import { CasterStats, DateRange, FactionDetails, MatchupStats } from '../interfaces';
import { createGamesQuery, loadUnitStats } from '../unit-stats';
import { applyDateRange, byGamesDescending, RecordRow, selectRecord, toRecord } from '../utils';
import { loadFactionStats } from './get-faction-stats';

export class GetFactionDetailsQuery extends Query<GetFactionDetailsResult> {
  constructor(
    public readonly army: string,
    public readonly range: DateRange,
  ) {
    super();
  }
}

export class GetFactionDetailsResult {
  constructor(public readonly details: FactionDetails) {}
}

@QueryHandler(GetFactionDetailsQuery)
export class GetFactionDetailsHandler implements IQueryHandler<GetFactionDetailsQuery, GetFactionDetailsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ army: name, range }: GetFactionDetailsQuery): Promise<GetFactionDetailsResult> {
    const army = await this.dataSource.getRepository(ArmyEntity).findOneBy({ name });
    if (!army) {
      throw new NotFoundException(`Army ${name} not found.`);
    }

    const [stats] = await loadFactionStats(this.dataSource, range, army.id);

    const catalog = await this.loadCatalog(army.id);

    const [casters, { units, knownListRecord }, matchups] = await Promise.all([
      this.loadCasters(army.id, range, catalog),
      this.loadUnits(army.id, range, catalog),
      this.loadMatchups(army.id, range),
    ]);

    return new GetFactionDetailsResult({ stats, knownListRecord, casters, units, matchups });
  }

  private gamesQuery(armyId: number, range: DateRange) {
    return createGamesQuery(this.dataSource, { column: 'armyId', id: armyId }, range);
  }

  // The models of the army from the wiki, so that models nobody played yet are shown as well.
  private loadCatalog(armyId: number) {
    return this.dataSource
      .getRepository(ModelEntity)
      .createQueryBuilder('m')
      .innerJoin(ArmyModelEntity, 'am', 'am.modelId = m.id')
      .where('am.armyId = :armyId', { armyId })
      .getMany();
  }

  private async loadCasters(armyId: number, range: DateRange, catalog: ModelEntity[]) {
    const lists = await applyDateRange(
      this.dataSource
        .getRepository(ArmyListEntity)
        .createQueryBuilder('l')
        .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
        .select('l.casterId', 'casterId')
        .addSelect('COUNT(*)', 'lists')
        .where('l.armyId = :armyId', { armyId })
        .andWhere('l.casterId IS NOT NULL')
        .groupBy('l.casterId'),
      'e',
      range,
    ).getRawMany<{ casterId: number; lists: string }>();

    const games = await selectRecord(
      this.gamesQuery(armyId, range).select('gp.casterId', 'casterId').andWhere('gp.casterId IS NOT NULL').groupBy('gp.casterId'),
      'gp',
    ).getRawMany<{ casterId: number } & RecordRow>();

    const leaders = await this.dataSource.getRepository(ModelEntity).findBy({
      id: In([...new Set([...lists, ...games].map(({ casterId }) => casterId))]),
    });

    const result = new Map<number, CasterStats>();
    const getOrCreate = ({ id, name, wikiPage }: ModelEntity) => {
      let stats = result.get(id);
      if (!stats) {
        stats = { caster: name, wikiPage: wikiPage ?? null, lists: 0, ...toRecord() };
        result.set(id, stats);
      }
      return stats;
    };

    const leadersById = new Map(leaders.map((leader) => [leader.id, leader]));
    for (const { casterId, lists: count } of lists) {
      getOrCreate(leadersById.get(casterId)!).lists = Number(count);
    }

    for (const row of games) {
      Object.assign(getOrCreate(leadersById.get(row.casterId)!), toRecord(row));
    }

    for (const model of catalog) {
      if (model.type === 'leader') {
        getOrCreate(model);
      }
    }

    return [...result.values()].sort(byGamesDescending);
  }

  private async loadUnits(armyId: number, range: DateRange, catalog: ModelEntity[]) {
    const { units, knownListRecord } = await loadUnitStats(this.dataSource, { column: 'armyId', id: armyId }, range);

    for (const { name, type, wikiPage } of catalog) {
      if (type !== 'leader' && !units.some((x) => x.name === name)) {
        units.push({
          name,
          type: type ?? null,
          wikiPage: wikiPage ?? null,
          lists: 0,
          copies: 0,
          averagePoints: null,
          ...toRecord(),
          gamesWithout: 0,
          winRateWithout: null,
          impact: null,
        });
      }
    }

    return { units: units.sort(byGamesDescending), knownListRecord };
  }

  private async loadMatchups(armyId: number, range: DateRange) {
    const rows = await selectRecord(
      this.gamesQuery(armyId, range)
        .innerJoin(ArmyEntity, 'o', 'o.id = gp.opponentArmyId')
        .select('o.name', 'opponent')
        .groupBy('o.name'),
      'gp',
    ).getRawMany<{ opponent: string } & RecordRow>();

    const result: MatchupStats[] = rows.map((row) => ({ opponent: row.opponent, ...toRecord(row) }));

    return result.sort(byGamesDescending);
  }
}
