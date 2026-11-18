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
import { texts } from 'src/texts';

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
        <Table.Content aria-label={texts.casters.opposingCasters} sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
          <Table.Header>
            <SortableColumn id="caster" isRowHeader>
              {texts.common.against}
            </SortableColumn>
            <SortableColumn id="winRate">{texts.common.winRate}</SortableColumn>
            <SortableColumn id="games">{texts.common.winsLossesDraws}</SortableColumn>
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
    <QueryState isLoading={isLoading} error={error} isEmpty={data?.total === 0} emptyText={texts.casters.noLists}>
      {data && (
        <div className="flex flex-col gap-3">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label={texts.casters.topLists}>
                <Table.Header>
                  <Table.Column>{texts.common.placing}</Table.Column>
                  <Table.Column isRowHeader>{texts.common.player}</Table.Column>
                  <Table.Column>{texts.common.army}</Table.Column>
                  <Table.Column>{texts.common.event}</Table.Column>
                  <Table.Column>{texts.common.played}</Table.Column>
                </Table.Header>
                <Table.Body>
                  {data.items.map((list) => (
                    <Table.Row key={list.id} id={list.id} href={`/lists/${list.id}`} className="cursor-pointer">
                      <Table.Cell className="whitespace-nowrap">
                        {list.rank ?? '–'}
                        <span className="text-muted text-xs"> {texts.common.ofPlayers(list.eventPlayers)}</span>
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
                        {list.games > 0 ? texts.common.wonOf(list.wins, list.games) : '–'}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

          <Link href={listsLink({ caster, sort: 'rank', order: 'asc' })}>{texts.casters.allListsBestFirst(data.total)}</Link>
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
        <Breadcrumbs.Item href="/factions">{texts.common.factions}</Breadcrumbs.Item>
        {data && data.armies.length > 0 && (
          <Breadcrumbs.Item href={`/factions/${encodeURIComponent(data.armies[0].army)}`}>{data.armies[0].army}</Breadcrumbs.Item>
        )}
        <Breadcrumbs.Item>{caster}</Breadcrumbs.Item>
      </Breadcrumbs>

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <PageHeader
              kicker={texts.common.caster}
              title={data.caster}
              image={data.imageUrl}
              description={<WikiLink page={data.wikiPage} />}
              actions={<Link href={listsLink({ caster })}>{texts.casters.allLists}</Link>}
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label={texts.common.lists} value={<Link href={listsLink({ caster })}>{data.lists}</Link>} />
              <StatTile label={texts.common.winRate} value={<WinRate winRate={data.stats.winRate} games={data.stats.games} />} />
              <StatTile label={texts.common.record} value={`${data.stats.wins} / ${data.stats.losses} / ${data.stats.draws}`} />
              <StatTile
                label={texts.common.armies}
                value={data.armies.length}
                detail={data.armies.map(({ army }) => army).join(', ') || undefined}
              />
            </div>

            <Card>
              <Tabs {...tabs}>
                <Tabs.ListContainer>
                  <Tabs.List aria-label={texts.common.details} className="w-fit">
                    <Tabs.Tab id="units" className="font-display tracking-wide uppercase">
                      {texts.common.modelStats.unitsTab}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="impact" className="font-display tracking-wide uppercase">
                      {texts.common.modelStats.impactTab}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="matchups" className="font-display tracking-wide uppercase">
                      {texts.common.matchups}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="casters" className="font-display tracking-wide uppercase">
                      {texts.casters.vsCasters}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="lists" className="font-display tracking-wide uppercase">
                      {texts.casters.topLists}
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
