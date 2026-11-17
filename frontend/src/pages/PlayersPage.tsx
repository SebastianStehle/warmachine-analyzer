import { Table } from '@heroui/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { PlayerSortField, SortOrder, useClients } from 'src/api';
import { ArmyLink, PageHeader, Pagination, PlayerLink, QueryState, SearchInput, SortableColumn } from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { formatPercent } from 'src/lib/format';
import { useServerSort } from 'src/lib/sorting';

const PAGE_SIZE = 50;

export function PlayersPage() {
  const clients = useClients();
  const { from, to } = useDateRange();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sort, order, sortDescriptor, onSortChange } = useServerSort<PlayerSortField>(
    { column: 'events', direction: 'descending' },
    ['name'],
  );

  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? 0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['players', from, to, search, sort, order, page],
    queryFn: () => clients.players.getPlayers(from, to, page, PAGE_SIZE, search || undefined, order as SortOrder, sort),
    placeholderData: keepPreviousData,
  });

  const setParam = (key: 'search' | 'page', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key === 'search') {
      next.delete('page');
    }
    setSearchParams(next);
  };

  return (
    <>
      <PageHeader
        kicker="Community"
        title="Players"
        description="Everyone who played in an imported event. Records are taken from the event standings."
        actions={<SearchInput value={search} onChange={(value) => setParam('search', value)} placeholder="Search players" />}
      />

      <QueryState isLoading={isLoading} error={error} isEmpty={data?.total === 0} emptyText="No players match the search.">
        {data && (
          <>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Players" sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
                  <Table.Header>
                    <SortableColumn id="name" isRowHeader>
                      Player
                    </SortableColumn>
                    <Table.Column>Main army</Table.Column>
                    <SortableColumn id="events">Events</SortableColumn>
                    <SortableColumn id="wins">Record</SortableColumn>
                    <SortableColumn id="winRate">Win rate</SortableColumn>
                    <SortableColumn id="lastEvent">Last event</SortableColumn>
                  </Table.Header>
                  <Table.Body>
                    {data.items.map(({ id, name, mainArmy, events, wins, losses, winRate, lastEventDate }) => (
                      <Table.Row key={id} id={id} href={`/players/${id}`} className="cursor-pointer">
                        <Table.Cell className="font-semibold">
                          <PlayerLink id={id}>{name}</PlayerLink>
                        </Table.Cell>
                        <Table.Cell>
                          <ArmyLink army={mainArmy} />
                        </Table.Cell>
                        <Table.Cell>{events}</Table.Cell>
                        <Table.Cell className="whitespace-nowrap tabular-nums">
                          {wins}-{losses}
                        </Table.Cell>
                        <Table.Cell>
                          {formatPercent(winRate)} <span className="text-muted text-xs">({wins + losses} games)</span>
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">{lastEventDate ?? '–'}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={(next) => setParam('page', String(next))} />
          </>
        )}
      </QueryState>
    </>
  );
}
