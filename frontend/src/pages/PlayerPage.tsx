import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArmyUsageDto, ParticipationDto, useClients } from 'src/api';
import { ArmyLink, EventLink, ListLink, PageHeader, QueryState, SearchInput, SortHeader, StatTile } from 'src/components';
import { LONGSHANKS_URL } from 'src/lib/factions';
import { formatPercent } from 'src/lib/format';
import { matchesSearch, useClientSort } from 'src/lib/sorting';

const PARTICIPATION_ACCESSORS = {
  date: (x: ParticipationDto) => x.eventDate,
  event: (x: ParticipationDto) => x.eventName,
  rank: (x: ParticipationDto) => x.rank,
  army: (x: ParticipationDto) => x.army,
  wins: (x: ParticipationDto) => x.wins,
};

const ARMY_ACCESSORS = {
  army: (x: ArmyUsageDto) => x.army,
  events: (x: ArmyUsageDto) => x.events,
  winRate: (x: ArmyUsageDto) => x.winRate,
};

export function PlayerPage() {
  const { id } = useParams();
  const clients = useClients();
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['player', id],
    queryFn: () => clients.players.getPlayer(Number(id)),
  });

  const participations = (data?.participations ?? []).filter(({ eventName, army, lists }) =>
    matchesSearch(search, eventName, army, ...lists.map(({ caster }) => caster)),
  );
  const events = useClientSort(participations, PARTICIPATION_ACCESSORS, { key: 'date', order: 'desc' });
  const armies = useClientSort(data?.armies ?? [], ARMY_ACCESSORS, { key: 'events', order: 'desc' });

  let bestRank: number | null = null;
  for (const { rank } of data?.participations ?? []) {
    bestRank = bestRank === null ? rank : Math.min(bestRank, rank);
  }

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/players">Players</Link>
          </li>
          <li>{data?.name ?? id}</li>
        </ul>
      </div>

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <PageHeader
              kicker="Player"
              title={data.name}
              actions={
                <>
                  <Link className="btn btn-sm btn-primary" to={`/lists?playerId=${data.id}`}>
                    All lists
                  </Link>
                  <a
                    className="btn btn-sm btn-outline"
                    href={`${LONGSHANKS_URL}/player/${data.id}/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Longshanks ↗
                  </a>
                </>
              }
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label="Events" value={data.events} />
              <StatTile label="Record" value={`${data.wins}-${data.losses}`} />
              <StatTile label="Win rate" value={formatPercent(data.winRate)} detail={`${data.wins + data.losses} games`} />
              <StatTile label="Best placing" value={bestRank ?? '–'} />
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-3">
              <div className="panel overflow-x-auto">
                <h2 className="p-3 text-xl font-semibold">Armies</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <SortHeader sortKey="army" sort={armies.sort} onSort={armies.toggle}>
                        Army
                      </SortHeader>
                      <SortHeader sortKey="events" sort={armies.sort} onSort={armies.toggle}>
                        Events
                      </SortHeader>
                      <SortHeader sortKey="winRate" sort={armies.sort} onSort={armies.toggle}>
                        Win rate
                      </SortHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {armies.sorted.map(({ army, faction, events: count, wins, losses, winRate }) => (
                      <tr key={army}>
                        <td>
                          <ArmyLink army={army} faction={faction} />
                        </td>
                        <td>{count}</td>
                        <td className="whitespace-nowrap">
                          {formatPercent(winRate)} <span className="text-base-content/70 text-xs">({wins + losses} games)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel overflow-x-auto lg:col-span-2">
                <div className="flex items-center justify-between p-3">
                  <h2 className="text-xl font-semibold">Events</h2>
                  <SearchInput value={search} onChange={setSearch} placeholder="Search event, army, caster" />
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <SortHeader sortKey="date" sort={events.sort} onSort={events.toggle}>
                        Date
                      </SortHeader>
                      <SortHeader sortKey="event" sort={events.sort} onSort={events.toggle}>
                        Event
                      </SortHeader>
                      <SortHeader sortKey="rank" sort={events.sort} onSort={events.toggle}>
                        Placing
                      </SortHeader>
                      <SortHeader sortKey="army" sort={events.sort} onSort={events.toggle}>
                        Army
                      </SortHeader>
                      <th>Lists</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.sorted.map((participation) => (
                      <tr key={participation.eventId}>
                        <td className="whitespace-nowrap">{participation.eventDate}</td>
                        <td>
                          <EventLink id={participation.eventId}>{participation.eventName}</EventLink>
                        </td>
                        <td className="whitespace-nowrap">
                          {participation.rank}{' '}
                          <span className="text-base-content/70 text-xs">of {participation.eventPlayers}</span>
                          <div className="text-base-content/80 text-xs tabular-nums">
                            {participation.wins}-{participation.losses}
                          </div>
                        </td>
                        <td>
                          <ArmyLink army={participation.army} faction={participation.faction} />
                        </td>
                        <td>
                          <div className="flex flex-col">
                            {participation.lists.map(({ id: listId, caster }) => (
                              <ListLink key={listId} id={listId}>
                                {caster ?? 'List'}
                              </ListLink>
                            ))}
                            {participation.lists.length === 0 && '–'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
