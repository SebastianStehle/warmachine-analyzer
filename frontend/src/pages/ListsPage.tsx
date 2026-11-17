import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ListSortField, SortOrder, useClients } from 'src/api';
import { ArmyLink, EventLink, PageHeader, Pagination, PlayerLink, QueryState, SearchInput, SortHeader } from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { useServerSort } from 'src/lib/sorting';

const PAGE_SIZE = 50;

type FilterKey = 'army' | 'caster' | 'unit' | 'playerId' | 'eventId' | 'search' | 'page';

const FILTER_LABELS: Partial<Record<FilterKey, string>> = {
  caster: 'Caster',
  unit: 'Contains',
  playerId: 'Player',
  eventId: 'Event',
};

export function ListsPage() {
  const clients = useClients();
  const navigate = useNavigate();
  const { from, to } = useDateRange();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sort, toggle } = useServerSort<ListSortField>({ key: 'date', order: 'desc' }, ['event', 'player', 'army', 'caster']);

  const army = searchParams.get('army') ?? undefined;
  const caster = searchParams.get('caster') ?? undefined;
  const unit = searchParams.get('unit') ?? undefined;
  const playerId = searchParams.get('playerId') ? Number(searchParams.get('playerId')) : undefined;
  const eventId = searchParams.get('eventId') ? Number(searchParams.get('eventId')) : undefined;
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? 0);

  const { data: factions } = useQuery({
    queryKey: ['factions', from, to],
    queryFn: () => clients.stats.getFactionStats(from, to),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['lists', from, to, army, caster, unit, playerId, eventId, search, sort, page],
    queryFn: () =>
      clients.lists.getLists(
        from,
        to,
        page,
        PAGE_SIZE,
        search || undefined,
        sort.order as SortOrder,
        sort.key,
        playerId,
        eventId,
        army,
        caster,
        unit,
      ),
    placeholderData: keepPreviousData,
  });

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

  // Shows the name instead of the ID when filtering by player or event.
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
        <select
          className="select select-sm w-auto"
          value={army ?? ''}
          onChange={(event) => setFilter('army', event.target.value)}
        >
          <option value="">All armies</option>
          {factions?.items.map(({ army: name }) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {(Object.keys(FILTER_LABELS) as FilterKey[])
          .filter((key) => searchParams.get(key))
          .map((key) => (
            <button key={key} className="badge badge-primary gap-1" onClick={() => setFilter(key)}>
              {FILTER_LABELS[key]}: {filterValue(key)} ✕
            </button>
          ))}
      </div>

      <QueryState isLoading={isLoading} error={error} isEmpty={data?.total === 0} emptyText="No lists match the filter.">
        {data && (
          <>
            <div className="panel overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <SortHeader sortKey="date" sort={sort} onSort={toggle}>
                      Date
                    </SortHeader>
                    <SortHeader sortKey="event" sort={sort} onSort={toggle}>
                      Event
                    </SortHeader>
                    <SortHeader sortKey="player" sort={sort} onSort={toggle}>
                      Player
                    </SortHeader>
                    <SortHeader sortKey="rank" sort={sort} onSort={toggle}>
                      Placing
                    </SortHeader>
                    <SortHeader sortKey="army" sort={sort} onSort={toggle}>
                      Army
                    </SortHeader>
                    <SortHeader sortKey="caster" sort={sort} onSort={toggle}>
                      Caster
                    </SortHeader>
                    <th>Played</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((list) => (
                    <tr key={list.id} className="hover:bg-base-200 cursor-pointer" onClick={() => navigate(`/lists/${list.id}`)}>
                      <td className="whitespace-nowrap">{list.eventDate}</td>
                      <td>
                        <EventLink id={list.eventId}>{list.eventName}</EventLink>{' '}
                        <span className="text-base-content/70 text-xs">({list.eventPlayers} players)</span>
                      </td>
                      <td>
                        <PlayerLink id={list.playerId}>{list.playerName}</PlayerLink>
                      </td>
                      <td className="whitespace-nowrap">
                        {list.rank ?? '–'}
                        {list.eventWins !== null && (
                          <span className="text-base-content/70 text-xs">
                            {' '}
                            ({list.eventWins}-{list.eventLosses})
                          </span>
                        )}
                      </td>
                      <td>
                        <ArmyLink army={list.army} faction={list.faction} />
                      </td>
                      <td className="font-semibold">{list.caster ?? '–'}</td>
                      <td className="whitespace-nowrap">{list.games > 0 ? `${list.wins} of ${list.games} won` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
