import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyEntity, ArmyListEntity, EventEntity, ListEntryEntity, ListEntryKind } from 'src/domain/database';
import { DateRange } from 'src/domain/statistics';
import { applyDateRange } from 'src/domain/statistics/utils';
import { UnmatchedEntry } from '../interfaces';

export class GetUnmatchedEntriesQuery extends Query<GetUnmatchedEntriesResult> {
  constructor(public readonly range: DateRange) {
    super();
  }
}

export class GetUnmatchedEntriesResult {
  constructor(public readonly entries: UnmatchedEntry[]) {}
}

// Entries without a model of the catalog have no stats per model and no price, so they point to gaps in the parser or catalog.
@QueryHandler(GetUnmatchedEntriesQuery)
export class GetUnmatchedEntriesHandler implements IQueryHandler<GetUnmatchedEntriesQuery, GetUnmatchedEntriesResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ range }: GetUnmatchedEntriesQuery): Promise<GetUnmatchedEntriesResult> {
    const rows = await applyDateRange(
      this.dataSource
        .getRepository(ListEntryEntity)
        .createQueryBuilder('le')
        .innerJoin(ArmyListEntity, 'l', 'l.id = le.listId')
        .innerJoin(ArmyEntity, 'a', 'a.id = l.armyId')
        .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
        .select('le.baseName', 'name')
        .addSelect('le.kind', 'kind')
        .addSelect('a.name', 'army')
        .addSelect('COUNT(*)', 'entries')
        .addSelect('COUNT(DISTINCT le.listId)', 'lists')
        .addSelect('MAX(e.date)', 'lastSeen')
        .addSelect('MAX(le.listId)', 'exampleListId')
        .where('le.modelId IS NULL')
        // Equipment comes with its model and is never part of the catalog.
        .andWhere("le.kind <> 'module'")
        .groupBy('le.baseName')
        .addGroupBy('le.kind')
        .addGroupBy('a.name'),
      'e',
      range,
    ).getRawMany<{
      name: string;
      kind: ListEntryKind;
      army: string;
      entries: string;
      lists: string;
      lastSeen: string;
      exampleListId: number;
    }>();

    const result = new Map<string, UnmatchedEntry>();
    for (const row of rows) {
      const key = `${row.name}\n${row.kind}`;
      const lastSeen = String(row.lastSeen);
      const exampleListId = Number(row.exampleListId);

      const entry = result.get(key);
      if (!entry) {
        result.set(key, {
          name: row.name,
          kind: row.kind,
          entries: Number(row.entries),
          lists: Number(row.lists),
          armies: [row.army],
          lastSeen,
          exampleListId,
        });
        continue;
      }

      // A list belongs to a single army, so the lists of the armies can be added up.
      entry.entries += Number(row.entries);
      entry.lists += Number(row.lists);
      entry.armies.push(row.army);
      if (lastSeen > entry.lastSeen) {
        entry.lastSeen = lastSeen;
        entry.exampleListId = exampleListId;
      }
    }

    return new GetUnmatchedEntriesResult(
      [...result.values()]
        .map((entry) => ({ ...entry, armies: entry.armies.sort() }))
        .sort((a, b) => b.lists - a.lists || a.name.localeCompare(b.name)),
    );
  }
}
