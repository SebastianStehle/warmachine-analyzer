import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlayerSortField, SortOrder, useClients } from 'src/api';
import { ArmyLink, PageHeader, Pagination, PlayerLink, QueryState, SearchInput, SortHeader } from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { formatPercent } from 'src/lib/format';
import { useServerSort } from 'src/lib/sorting';

const PAGE_SIZE = 50;

export function PlayersPage() {
  const clients = useClients();
  const navigate = useNavigate();
  const { from, to } = useDateRange();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sort, toggle } = useServerSort<PlayerSortField>({ key: 'events', order: 'desc' }, ['name']);

  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? 0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['players', from, to, search, sort, page],
    queryFn: () => clients.players.getPlayers(from, to, page, PAGE_SIZE, search || undefined, sort.order as SortOrder, sort.key),
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
            <div className="panel overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <SortHeader sortKey="name" sort={sort} onSort={toggle}>
                      Player
                    </SortHeader>
                    <th>Main army</th>
                    <SortHeader sortKey="events" sort={sort} onSort={toggle}>
                      Events
                    </SortHeader>
                    <SortHeader sortKey="wins" sort={sort} onSort={toggle}>
                      Record
                    </SortHeader>
                    <SortHeader sortKey="winRate" sort={sort} onSort={toggle}>
                      Win rate
                    </SortHeader>
                    <SortHeader sortKey="lastEvent" sort={sort} onSort={toggle}>
                      Last event
                    </SortHeader>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(({ id, name, mainArmy, events, wins, losses, winRate, lastEventDate }) => (
                    <tr key={id} className="hover:bg-base-200 cursor-pointer" onClick={() => navigate(`/players/${id}`)}>
                      <td className="font-semibold">
                        <PlayerLink id={id}>{name}</PlayerLink>
                      </td>
                      <td>
                        <ArmyLink army={mainArmy} />
                      </td>
                      <td>{events}</td>
                      <td className="whitespace-nowrap tabular-nums">
                        {wins}-{losses}
                      </td>
                      <td>
                        {formatPercent(winRate)} <span className="text-base-content/70 text-xs">({wins + losses} games)</span>
                      </td>
                      <td className="whitespace-nowrap">{lastEventDate ?? '–'}</td>
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
