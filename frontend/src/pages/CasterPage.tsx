import { Breadcrumbs, Card, Link, Table, Tabs } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { OpponentCasterStatsDto, useClients } from 'src/api';
import {
  ArmyLink,
  CasterLink,
  EventLink,
  ImpactChart,
  MatchupsTable,
  PageHeader,
  PlayerLink,
  QueryState,
  SortableColumn,
  StatTile,
  UnitsTable,
  WikiLink,
  WinRate,
} from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { listsLink } from 'src/lib/links';
import { useClientSort } from 'src/lib/sorting';
import { useTabParam } from 'src/lib/tabs';

const TOP_LISTS = 10;

const TABS = ['units', 'impact', 'matchups', 'casters', 'lists'] as const;

const OPPONENT_ACCESSORS = {
  caster: (x: OpponentCasterStatsDto) => x.caster,
  winRate: (x: OpponentCasterStatsDto) => x.winRate,
  games: (x: OpponentCasterStatsDto) => x.games,
};

function OpponentCastersTable({ casters }: { casters: OpponentCasterStatsDto[] }) {
  const { sorted, sortDescriptor, onSortChange } = useClientSort(casters, OPPONENT_ACCESSORS, {
    column: 'games',
    direction: 'descending',
  });

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Opposing casters" sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
          <Table.Header>
            <SortableColumn id="caster" isRowHeader>
              Against
            </SortableColumn>
            <SortableColumn id="winRate">Win rate</SortableColumn>
            <SortableColumn id="games">W / L / D</SortableColumn>
          </Table.Header>
          <Table.Body>
            {sorted.map(({ caster, games, wins, losses, draws, winRate }) => (
              <Table.Row key={caster} id={caster}>
                <Table.Cell className="font-semibold">
                  <CasterLink caster={caster} />
                </Table.Cell>
                <Table.Cell>
                  <WinRate winRate={winRate} games={games} />
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  {wins} / {losses} / {draws}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

function TopLists({ caster }: { caster: string }) {
  const clients = useClients();
  const { from, to } = useDateRange();

  const { data, isLoading, error } = useQuery({
    queryKey: ['caster-top-lists', caster, from, to],
    queryFn: () =>
      clients.lists.getLists(from, to, 0, TOP_LISTS, undefined, 'asc', 'rank', undefined, undefined, undefined, [caster]),
  });

  return (
    <QueryState isLoading={isLoading} error={error} isEmpty={data?.total === 0} emptyText="No lists with this caster yet.">
      {data && (
        <div className="flex flex-col gap-3">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Top lists">
                <Table.Header>
                  <Table.Column>Placing</Table.Column>
                  <Table.Column isRowHeader>Player</Table.Column>
                  <Table.Column>Army</Table.Column>
                  <Table.Column>Event</Table.Column>
                  <Table.Column>Played</Table.Column>
                </Table.Header>
                <Table.Body>
                  {data.items.map((list) => (
                    <Table.Row key={list.id} id={list.id} href={`/lists/${list.id}`} className="cursor-pointer">
                      <Table.Cell className="whitespace-nowrap">
                        {list.rank ?? '–'}
                        <span className="text-muted text-xs"> of {list.eventPlayers}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <PlayerLink id={list.playerId}>{list.playerName}</PlayerLink>
                      </Table.Cell>
                      <Table.Cell>
                        <ArmyLink army={list.army} faction={list.faction} />
                      </Table.Cell>
                      <Table.Cell>
                        <EventLink id={list.eventId}>{list.eventName}</EventLink>{' '}
                        <span className="text-muted text-xs whitespace-nowrap">({list.eventDate})</span>
                      </Table.Cell>
                      <Table.Cell className="whitespace-nowrap">
                        {list.games > 0 ? `${list.wins} of ${list.games} won` : '–'}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

          <Link href={listsLink({ caster, sort: 'rank', order: 'asc' })}>All {data.total} lists, best placing first</Link>
        </div>
      )}
    </QueryState>
  );
}

export function CasterPage() {
  const { caster = '' } = useParams();
  const tabs = useTabParam(TABS, 'units');
  const clients = useClients();
  const { from, to } = useDateRange();

  const { data, isLoading, error } = useQuery({
    queryKey: ['caster', caster, from, to],
    queryFn: () => clients.stats.getCasterDetails(caster, from, to),
  });

  return (
    <>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/factions">Factions</Breadcrumbs.Item>
        {data && data.armies.length > 0 && (
          <Breadcrumbs.Item href={`/factions/${encodeURIComponent(data.armies[0].army)}`}>{data.armies[0].army}</Breadcrumbs.Item>
        )}
        <Breadcrumbs.Item>{caster}</Breadcrumbs.Item>
      </Breadcrumbs>

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <PageHeader
              kicker="Caster"
              title={data.caster}
              image={data.imageUrl}
              description={<WikiLink page={data.wikiPage} />}
              actions={<Link href={listsLink({ caster })}>All lists with this caster</Link>}
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label="Lists" value={<Link href={listsLink({ caster })}>{data.lists}</Link>} />
              <StatTile label="Win rate" value={<WinRate winRate={data.stats.winRate} games={data.stats.games} />} />
              <StatTile label="Record" value={`${data.stats.wins} / ${data.stats.losses} / ${data.stats.draws}`} />
              <StatTile
                label="Armies"
                value={data.armies.length}
                detail={data.armies.map(({ army }) => army).join(', ') || undefined}
              />
            </div>

            <Card>
              <Tabs {...tabs}>
                <Tabs.ListContainer>
                  <Tabs.List aria-label="Details" className="w-fit">
                    <Tabs.Tab id="units" className="font-display tracking-wide uppercase">
                      Models & units
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="impact" className="font-display tracking-wide uppercase">
                      Model impact
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="matchups" className="font-display tracking-wide uppercase">
                      Matchups
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="casters" className="font-display tracking-wide uppercase">
                      Vs casters
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="lists" className="font-display tracking-wide uppercase">
                      Top lists
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel className="pt-4" id="units">
                  <UnitsTable
                    knownListRecord={data.knownListRecord}
                    totalGames={data.stats.games}
                    units={data.units}
                    totalLists={data.lists}
                    listsFilter={{ caster }}
                  />
                </Tabs.Panel>
                <Tabs.Panel className="pt-4" id="impact">
                  <ImpactChart
                    knownListRecord={data.knownListRecord}
                    totalGames={data.stats.games}
                    units={data.units}
                    totalLists={data.lists}
                  />
                </Tabs.Panel>
                <Tabs.Panel className="pt-4" id="matchups">
                  <MatchupsTable matchups={data.matchups} />
                </Tabs.Panel>
                <Tabs.Panel className="pt-4" id="casters">
                  <OpponentCastersTable casters={data.opponentCasters} />
                </Tabs.Panel>
                <Tabs.Panel className="pt-4" id="lists">
                  <TopLists caster={caster} />
                </Tabs.Panel>
              </Tabs>
            </Card>
          </>
        )}
      </QueryState>
    </>
  );
}
