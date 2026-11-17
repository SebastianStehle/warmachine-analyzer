import { Button, Table } from '@heroui/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ListSortField, SortOrder, useClients } from 'src/api';
import {
  ArmyLink,
  EventLink,
  MultiSelect,
  PageHeader,
  Pagination,
  PlayerLink,
  QueryState,
  SearchInput,
  SortableColumn,
} from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { useServerSort } from 'src/lib/sorting';

const PAGE_SIZE = 50;

type FilterKey = 'unit' | 'playerId' | 'eventId' | 'search' | 'page';

const FILTER_LABELS: Partial<Record<FilterKey, string>> = {
  unit: 'Contains',
  playerId: 'Player',
  eventId: 'Event',
};

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
  const unit = searchParams.get('unit') ?? undefined;
  const playerId = searchParams.get('playerId') ? Number(searchParams.get('playerId')) : undefined;
  const eventId = searchParams.get('eventId') ? Number(searchParams.get('eventId')) : undefined;
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['lists', from, to, armies, casters, unit, playerId, eventId, search, sort, order, page],
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
        unit,
      ),
    placeholderData: keepPreviousData,
  });

  const setMultiFilter = (key: 'army' | 'caster', selected: string[]) => {
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
        kicker="Army lists"
        title="Lists"
        description="Every imported list, newest first. Click a row for the full list and the games it was played in."
        actions={
          <SearchInput
            value={search}
            onChange={(value) => setFilter('search', value)}
            placeholder="Search caster, player, event"
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect
          options={factions?.items.map(({ army }) => army) ?? []}
          selected={armies}
          placeholder="All armies"
          onChange={(selected) => setMultiFilter('army', selected)}
        />

        <MultiSelect
          options={[...casterGroups].map(([label, casters]) => ({ label, options: casters }))}
          selected={casters}
          placeholder="All casters"
          onChange={(selected) => setMultiFilter('caster', selected)}
        />

        {(Object.keys(FILTER_LABELS) as FilterKey[])
          .filter((key) => searchParams.get(key))
          .map((key) => (
            <Button key={key} size="sm" variant="secondary" onPress={() => setFilter(key)}>
              {FILTER_LABELS[key]}: {filterValue(key)} ✕
            </Button>
          ))}
      </div>

      <QueryState isLoading={isLoading} error={error} isEmpty={data?.total === 0} emptyText="No lists match the filter.">
        {data && (
          <>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Lists" sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
                  <Table.Header>
                    <SortableColumn id="date">Date</SortableColumn>
                    <SortableColumn id="event">Event</SortableColumn>
                    <SortableColumn id="player" isRowHeader>
                      Player
                    </SortableColumn>
                    <SortableColumn id="rank">Placing</SortableColumn>
                    <SortableColumn id="army">Army</SortableColumn>
                    <SortableColumn id="caster">Caster</SortableColumn>
                    <Table.Column>Played</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.items.map((list) => (
                      <Table.Row key={list.id} id={list.id} href={`/lists/${list.id}`} className="cursor-pointer">
                        <Table.Cell className="whitespace-nowrap">{list.eventDate}</Table.Cell>
                        <Table.Cell>
                          <EventLink id={list.eventId}>{list.eventName}</EventLink>{' '}
                          <span className="text-muted text-xs">({list.eventPlayers} players)</span>
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
                        <Table.Cell className="font-semibold">{list.caster ?? '–'}</Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          {list.games > 0 ? `${list.wins} of ${list.games} won` : '–'}
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
