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
import { texts } from 'src/texts';

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
        <SearchInput value={search} onChange={setSearch} placeholder={texts.factions.searchCasters} />
      </div>

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={texts.common.casters} sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
            <Table.Header>
              <SortableColumn id="caster" isRowHeader>
                {texts.common.caster}
              </SortableColumn>
              <SortableColumn id="lists">{texts.common.modelStats.inLists}</SortableColumn>
              <SortableColumn id="winRate">{texts.common.winRate}</SortableColumn>
              <SortableColumn id="games">{texts.common.winsLossesDraws}</SortableColumn>
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
                        {texts.factions.listsLink}
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
        <Breadcrumbs.Item href="/factions">{texts.common.factions}</Breadcrumbs.Item>
        <Breadcrumbs.Item>{army}</Breadcrumbs.Item>
      </Breadcrumbs>

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <PageHeader
              kicker={
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: factionColor(data.stats.faction) }} />
                  {data.stats.faction ?? texts.common.army}
                </span>
              }
              title={army}
              actions={<Link href={armyListsLink(army)}>{texts.factions.allListsOfArmy}</Link>}
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label={texts.common.players} value={data.stats.players} />
              <StatTile label={texts.common.lists} value={<Link href={armyListsLink(army)}>{data.stats.lists}</Link>} />
              <StatTile label={texts.common.winRate} value={<WinRate winRate={data.stats.winRate} games={data.stats.games} />} />
              <StatTile
                label={texts.common.record}
                value={`${data.stats.wins} / ${data.stats.losses} / ${data.stats.draws}`}
                detail={texts.factions.mirrorMatches(data.stats.mirrors)}
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
                    <Tabs.Tab id="casters" className="font-display tracking-wide uppercase">
                      {texts.common.casters}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="matchups" className="font-display tracking-wide uppercase">
                      {texts.common.matchups}
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
