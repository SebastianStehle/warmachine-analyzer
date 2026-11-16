import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useClients } from 'src/api';
import { Pagination, QueryState } from 'src/components';
import { useDateRange } from 'src/lib/date-range';

const PAGE_SIZE = 50;
const FILTERS = ['army', 'caster', 'unit'] as const;

export function ListsPage() {
  const clients = useClients();
  const navigate = useNavigate();
  const { from, to } = useDateRange();
  const [searchParams, setSearchParams] = useSearchParams();

  const army = searchParams.get('army') ?? undefined;
  const caster = searchParams.get('caster') ?? undefined;
  const unit = searchParams.get('unit') ?? undefined;
  const page = Number(searchParams.get('page') ?? 0);

  const { data: factions } = useQuery({
    queryKey: ['factions', from, to],
    queryFn: () => clients.stats.getFactionStats(from, to),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['lists', from, to, army, caster, unit, page],
    queryFn: () => clients.lists.getLists(from, to, page, PAGE_SIZE, army, caster, unit),
    placeholderData: keepPreviousData,
  });

  const setFilter = (key: (typeof FILTERS)[number] | 'page', value?: string) => {
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Lists</h1>

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

        {caster && (
          <button className="badge badge-primary gap-1" onClick={() => setFilter('caster')}>
            Caster: {caster} ✕
          </button>
        )}

        {unit && (
          <button className="badge badge-primary gap-1" onClick={() => setFilter('unit')}>
            Contains: {unit} ✕
          </button>
        )}
      </div>

      <QueryState isLoading={isLoading} error={error} isEmpty={data?.total === 0} emptyText="No lists match the filter.">
        {data && (
          <>
            <div className="card bg-base-100 overflow-x-auto shadow-sm">
              <table className="table-zebra table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Event</th>
                    <th>Player</th>
                    <th>Placing</th>
                    <th>Army</th>
                    <th>Caster</th>
                    <th>Games with this list</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((list) => (
                    <tr key={list.id} className="hover:bg-base-200 cursor-pointer" onClick={() => navigate(`/lists/${list.id}`)}>
                      <td className="whitespace-nowrap">{list.eventDate}</td>
                      <td>
                        {list.eventName} <span className="text-base-content/70 text-xs">({list.eventPlayers} players)</span>
                      </td>
                      <td>{list.playerName}</td>
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
                        <Link
                          className="link link-hover"
                          to={`/factions/${encodeURIComponent(list.army ?? '')}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {list.army}
                        </Link>
                      </td>
                      <td>{list.caster ?? '–'}</td>
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
    </div>
  );
}
