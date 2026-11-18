import { Breadcrumbs, Card, Link, Table } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArmyUsageDto, ParticipationDto, useClients } from 'src/api';
import { ArmyLink, EventLink, ListLink, PageHeader, QueryState, SearchInput, SortableColumn, StatTile } from 'src/components';
import { LONGSHANKS_URL } from 'src/lib/factions';
import { formatPercent } from 'src/lib/format';
import { matchesSearch, useClientSort } from 'src/lib/sorting';
import { texts } from 'src/texts';

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
  const events = useClientSort(participations, PARTICIPATION_ACCESSORS, { column: 'date', direction: 'descending' });
  const armies = useClientSort(data?.armies ?? [], ARMY_ACCESSORS, { column: 'events', direction: 'descending' });

  let bestRank: number | null = null;
  for (const { rank } of data?.participations ?? []) {
    bestRank = bestRank === null ? rank : Math.min(bestRank, rank);
  }

  return (
    <>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/players">{texts.common.players}</Breadcrumbs.Item>
        <Breadcrumbs.Item>{data?.name ?? id}</Breadcrumbs.Item>
      </Breadcrumbs>

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <PageHeader
              kicker={texts.common.player}
              title={data.name}
              actions={
                <>
                  <Link href={`/lists?playerId=${data.id}`}>{texts.players.allLists}</Link>
                  <Link href={`${LONGSHANKS_URL}/player/${data.id}/`} target="_blank" rel="noreferrer">
                    Longshanks
                    <Link.Icon />
                  </Link>
                </>
              }
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label={texts.common.events} value={data.events} />
              <StatTile label={texts.common.record} value={`${data.wins}-${data.losses}`} />
              <StatTile
                label={texts.common.winRate}
                value={formatPercent(data.winRate)}
                detail={texts.players.gameCount(data.wins + data.losses)}
              />
              <StatTile label={texts.players.bestPlacing} value={bestRank ?? '–'} />
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-3">
              <Card>
                <h2 className="text-xl font-semibold">{texts.common.armies}</h2>
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content
                      aria-label={texts.common.armies}
                      sortDescriptor={armies.sortDescriptor}
                      onSortChange={armies.onSortChange}
                    >
                      <Table.Header>
                        <SortableColumn id="army" isRowHeader>
                          {texts.common.army}
                        </SortableColumn>
                        <SortableColumn id="events">{texts.common.events}</SortableColumn>
                        <SortableColumn id="winRate">{texts.common.winRate}</SortableColumn>
                      </Table.Header>
                      <Table.Body>
                        {armies.sorted.map(({ army, faction, events: count, wins, losses, winRate }) => (
                          <Table.Row key={army} id={army}>
                            <Table.Cell>
                              <ArmyLink army={army} faction={faction} />
                            </Table.Cell>
                            <Table.Cell>{count}</Table.Cell>
                            <Table.Cell className="whitespace-nowrap">
                              {formatPercent(winRate)}{' '}
                              <span className="text-muted text-xs">({texts.players.gameCount(wins + losses)})</span>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              </Card>

              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{texts.common.events}</h2>
                  <SearchInput value={search} onChange={setSearch} placeholder={texts.players.searchEventsPlaceholder} />
                </div>
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content
                      aria-label={texts.common.events}
                      sortDescriptor={events.sortDescriptor}
                      onSortChange={events.onSortChange}
                    >
                      <Table.Header>
                        <SortableColumn id="date">{texts.common.date}</SortableColumn>
                        <SortableColumn id="event" isRowHeader>
                          {texts.common.event}
                        </SortableColumn>
                        <SortableColumn id="rank">{texts.common.placing}</SortableColumn>
                        <SortableColumn id="army">{texts.common.army}</SortableColumn>
                        <Table.Column>{texts.common.lists}</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {events.sorted.map((participation) => (
                          <Table.Row key={participation.eventId} id={participation.eventId}>
                            <Table.Cell className="whitespace-nowrap">{participation.eventDate}</Table.Cell>
                            <Table.Cell>
                              <EventLink id={participation.eventId}>{participation.eventName}</EventLink>
                            </Table.Cell>
                            <Table.Cell className="whitespace-nowrap">
                              {participation.rank}{' '}
                              <span className="text-muted text-xs">{texts.common.ofPlayers(participation.eventPlayers)}</span>
                              <div className="text-muted text-xs tabular-nums">
                                {participation.wins}-{participation.losses}
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <ArmyLink army={participation.army} faction={participation.faction} />
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex flex-col">
                                {participation.lists.map(({ id: listId, caster }) => (
                                  <ListLink key={listId} id={listId}>
                                    {caster ?? texts.common.list}
                                  </ListLink>
                                ))}
                                {participation.lists.length === 0 && '–'}
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              </Card>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
