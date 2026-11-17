import { Table } from '@heroui/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { EventSortField, SortOrder, useClients } from 'src/api';
import { EventLink, PageHeader, Pagination, QueryState, SearchInput, SortableColumn } from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { useServerSort } from 'src/lib/sorting';

const PAGE_SIZE = 50;

export function EventsPage() {
  const clients = useClients();
  const { from, to } = useDateRange();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sort, order, sortDescriptor, onSortChange } = useServerSort<EventSortField>(
    { column: 'date', direction: 'descending' },
    ['name'],
  );

  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? 0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', from, to, search, sort, order, page],
    queryFn: () => clients.events.getEvents(from, to, page, PAGE_SIZE, search || undefined, order as SortOrder, sort),
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
        kicker="Tournaments"
        title="Events"
        description="All imported events with their final standings."
        actions={
          <SearchInput value={search} onChange={(value) => setParam('search', value)} placeholder="Search name or location" />
        }
      />

      <QueryState isLoading={isLoading} error={error} isEmpty={data?.total === 0}>
        {data && (
          <>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Events" sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
                  <Table.Header>
                    <SortableColumn id="date">Date</SortableColumn>
                    <SortableColumn id="name" isRowHeader>
                      Event
                    </SortableColumn>
                    <Table.Column>Type</Table.Column>
                    <SortableColumn id="players">Players</SortableColumn>
                    <SortableColumn id="rounds">Rounds</SortableColumn>
                    <Table.Column>Lists</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.items.map(({ id, date, name, location, type, playerCount, rounds, lists }) => (
                      <Table.Row key={id} id={id} href={`/events/${id}`} className="cursor-pointer">
                        <Table.Cell className="whitespace-nowrap">{date}</Table.Cell>
                        <Table.Cell>
                          <EventLink id={id}>
                            <span className="font-semibold">{name}</span>
                          </EventLink>
                          {location && <div className="text-muted text-xs">{location}</div>}
                        </Table.Cell>
                        <Table.Cell>{type ?? '–'}</Table.Cell>
                        <Table.Cell>{playerCount}</Table.Cell>
                        <Table.Cell>{rounds}</Table.Cell>
                        <Table.Cell>{lists}</Table.Cell>
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
