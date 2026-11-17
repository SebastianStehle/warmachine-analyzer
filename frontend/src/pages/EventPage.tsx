import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EventStandingDto, useClients } from 'src/api';
import { ArmyLink, ListLink, PageHeader, PlayerLink, QueryState, SearchInput, Share, SortHeader, StatTile } from 'src/components';
import { LONGSHANKS_URL } from 'src/lib/factions';
import { matchesSearch, useClientSort } from 'src/lib/sorting';

const STANDING_ACCESSORS = {
  rank: (x: EventStandingDto) => x.rank,
  player: (x: EventStandingDto) => x.playerName,
  army: (x: EventStandingDto) => x.army,
  tournamentPoints: (x: EventStandingDto) => x.tournamentPoints,
  strengthOfSchedule: (x: EventStandingDto) => x.strengthOfSchedule,
  controlPoints: (x: EventStandingDto) => x.controlPoints,
  armyPoints: (x: EventStandingDto) => x.armyPoints,
};

export function EventPage() {
  const { id } = useParams();
  const clients = useClients();
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => clients.events.getEvent(Number(id)),
  });

  const standings = (data?.standings ?? []).filter(({ playerName, army, lists }) =>
    matchesSearch(search, playerName, army, ...lists.map(({ caster }) => caster)),
  );
  const { sorted, sort, toggle } = useClientSort(standings, STANDING_ACCESSORS, { key: 'rank', order: 'asc' });

  // The armies of the event, most played first.
  const armies = new Map<string, { faction: string | null; players: number }>();
  for (const { army, faction } of data?.standings ?? []) {
    if (army) {
      const current = armies.get(army) ?? { faction, players: 0 };
      current.players++;
      armies.set(army, current);
    }
  }
  const armyBreakdown = [...armies].sort((a, b) => b[1].players - a[1].players);

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/events">Events</Link>
          </li>
          <li>{data?.name ?? id}</li>
        </ul>
      </div>

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <PageHeader
              kicker={`${data.date}${data.type ? ` · ${data.type}` : ''}`}
              title={data.name}
              description={data.location}
              actions={
                <a
                  className="btn btn-sm btn-outline"
                  href={`${LONGSHANKS_URL}/event/${data.id}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Longshanks ↗
                </a>
              }
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label="Players" value={data.playerCount} />
              <StatTile label="Rounds" value={data.rounds} />
              <StatTile
                label="Lists"
                value={
                  <Link className="link link-hover" to={`/lists?eventId=${data.id}`}>
                    {data.lists}
                  </Link>
                }
              />
              <StatTile label="Armies" value={armies.size} />
            </div>

            <div className="flex flex-wrap gap-2">
              {armyBreakdown.map(([army, { faction, players }]) => (
                <span key={army} className="badge badge-lg bg-base-100 border-base-300 gap-2">
                  <ArmyLink army={army} faction={faction} />
                  <Share part={players} total={data.standings.length} />
                </span>
              ))}
            </div>

            <div className="panel overflow-x-auto">
              <div className="flex items-center justify-between p-3">
                <h2 className="text-xl font-semibold">Standings</h2>
                <SearchInput value={search} onChange={setSearch} placeholder="Search player, army, caster" />
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <SortHeader sortKey="rank" sort={sort} onSort={toggle}>
                      Rank
                    </SortHeader>
                    <SortHeader sortKey="player" sort={sort} onSort={toggle}>
                      Player
                    </SortHeader>
                    <SortHeader sortKey="army" sort={sort} onSort={toggle}>
                      Army
                    </SortHeader>
                    <th>Lists</th>
                    <SortHeader sortKey="tournamentPoints" sort={sort} onSort={toggle}>
                      Record
                    </SortHeader>
                    <SortHeader sortKey="strengthOfSchedule" sort={sort} onSort={toggle}>
                      SOS
                    </SortHeader>
                    <SortHeader sortKey="controlPoints" sort={sort} onSort={toggle}>
                      CP
                    </SortHeader>
                    <SortHeader sortKey="armyPoints" sort={sort} onSort={toggle}>
                      AP
                    </SortHeader>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((standing) => (
                    <tr key={standing.playerId} className="hover:bg-base-200">
                      <td className="font-display text-lg font-semibold">{standing.rank}</td>
                      <td>
                        <PlayerLink id={standing.playerId}>{standing.playerName}</PlayerLink>
                      </td>
                      <td>
                        <ArmyLink army={standing.army} faction={standing.faction} />
                      </td>
                      <td>
                        <div className="flex flex-col">
                          {standing.lists.map(({ id: listId, caster }) => (
                            <ListLink key={listId} id={listId}>
                              {caster ?? 'List'}
                            </ListLink>
                          ))}
                          {standing.lists.length === 0 && '–'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {standing.wins}-{standing.losses}
                      </td>
                      <td className="tabular-nums">{standing.strengthOfSchedule ?? '–'}</td>
                      <td className="tabular-nums">{standing.controlPoints ?? '–'}</td>
                      <td className="tabular-nums">{standing.armyPoints ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
