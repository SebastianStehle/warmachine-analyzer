import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useClients } from 'src/api';
import { QueryState, Share, WinRate } from 'src/components';
import { useDateRange } from 'src/lib/date-range';

type Tab = 'units' | 'casters' | 'matchups';

const TABS: { id: Tab; label: string }[] = [
  { id: 'units', label: 'Models & units' },
  { id: 'casters', label: 'Casters' },
  { id: 'matchups', label: 'Matchups' },
];

export function FactionPage() {
  const { army = '' } = useParams();
  const clients = useClients();
  const { from, to } = useDateRange();
  const [tab, setTab] = useState<Tab>('units');

  const { data, isLoading, error } = useQuery({
    queryKey: ['faction', army, from, to],
    queryFn: () => clients.stats.getFactionDetails(army, from, to),
  });

  const listsLink = (filter: Record<string, string>) => `/lists?${new URLSearchParams({ army, ...filter }).toString()}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/factions">Factions</Link>
          </li>
          <li>{army}</li>
        </ul>
      </div>

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <div className="stats bg-base-100 shadow-sm">
              <div className="stat">
                <div className="stat-title">{data.stats.faction ?? 'Army'}</div>
                <div className="stat-value text-2xl">{army}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Players</div>
                <div className="stat-value text-2xl">{data.stats.players}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Lists</div>
                <div className="stat-value text-2xl">
                  <Link className="link" to={listsLink({})}>
                    {data.stats.lists}
                  </Link>
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Win rate</div>
                <div className="stat-value text-2xl">
                  <WinRate winRate={data.stats.winRate} games={data.stats.games} />
                </div>
              </div>
            </div>

            <div role="tablist" className="tabs tabs-box w-fit">
              {TABS.map(({ id, label }) => (
                <button key={id} role="tab" className={`tab ${tab === id ? 'tab-active' : ''}`} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="card bg-base-100 overflow-x-auto shadow-sm">
              {tab === 'units' && (
                <table className="table-zebra table">
                  <thead>
                    <tr>
                      <th>Model / unit</th>
                      <th>In lists</th>
                      <th>Copies</th>
                      <th>Avg. points</th>
                      <th>Win rate when played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.units.map(({ name, lists, copies, averagePoints, games, winRate }) => (
                      <tr key={name}>
                        <td>
                          <Link className="link link-hover font-semibold" to={listsLink({ unit: name })}>
                            {name}
                          </Link>
                        </td>
                        <td>
                          <Share part={lists} total={data.stats.lists} />
                        </td>
                        <td>{copies}</td>
                        <td>{averagePoints ?? '–'}</td>
                        <td>
                          <WinRate winRate={winRate} games={games} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === 'casters' && (
                <table className="table-zebra table">
                  <thead>
                    <tr>
                      <th>Caster</th>
                      <th>In lists</th>
                      <th>Win rate</th>
                      <th>W / L / D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.casters.map(({ caster, lists, games, wins, losses, draws, winRate }) => (
                      <tr key={caster}>
                        <td>
                          <Link className="link link-hover font-semibold" to={listsLink({ caster })}>
                            {caster}
                          </Link>
                        </td>
                        <td>
                          <Share part={lists} total={data.stats.lists} />
                        </td>
                        <td>
                          <WinRate winRate={winRate} games={games} />
                        </td>
                        <td className="whitespace-nowrap">
                          {wins} / {losses} / {draws}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === 'matchups' && (
                <table className="table-zebra table">
                  <thead>
                    <tr>
                      <th>Against</th>
                      <th>Win rate</th>
                      <th>W / L / D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.matchups.map(({ opponent, games, wins, losses, draws, winRate }) => (
                      <tr key={opponent}>
                        <td>
                          <Link className="link link-hover font-semibold" to={`/factions/${encodeURIComponent(opponent)}`}>
                            {opponent}
                          </Link>
                        </td>
                        <td>
                          <WinRate winRate={winRate} games={games} />
                        </td>
                        <td className="whitespace-nowrap">
                          {wins} / {losses} / {draws}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
