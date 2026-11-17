import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EventSortField, SortOrder, useClients } from 'src/api';
import { EventLink, PageHeader, Pagination, QueryState, SearchInput, SortHeader } from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { useServerSort } from 'src/lib/sorting';

const PAGE_SIZE = 50;

export function EventsPage() {
  const clients = useClients();
  const navigate = useNavigate();
  const { from, to } = useDateRange();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sort, toggle } = useServerSort<EventSortField>({ key: 'date', order: 'desc' }, ['name']);

  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? 0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', from, to, search, sort, page],
    queryFn: () => clients.events.getEvents(from, to, page, PAGE_SIZE, search || undefined, sort.order as SortOrder, sort.key),
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
            <div className="panel overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <SortHeader sortKey="date" sort={sort} onSort={toggle}>
                      Date
                    </SortHeader>
                    <SortHeader sortKey="name" sort={sort} onSort={toggle}>
                      Event
                    </SortHeader>
                    <th>Type</th>
                    <SortHeader sortKey="players" sort={sort} onSort={toggle}>
                      Players
                    </SortHeader>
                    <SortHeader sortKey="rounds" sort={sort} onSort={toggle}>
                      Rounds
                    </SortHeader>
                    <th>Lists</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(({ id, date, name, location, type, playerCount, rounds, lists }) => (
                    <tr key={id} className="hover:bg-base-200 cursor-pointer" onClick={() => navigate(`/events/${id}`)}>
                      <td className="whitespace-nowrap">{date}</td>
                      <td>
                        <EventLink id={id}>
                          <span className="font-semibold">{name}</span>
                        </EventLink>
                        {location && <div className="text-base-content/80 text-xs">{location}</div>}
                      </td>
                      <td>{type ?? '–'}</td>
                      <td>{playerCount}</td>
                      <td>{rounds}</td>
                      <td>{lists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={(next) => setParam('page', String(next))} />
          </>
        )}
      </QueryState>
    </>
  );
}
