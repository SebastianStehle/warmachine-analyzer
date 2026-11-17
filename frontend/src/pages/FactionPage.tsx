import type { Key } from '@heroui/react';
import { Breadcrumbs, Card, Link, ListBox, Select, Switch, Table, Tabs } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CasterStatsDto, MatchupStatsDto, ModelType, UnitStatsDto, useClients } from 'src/api';
import {
  ArmyLink,
  ModelTypeBadge,
  PageHeader,
  QueryState,
  SearchInput,
  Share,
  SortableColumn,
  StatTile,
  WikiLink,
  WinRate,
} from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { factionColor } from 'src/lib/factions';
import { MODEL_TYPE_LABELS } from 'src/lib/models';
import { matchesSearch, useClientSort } from 'src/lib/sorting';

const ALL_TYPES = 'all';
const OTHER_TYPE = 'other';

const UNIT_ACCESSORS = {
  name: (x: UnitStatsDto) => x.name,
  type: (x: UnitStatsDto) => (x.type ? MODEL_TYPE_LABELS[x.type] : null),
  lists: (x: UnitStatsDto) => x.lists,
  copies: (x: UnitStatsDto) => x.copies,
  averagePoints: (x: UnitStatsDto) => x.averagePoints,
  winRate: (x: UnitStatsDto) => x.winRate,
};

const CASTER_ACCESSORS = {
  caster: (x: CasterStatsDto) => x.caster,
  lists: (x: CasterStatsDto) => x.lists,
  winRate: (x: CasterStatsDto) => x.winRate,
  games: (x: CasterStatsDto) => x.games,
};

const MATCHUP_ACCESSORS = {
  opponent: (x: MatchupStatsDto) => x.opponent,
  winRate: (x: MatchupStatsDto) => x.winRate,
  games: (x: MatchupStatsDto) => x.games,
};

const listsLink = (army: string, filter: Record<string, string>) =>
  `/lists?${new URLSearchParams({ army, ...filter }).toString()}`;

function TypeSelect({ types, value, onChange }: { types: ModelType[]; value: string; onChange: (value: string) => void }) {
  return (
    <Select aria-label="Type" className="w-44" value={value} onChange={(key: Key | null) => onChange(String(key ?? ALL_TYPES))}>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id={ALL_TYPES} textValue="All types">
            All types
            <ListBox.ItemIndicator />
          </ListBox.Item>
          {types.map((type) => (
            <ListBox.Item key={type} id={type} textValue={MODEL_TYPE_LABELS[type]}>
              {MODEL_TYPE_LABELS[type]}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
          <ListBox.Item id={OTHER_TYPE} textValue="Other">
            Other
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function UnitsTable({ army, units, totalLists }: { army: string; units: UnitStatsDto[]; totalLists: number }) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState(ALL_TYPES);
  const [showUnplayed, setShowUnplayed] = useState(true);

  const types = [...new Set(units.map((unit) => unit.type).filter((x): x is ModelType => !!x))];

  const { sorted, sortDescriptor, onSortChange } = useClientSort(
    units.filter(
      (unit) =>
        matchesSearch(search, unit.name) &&
        (type === ALL_TYPES || (type === OTHER_TYPE ? !unit.type : unit.type === type)) &&
        (showUnplayed || unit.lists > 0),
    ),
    UNIT_ACCESSORS,
    { column: 'lists', direction: 'descending' },
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Switch isSelected={showUnplayed} onChange={setShowUnplayed}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Show unplayed
          </Switch.Content>
        </Switch>
        <TypeSelect types={types} value={type} onChange={setType} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search models and units" />
      </div>

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Models and units" sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
            <Table.Header>
              <SortableColumn id="name" isRowHeader>
                Model / unit
              </SortableColumn>
              <SortableColumn id="type">Type</SortableColumn>
              <SortableColumn id="lists">In lists</SortableColumn>
              <SortableColumn id="copies">Copies</SortableColumn>
              <SortableColumn id="averagePoints">Avg. points</SortableColumn>
              <SortableColumn id="winRate">Win rate when played</SortableColumn>
            </Table.Header>
            <Table.Body>
              {sorted.map(({ name, type: modelType, wikiPage, lists, copies, averagePoints, games, winRate }) => (
                <Table.Row key={name} id={name} className={classNames({ 'opacity-60': lists === 0 })}>
                  <Table.Cell>
                    <div className="flex items-baseline gap-2">
                      {lists > 0 ? (
                        <Link className="font-semibold" href={listsLink(army, { unit: name })}>
                          {name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{name}</span>
                      )}
                      <WikiLink page={wikiPage} />
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <ModelTypeBadge type={modelType} />
                  </Table.Cell>
                  <Table.Cell>
                    <Share part={lists} total={totalLists} />
                  </Table.Cell>
                  <Table.Cell>{copies}</Table.Cell>
                  <Table.Cell>{averagePoints ?? '–'}</Table.Cell>
                  <Table.Cell>
                    <WinRate winRate={winRate} games={games} />
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
                      <Link className="font-semibold" href={listsLink(army, { caster })}>
                        {caster}
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

function MatchupsTable({ matchups }: { matchups: MatchupStatsDto[] }) {
  const { sorted, sortDescriptor, onSortChange } = useClientSort(matchups, MATCHUP_ACCESSORS, {
    column: 'games',
    direction: 'descending',
  });

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Matchups" sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
          <Table.Header>
            <SortableColumn id="opponent" isRowHeader>
              Against
            </SortableColumn>
            <SortableColumn id="winRate">Win rate</SortableColumn>
            <SortableColumn id="games">W / L / D</SortableColumn>
          </Table.Header>
          <Table.Body>
            {sorted.map(({ opponent, games, wins, losses, draws, winRate }) => (
              <Table.Row key={opponent} id={opponent}>
                <Table.Cell className="font-semibold">
                  <ArmyLink army={opponent} />
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

export function FactionPage() {
  const { army = '' } = useParams();
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
              actions={<Link href={listsLink(army, {})}>All lists of this army</Link>}
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label="Players" value={data.stats.players} />
              <StatTile label="Lists" value={<Link href={listsLink(army, {})}>{data.stats.lists}</Link>} />
              <StatTile label="Win rate" value={<WinRate winRate={data.stats.winRate} games={data.stats.games} />} />
              <StatTile
                label="Record"
                value={`${data.stats.wins} / ${data.stats.losses} / ${data.stats.draws}`}
                detail={`${data.stats.mirrors} mirror matches`}
              />
            </div>

            <Card>
              <Tabs>
                <Tabs.ListContainer>
                  <Tabs.List aria-label="Details" className="w-fit">
                    <Tabs.Tab id="units" className="font-display tracking-wide uppercase">
                      Models & units
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
                  <UnitsTable army={army} units={data.units} totalLists={data.stats.lists} />
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
