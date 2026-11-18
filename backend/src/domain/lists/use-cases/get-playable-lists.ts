import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ListPricing } from 'src/domain/shop';
import { OwnedProduct, PlayableList, PlayableListFilter } from '../interfaces';
import {
  createFilteredListQuery,
  createListQuery,
  ListRow,
  loadCurrency,
  loadListRecords,
  toListSummary,
  toNullableNumber,
} from './get-lists';

export class GetPlayableListsQuery extends Query<GetPlayableListsResult> {
  constructor(
    public readonly filter: PlayableListFilter,
    public readonly owned: OwnedProduct[],
  ) {
    super();
  }
}

export class GetPlayableListsResult {
  constructor(
    public readonly items: PlayableList[],
    public readonly total: number,
    public readonly playable: number,
  ) {}
}

// The collection of a user is only stored in the browser, so the missing models are counted on request. Counting is cheap,
// only the lists of the requested page are loaded completely.
@QueryHandler(GetPlayableListsQuery)
export class GetPlayableListsHandler implements IQueryHandler<GetPlayableListsQuery, GetPlayableListsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly pricing: ListPricing,
  ) {}

  async execute({ filter, owned }: GetPlayableListsQuery): Promise<GetPlayableListsResult> {
    const { page, pageSize } = filter;

    const candidates = (
      await createFilteredListQuery(this.dataSource, filter)
        .select('l.id', 'id')
        .addSelect('p.rank', 'rank')
        .addSelect('e.date', 'eventDate')
        .getRawMany<{ id: number; rank: number | null; eventDate: string }>()
    ).map(({ id, rank, eventDate }) => ({ id: Number(id), rank: toNullableNumber(rank), eventDate: String(eventDate) }));

    const missing = await this.pricing.countMissingModels(
      candidates.map(({ id }) => id),
      new Map(owned.filter(({ quantity }) => quantity > 0).map(({ shopId, quantity }) => [shopId, quantity])),
    );

    const sorted = candidates
      .map((candidate) => ({ ...candidate, missingModels: missing.get(candidate.id) ?? 0 }))
      .sort(
        (a, b) =>
          a.missingModels - b.missingModels ||
          (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
          b.eventDate.localeCompare(a.eventDate) ||
          a.id - b.id,
      );

    let playable = 0;
    for (const { missingModels } of sorted) {
      if (missingModels === 0) {
        playable++;
      }
    }

    const pageItems = sorted.slice(page * pageSize, (page + 1) * pageSize);
    const ids = pageItems.map(({ id }) => id);
    if (ids.length === 0) {
      return new GetPlayableListsResult([], sorted.length, playable);
    }

    const rows = await createListQuery(this.dataSource).where('l.id IN (:...ids)', { ids }).getRawMany<ListRow>();
    const rowsById = new Map(rows.map((row) => [Number(row.id), row]));

    const currency = await loadCurrency(this.dataSource);
    const records = await loadListRecords(this.dataSource, ids);

    return new GetPlayableListsResult(
      pageItems.map(({ id, missingModels }) => ({ ...toListSummary(rowsById.get(id)!, records, currency), missingModels })),
      sorted.length,
      playable,
    );
  }
}
