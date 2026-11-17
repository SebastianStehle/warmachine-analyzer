import { Breadcrumbs, Card, Chip, Link, Table } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { EventStandingDto, useClients } from 'src/api';
import {
  ArmyLink,
  ListLink,
  PageHeader,
  PlayerLink,
  QueryState,
  SearchInput,
  Share,
  SortableColumn,
  StatTile,
} from 'src/components';
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
  const { sorted, sortDescriptor, onSortChange } = useClientSort(standings, STANDING_ACCESSORS, {
    column: 'rank',
    direction: 'ascending',
  });

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
      <Breadcrumbs>
        <Breadcrumbs.Item href="/events">Events</Breadcrumbs.Item>
        <Breadcrumbs.Item>{data?.name ?? id}</Breadcrumbs.Item>
      </Breadcrumbs>

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <PageHeader
              kicker={`${data.date}${data.type ? ` · ${data.type}` : ''}`}
              title={data.name}
              description={data.location}
              actions={
                <Link href={`${LONGSHANKS_URL}/event/${data.id}/`} target="_blank" rel="noreferrer">
                  Longshanks
                  <Link.Icon />
                </Link>
              }
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label="Players" value={data.playerCount} />
              <StatTile label="Rounds" value={data.rounds} />
              <StatTile label="Lists" value={<Link href={`/lists?eventId=${data.id}`}>{data.lists}</Link>} />
              <StatTile label="Armies" value={armies.size} />
            </div>

            <div className="flex flex-wrap gap-2">
              {armyBreakdown.map(([army, { faction, players }]) => (
                <Chip key={army} size="lg" variant="secondary">
                  <ArmyLink army={army} faction={faction} />
                  <Share part={players} total={data.standings.length} />
                </Chip>
              ))}
            </div>

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Standings</h2>
                <SearchInput value={search} onChange={setSearch} placeholder="Search player, army, caster" />
              </div>
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label="Standings" sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
                    <Table.Header>
                      <SortableColumn id="rank">Rank</SortableColumn>
                      <SortableColumn id="player" isRowHeader>
                        Player
                      </SortableColumn>
                      <SortableColumn id="army">Army</SortableColumn>
                      <Table.Column>Lists</Table.Column>
                      <SortableColumn id="tournamentPoints">Record</SortableColumn>
                      <SortableColumn id="strengthOfSchedule">SOS</SortableColumn>
                      <SortableColumn id="controlPoints">CP</SortableColumn>
                      <SortableColumn id="armyPoints">AP</SortableColumn>
                    </Table.Header>
                    <Table.Body>
                      {sorted.map((standing) => (
                        <Table.Row key={standing.playerId} id={standing.playerId}>
                          <Table.Cell className="font-display text-lg font-semibold">{standing.rank}</Table.Cell>
                          <Table.Cell>
                            <PlayerLink id={standing.playerId}>{standing.playerName}</PlayerLink>
                          </Table.Cell>
                          <Table.Cell>
                            <ArmyLink army={standing.army} faction={standing.faction} />
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-col">
                              {standing.lists.map(({ id: listId, caster }) => (
                                <ListLink key={listId} id={listId}>
                                  {caster ?? 'List'}
                                </ListLink>
                              ))}
                              {standing.lists.length === 0 && '–'}
                            </div>
                          </Table.Cell>
                          <Table.Cell className="whitespace-nowrap tabular-nums">
                            {standing.wins}-{standing.losses}
                          </Table.Cell>
                          <Table.Cell className="tabular-nums">{standing.strengthOfSchedule ?? '–'}</Table.Cell>
                          <Table.Cell className="tabular-nums">{standing.controlPoints ?? '–'}</Table.Cell>
                          <Table.Cell className="tabular-nums">{standing.armyPoints ?? '–'}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </Card>
          </>
        )}
      </QueryState>
    </>
  );
}
