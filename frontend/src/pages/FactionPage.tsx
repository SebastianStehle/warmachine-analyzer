import { Breadcrumbs, Card, Link, Table, Tabs } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CasterStatsDto, useClients } from 'src/api';
import {
  CasterLink,
  ImpactChart,
  MatchupsTable,
  PageHeader,
  QueryState,
  SearchInput,
  Share,
  SortableColumn,
  StatTile,
  UnitsTable,
  WikiLink,
  WinRate,
} from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { factionColor } from 'src/lib/factions';
import { listsLink } from 'src/lib/links';
import { matchesSearch, useClientSort } from 'src/lib/sorting';
import { useTabParam } from 'src/lib/tabs';

const CASTER_ACCESSORS = {
  caster: (x: CasterStatsDto) => x.caster,
  lists: (x: CasterStatsDto) => x.lists,
  winRate: (x: CasterStatsDto) => x.winRate,
  games: (x: CasterStatsDto) => x.games,
};

const TABS = ['units', 'impact', 'casters', 'matchups'] as const;

const armyListsLink = (army: string, filter: Record<string, string> = {}) => listsLink({ army, ...filter });

function CastersTable({ army, casters, totalLists }: { army: string; casters: CasterStatsDto[]; totalLists: number }) {
  const [search, setSearch] = useState('');
  const { sorted, sortDescriptor, onSortChange } = useClientSort(
    casters.filter(({ caster }) => matchesSearch(search, caster)),
    CASTER_ACCESSORS,
    { column: 'lists', direction: 'descending' },
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <SearchInput value={search} onChange={setSearch} placeholder="Search casters" />
      </div>

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Casters" sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
            <Table.Header>
              <SortableColumn id="caster" isRowHeader>
                Caster
              </SortableColumn>
              <SortableColumn id="lists">In lists</SortableColumn>
              <SortableColumn id="winRate">Win rate</SortableColumn>
              <SortableColumn id="games">W / L / D</SortableColumn>
            </Table.Header>
            <Table.Body>
              {sorted.map(({ caster, wikiPage, lists, games, wins, losses, draws, winRate }) => (
                <Table.Row key={caster} id={caster} className={classNames({ 'opacity-60': lists === 0 && games === 0 })}>
                  <Table.Cell>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold">
                        <CasterLink caster={caster} />
                      </span>
                      <Link className="text-xs" href={armyListsLink(army, { caster })}>
                        lists
                      </Link>
                      <WikiLink page={wikiPage} />
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Share part={lists} total={totalLists} />
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
    </div>
  );
}

export function FactionPage() {
  const { army = '' } = useParams();
  const tabs = useTabParam(TABS, 'units');
  const clients = useClients();
  const { from, to } = useDateRange();

  const { data, isLoading, error } = useQuery({
    queryKey: ['faction', army, from, to],
    queryFn: () => clients.stats.getFactionDetails(army, from, to),
  });

  return (
    <>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/factions">Factions</Breadcrumbs.Item>
        <Breadcrumbs.Item>{army}</Breadcrumbs.Item>
      </Breadcrumbs>

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <PageHeader
              kicker={
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: factionColor(data.stats.faction) }} />
                  {data.stats.faction ?? 'Army'}
                </span>
              }
              title={army}
              actions={<Link href={armyListsLink(army)}>All lists of this army</Link>}
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label="Players" value={data.stats.players} />
              <StatTile label="Lists" value={<Link href={armyListsLink(army)}>{data.stats.lists}</Link>} />
              <StatTile label="Win rate" value={<WinRate winRate={data.stats.winRate} games={data.stats.games} />} />
              <StatTile
                label="Record"
                value={`${data.stats.wins} / ${data.stats.losses} / ${data.stats.draws}`}
                detail={`${data.stats.mirrors} mirror matches`}
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
                    <Tabs.Tab id="casters" className="font-display tracking-wide uppercase">
                      Casters
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="matchups" className="font-display tracking-wide uppercase">
                      Matchups
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel className="pt-4" id="units">
                  <UnitsTable
                    knownListRecord={data.knownListRecord}
                    totalGames={data.stats.games}
                    units={data.units}
                    totalLists={data.stats.lists}
                    listsFilter={{ army }}
                  />
                </Tabs.Panel>
                <Tabs.Panel className="pt-4" id="impact">
                  <ImpactChart
                    knownListRecord={data.knownListRecord}
                    totalGames={data.stats.games}
                    units={data.units}
                    totalLists={data.stats.lists}
                  />
                </Tabs.Panel>
                <Tabs.Panel className="pt-4" id="casters">
                  <CastersTable army={army} casters={data.casters} totalLists={data.stats.lists} />
                </Tabs.Panel>
                <Tabs.Panel className="pt-4" id="matchups">
                  <MatchupsTable matchups={data.matchups} />
                </Tabs.Panel>
              </Tabs>
            </Card>
          </>
        )}
      </QueryState>
    </>
  );
}
