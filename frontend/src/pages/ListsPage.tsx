import { Button, Key, ListBox, Select, Table } from '@heroui/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ListSortField, SortOrder, useClients } from 'src/api';
import {
  ArmyLink,
  CasterLink,
  EventLink,
  MultiSelect,
  PageHeader,
  Pagination,
  PlayerLink,
  QueryState,
  SearchInput,
  SortableColumn,
} from 'src/components';
import { useListPrices } from 'src/lib/collection';
import { useDateRange } from 'src/lib/date-range';
import { formatPrice } from 'src/lib/format';
import { useServerSort } from 'src/lib/sorting';
import { texts } from 'src/texts';

const PAGE_SIZE = 50;

type FilterKey = 'unit' | 'playerId' | 'eventId' | 'maxRank' | 'search' | 'page';

const ANY_PLACING = 'any';

const PLACINGS = [
  { maxRank: 1, label: texts.lists.placings.winners },
  { maxRank: 3, label: texts.lists.placings.top3 },
  { maxRank: 4, label: texts.lists.placings.top4 },
  { maxRank: 8, label: texts.lists.placings.top8 },
  { maxRank: 16, label: texts.lists.placings.top16 },
  { maxRank: 32, label: texts.lists.placings.top32 },
];

const FILTER_LABELS: Partial<Record<FilterKey, string>> = {
  unit: texts.lists.contains,
  playerId: texts.common.player,
  eventId: texts.common.event,
};

function formatPoints(totalPoints: number | null, pointLevel: number | null) {
  if (pointLevel === null) {
    return totalPoints ?? '–';
  }

  return `${totalPoints ?? '–'} / ${pointLevel}`;
}

export function ListsPage() {
  const clients = useClients();
  const { from, to } = useDateRange();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sort, order, sortDescriptor, onSortChange } = useServerSort<ListSortField>(
    { column: 'date', direction: 'descending' },
    ['event', 'player', 'army', 'caster'],
  );

  const armies = searchParams.getAll('army');
  const casters = searchParams.getAll('caster');
  const pointLevels = searchParams.getAll('pointLevel');
  const unit = searchParams.get('unit') ?? undefined;
  const playerId = searchParams.get('playerId') ? Number(searchParams.get('playerId')) : undefined;
  const eventId = searchParams.get('eventId') ? Number(searchParams.get('eventId')) : undefined;
  const maxRank = searchParams.get('maxRank') ? Number(searchParams.get('maxRank')) : undefined;
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? 0);

  const { data: factions } = useQuery({
    queryKey: ['factions', from, to],
    queryFn: () => clients.stats.getFactionStats(from, to),
  });

  const { data: casterOptions } = useQuery({
    queryKey: ['casters', from, to, armies],
    queryFn: () => clients.lists.getCasters(from, to, armies.length > 0 ? armies : undefined),
  });

  const { data: pointLevelOptions } = useQuery({
    queryKey: ['point-levels', from, to],
    queryFn: () => clients.lists.getPointLevels(from, to),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['lists', from, to, armies, casters, pointLevels, maxRank, unit, playerId, eventId, search, sort, order, page],
    queryFn: () =>
      clients.lists.getLists(
        from,
        to,
        page,
        PAGE_SIZE,
        search || undefined,
        order as SortOrder,
        sort,
        playerId,
        eventId,
        armies.length > 0 ? armies : undefined,
        casters.length > 0 ? casters : undefined,
        pointLevels.length > 0 ? pointLevels.map(Number) : undefined,
        maxRank,
        unit,
      ),
    placeholderData: keepPreviousData,
  });

  const { data: pricesLeft } = useListPrices(data?.items.map(({ id }) => id) ?? []);
  const priceLeft = new Map(pricesLeft?.items.map(({ listId, price }) => [listId, price]));

  const setMultiFilter = (key: 'army' | 'caster' | 'pointLevel', selected: string[]) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    for (const value of selected) {
      next.append(key, value);
    }
    next.delete('page');
    setSearchParams(next);
  };

  // A caster can be played in several armies, but should only be offered once.
  const casterGroups = new Map<string, string[]>();
  for (const { caster, army } of casterOptions?.items ?? []) {
    casterGroups.set(army, [...(casterGroups.get(army) ?? []), caster]);
  }

  const setFilter = (key: FilterKey, value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') {
      next.delete('page');
    }
    setSearchParams(next);
  };

  const firstItem = data?.items[0];
  const filterValue = (key: FilterKey) => {
    if (key === 'playerId') {
      return firstItem?.playerName ?? playerId;
    }
    if (key === 'eventId') {
      return firstItem?.eventName ?? eventId;
    }
    return searchParams.get(key);
  };

  return (
    <>
      <PageHeader
        kicker={texts.lists.kicker}
        title={texts.common.lists}
        description={texts.lists.description}
        actions={
          <SearchInput
            value={search}
            onChange={(value) => setFilter('search', value)}
            placeholder={texts.lists.searchPlaceholder}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect
          options={factions?.items.map(({ army }) => army) ?? []}
          selected={armies}
          placeholder={texts.common.allArmies}
          onChange={(selected) => setMultiFilter('army', selected)}
        />

        <MultiSelect
          options={[...casterGroups].map(([label, casters]) => ({ label, options: casters }))}
          selected={casters}
          placeholder={texts.lists.allCasters}
          onChange={(selected) => setMultiFilter('caster', selected)}
        />

        <MultiSelect
          options={pointLevelOptions?.items.map(({ pointLevel }) => String(pointLevel)) ?? []}
          selected={pointLevels}
          placeholder={texts.lists.allPointLevels}
          onChange={(selected) => setMultiFilter('pointLevel', selected)}
        />

        <Select
          aria-label={texts.common.placing}
          className="w-40"
          value={maxRank ? String(maxRank) : ANY_PLACING}
          onChange={(key: Key | null) => setFilter('maxRank', key && key !== ANY_PLACING ? String(key) : undefined)}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id={ANY_PLACING} textValue={texts.lists.anyPlacing}>
                {texts.lists.anyPlacing}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {PLACINGS.map(({ maxRank: rank, label }) => (
                <ListBox.Item key={rank} id={String(rank)} textValue={label}>
                  {label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        {(Object.keys(FILTER_LABELS) as FilterKey[])
          .filter((key) => searchParams.get(key))
          .map((key) => (
            <Button key={key} size="sm" variant="secondary" onPress={() => setFilter(key)}>
              {FILTER_LABELS[key]}: {filterValue(key)} ✕
            </Button>
          ))}
      </div>

      <QueryState isLoading={isLoading} error={error} isEmpty={data?.total === 0} emptyText={texts.common.noListsMatch}>
        {data && (
          <>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label={texts.common.lists} sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
                  <Table.Header>
                    <SortableColumn id="date">{texts.common.date}</SortableColumn>
                    <SortableColumn id="event">{texts.common.event}</SortableColumn>
                    <SortableColumn id="player" isRowHeader>
                      {texts.common.player}
                    </SortableColumn>
                    <SortableColumn id="rank">{texts.common.placing}</SortableColumn>
                    <SortableColumn id="army">{texts.common.army}</SortableColumn>
                    <SortableColumn id="caster">{texts.common.caster}</SortableColumn>
                    <SortableColumn id="points">{texts.common.points}</SortableColumn>
                    <Table.Column>{texts.common.played}</Table.Column>
                    <SortableColumn id="price">{pricesLeft ? texts.common.priceLeft : texts.common.price}</SortableColumn>
                  </Table.Header>
                  <Table.Body>
                    {data.items.map((list) => (
                      <Table.Row key={list.id} id={list.id} href={`/lists/${list.id}`} className="cursor-pointer">
                        <Table.Cell className="whitespace-nowrap">{list.eventDate}</Table.Cell>
                        <Table.Cell>
                          <EventLink id={list.eventId}>{list.eventName}</EventLink>{' '}
                          <span className="text-muted text-xs whitespace-nowrap">
                            ({texts.lists.playerCount(list.eventPlayers)})
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <PlayerLink id={list.playerId}>{list.playerName}</PlayerLink>
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          {list.rank ?? '–'}
                          {list.eventWins !== null && (
                            <span className="text-muted text-xs">
                              {' '}
                              ({list.eventWins}-{list.eventLosses})
                            </span>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <ArmyLink army={list.army} faction={list.faction} />
                        </Table.Cell>
                        <Table.Cell className="font-semibold">
                          <CasterLink caster={list.caster} />
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap tabular-nums">
                          {formatPoints(list.totalPoints, list.pointLevel)}
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          {list.games > 0 ? texts.common.wonOf(list.wins, list.games) : '–'}
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap tabular-nums">
                          {priceLeft.has(list.id) ? (
                            <>
                              {formatPrice(priceLeft.get(list.id)!, list.currency)}
                              {list.price !== null && priceLeft.get(list.id) !== list.price && (
                                <span className="text-muted block text-xs line-through">
                                  {formatPrice(list.price, list.currency)}
                                </span>
                              )}
                            </>
                          ) : (
                            formatPrice(list.price, list.currency)
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>

            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              onChange={(next) => setFilter('page', String(next))}
            />
          </>
        )}
      </QueryState>
    </>
  );
}
