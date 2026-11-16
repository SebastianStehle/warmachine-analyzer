import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { Link, useParams } from 'react-router-dom';
import { ListEntryKind, useClients } from 'src/api';
import { QueryState } from 'src/components';
import { LONGSHANKS_URL } from 'src/lib/format';

const RESULT_BADGES: Record<string, string> = {
  win: 'badge-success',
  loss: 'badge-error',
  draw: 'badge-ghost',
};

export function ListPage() {
  const { id } = useParams();
  const clients = useClients();

  const { data, isLoading, error } = useQuery({
    queryKey: ['list', id],
    queryFn: () => clients.lists.getList(Number(id)),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/lists">Lists</Link>
          </li>
          <li>{data?.title ?? id}</li>
        </ul>
      </div>

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h1 className="card-title text-2xl">{data.title}</h1>
                <p>
                  {data.faction && `${data.faction} – `}
                  <Link className="link" to={`/factions/${encodeURIComponent(data.army ?? '')}`}>
                    {data.army}
                  </Link>
                  {data.format && ` · ${data.format}`}
                  {data.totalPoints !== null && ` · ${data.totalPoints}/${data.pointLevel ?? '?'} pts`}
                </p>

                {data.warnings.length > 0 && (
                  <div role="alert" className="alert alert-warning">
                    <span>{data.warnings.join(' ')}</span>
                  </div>
                )}

                <table className="table-sm table">
                  <tbody>
                    {data.entries.map(({ name, points, depth, kind }, index) => (
                      <tr key={index}>
                        <td style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}>
                          <span
                            className={classNames({
                              'font-bold': kind === ListEntryKind.Leader,
                              'text-base-content/70 text-sm': kind === ListEntryKind.Module,
                            })}
                          >
                            {name}
                          </span>
                        </td>
                        <td className="text-right">{points ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {data.commandCards.length > 0 && <p className="text-sm">Command cards: {data.commandCards.join(', ')}</p>}

                <details className="collapse-arrow bg-base-200 collapse">
                  <summary className="collapse-title text-sm">List as submitted</summary>
                  <pre className="collapse-content overflow-x-auto text-xs">{data.rawText}</pre>
                </details>
              </div>
            </div>

            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">
                  {data.playerName} at{' '}
                  <a className="link" href={`${LONGSHANKS_URL}/event/${data.eventId}/`} target="_blank" rel="noreferrer">
                    {data.eventName}
                  </a>
                </h2>
                <p>
                  {data.eventDate} · Placed {data.rank ?? '–'} of {data.eventPlayers}
                  {data.eventWins !== null && ` · ${data.eventWins}-${data.eventLosses} overall`}
                </p>

                <h3 className="mt-2 font-semibold">Games played with this list</h3>
                {data.playedGames.length === 0 ? (
                  <p className="text-sm">No games could be linked to this list.</p>
                ) : (
                  <table className="table-sm table">
                    <thead>
                      <tr>
                        <th>Round</th>
                        <th>Opponent</th>
                        <th>Scenario</th>
                        <th>Result</th>
                        <th>CP / AP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.playedGames.map((game) => (
                        <tr key={game.round}>
                          <td>{game.round}</td>
                          <td>
                            {game.opponentName ?? 'Bye'}
                            {game.opponentArmy && (
                              <div className="text-base-content/70 text-xs">
                                {game.opponentArmy}
                                {game.opponentCaster && ` – ${game.opponentCaster}`}
                              </div>
                            )}
                          </td>
                          <td>{game.scenario ?? '–'}</td>
                          <td>
                            <span className={`badge ${RESULT_BADGES[game.result]}`}>{game.result}</span>
                          </td>
                          <td className="whitespace-nowrap">
                            {game.controlPoints ?? '–'} / {game.armyPoints ?? '–'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
