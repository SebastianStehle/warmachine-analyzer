import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { Link, useParams } from 'react-router-dom';
import { ListEntryKind, useClients } from 'src/api';
import { ArmyLink, EventLink, PageHeader, PlayerLink, QueryState } from 'src/components';
import { LONGSHANKS_URL } from 'src/lib/factions';
import { usePreferences } from 'src/lib/preferences';

const RESULT_BADGES: Record<string, string> = {
  win: 'badge-success',
  loss: 'badge-error',
  draw: 'badge-ghost',
};

export function ListPage() {
  const { id } = useParams();
  const clients = useClients();
  const { showEquipment, setShowEquipment } = usePreferences();

  const { data, isLoading, error } = useQuery({
    queryKey: ['list', id],
    queryFn: () => clients.lists.getList(Number(id)),
  });

  const hasEquipment = data?.entries.some(({ kind }) => kind === ListEntryKind.Module) ?? false;
  const entries = (data?.entries ?? []).filter(({ kind }) => showEquipment || kind !== ListEntryKind.Module);

  return (
    <>
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
          <>
            <PageHeader
              kicker={<ArmyLink army={data.army} faction={data.faction} />}
              title={data.caster ?? data.title}
              description={
                <>
                  “{data.title}” by <PlayerLink id={data.playerId}>{data.playerName}</PlayerLink> at{' '}
                  <EventLink id={data.eventId}>{data.eventName}</EventLink> ({data.eventDate}) · placed {data.rank ?? '–'} of{' '}
                  {data.eventPlayers}
                  {data.eventWins !== null && `, ${data.eventWins}-${data.eventLosses} overall`}
                </>
              }
            />

            <div className="grid items-start gap-6 lg:grid-cols-2">
              <div className="panel p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold">List</h2>
                  <span className="text-base-content/80 text-sm">
                    {data.format}
                    {data.totalPoints !== null && ` · ${data.totalPoints}/${data.pointLevel ?? '?'} pts`}
                  </span>
                </div>

                {hasEquipment && (
                  <label className="label mt-2 cursor-pointer gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="toggle toggle-sm toggle-primary"
                      checked={showEquipment}
                      onChange={(event) => setShowEquipment(event.target.checked)}
                    />
                    Show equipment
                  </label>
                )}

                {data.warnings.length > 0 && (
                  <div role="alert" className="alert alert-warning mt-3">
                    <span>{data.warnings.join(' ')}</span>
                  </div>
                )}

                <table className="table-sm mt-2 table">
                  <tbody>
                    {entries.map(({ name, points, depth, kind }, index) => (
                      <tr key={index}>
                        <td style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}>
                          <span
                            className={classNames({
                              'text-primary font-bold': kind === ListEntryKind.Leader,
                              'text-base-content/80 italic': kind === ListEntryKind.Module,
                            })}
                          >
                            {name}
                          </span>
                        </td>
                        <td className="text-right tabular-nums">{points ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {data.commandCards.length > 0 && <p className="mt-3 text-sm">Command cards: {data.commandCards.join(', ')}</p>}

                <details className="collapse-arrow bg-base-200 collapse mt-3">
                  <summary className="collapse-title text-sm">List as submitted</summary>
                  <pre className="collapse-content overflow-x-auto text-xs">{data.rawText}</pre>
                </details>
              </div>

              <div className="panel p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold">Games played with this list</h2>
                  <a
                    className="link link-hover text-sm"
                    href={`${LONGSHANKS_URL}/event/${data.eventId}/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Longshanks ↗
                  </a>
                </div>

                {data.playedGames.length === 0 ? (
                  <p className="mt-2 text-sm">No games could be linked to this list.</p>
                ) : (
                  <table className="table-sm mt-2 table">
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
                            <PlayerLink id={game.opponentId}>{game.opponentName ?? 'Bye'}</PlayerLink>
                            {game.opponentArmy && (
                              <div className="text-base-content/80 text-xs">
                                {game.opponentArmy}
                                {game.opponentCaster && ` – ${game.opponentCaster}`}
                              </div>
                            )}
                          </td>
                          <td>{game.scenario ?? '–'}</td>
                          <td>
                            <span className={`badge ${RESULT_BADGES[game.result]}`}>{game.result}</span>
                          </td>
                          <td className="whitespace-nowrap tabular-nums">
                            {game.controlPoints ?? '–'} / {game.armyPoints ?? '–'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
