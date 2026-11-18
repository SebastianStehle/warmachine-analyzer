import type { Key } from '@heroui/react';
import { Link, ListBox, Select, Switch, Table } from '@heroui/react';
import classNames from 'classnames';
import { useState } from 'react';
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { MatchupStatsDto, ModelType, RecordDto, UnitStatsDto } from 'src/api';
import { formatPercent } from 'src/lib/format';
import { listsLink } from 'src/lib/links';
import { MODEL_TYPE_LABELS } from 'src/lib/models';
import { matchesSearch, useClientSort } from 'src/lib/sorting';
import { ArmyLink } from './Links';
import { ModelTypeBadge, WikiLink } from './ModelInfo';
import { SearchInput } from './SearchInput';
import { SortableColumn } from './SortableColumn';
import { MIN_RELIABLE_GAMES, Share, WinRate } from './WinRate';

const ALL_TYPES = 'all';
const OTHER_TYPE = 'other';
const PERCENT = 100;

// Five points are a big difference for a single model, smaller ones are mostly noise.
const NOTABLE_IMPACT = 0.05;

const CHART_HEIGHT = 360;
const DOT_SIZE = 80;

const isReliableImpact = ({ games, gamesWithout }: UnitStatsDto) =>
  games >= MIN_RELIABLE_GAMES && gamesWithout >= MIN_RELIABLE_GAMES;

const formatImpact = (impact: number) => `${impact > 0 ? '+' : ''}${Math.round(impact * PERCENT)} pts`;

const describeImpact = ({ winRate, games, winRateWithout, gamesWithout }: UnitStatsDto) =>
  `${formatPercent(winRate)} with it (${games} games) and ${formatPercent(winRateWithout)} without it (${gamesWithout} games), out of ${games + gamesWithout} games with a known list`;

export interface KnownListProps {
  knownListRecord: RecordDto;
  totalGames: number;
}

// The headline win rate also counts games of players without a submitted list, so the impact would not add up to it.
export function KnownListNote({ knownListRecord, totalGames }: KnownListProps) {
  const unknown = totalGames - knownListRecord.games;

  return (
    <p className="text-muted text-sm">
      Impact compares games where the played list is known: {knownListRecord.games} of {totalGames} games, with a win rate of{' '}
      {formatPercent(knownListRecord.winRate)}. With and without a model always add up to these games.
      {unknown > 0 && ` The other ${unknown} games are left out, because the player submitted no list.`}
    </p>
  );
}

export function Impact({ unit }: { unit: UnitStatsDto }) {
  if (unit.impact === null) {
    return <span className="text-muted">–</span>;
  }

  const isReliable = isReliableImpact(unit);

  return (
    <span
      className={classNames('whitespace-nowrap', { 'opacity-60': !isReliable })}
      title={`${describeImpact(unit)}${isReliable ? '' : '. Too few games, treat with care.'}`}
    >
      <span
        className={classNames('font-semibold tabular-nums', {
          'text-success': isReliable && unit.impact >= NOTABLE_IMPACT,
          'text-danger': isReliable && unit.impact <= -NOTABLE_IMPACT,
        })}
      >
        {formatImpact(unit.impact)}
      </span>{' '}
      <span className="text-muted text-xs">({unit.gamesWithout} without)</span>
    </span>
  );
}

const UNIT_ACCESSORS = {
  name: (x: UnitStatsDto) => x.name,
  type: (x: UnitStatsDto) => (x.type ? MODEL_TYPE_LABELS[x.type] : null),
  lists: (x: UnitStatsDto) => x.lists,
  copies: (x: UnitStatsDto) => x.copies,
  averagePoints: (x: UnitStatsDto) => x.averagePoints,
  winRate: (x: UnitStatsDto) => x.winRate,
  impact: (x: UnitStatsDto) => x.impact,
};

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

export interface UnitsTableProps extends KnownListProps {
  units: UnitStatsDto[];
  totalLists: number;
  listsFilter: Record<string, string>;
}

export function UnitsTable({ units, totalLists, listsFilter, knownListRecord, totalGames }: UnitsTableProps) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState(ALL_TYPES);
  const [showUnplayed, setShowUnplayed] = useState(true);

  const types = [...new Set(units.map((unit) => unit.type).filter((x): x is ModelType => !!x))];
  const hasUnplayed = units.some(({ lists }) => lists === 0);

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
      <KnownListNote knownListRecord={knownListRecord} totalGames={totalGames} />

      <div className="flex flex-wrap items-center justify-end gap-3">
        {hasUnplayed && (
          <Switch isSelected={showUnplayed} onChange={setShowUnplayed}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Show unplayed
            </Switch.Content>
          </Switch>
        )}
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
              <SortableColumn id="impact">Impact</SortableColumn>
            </Table.Header>
            <Table.Body>
              {sorted.map((unit) => (
                <Table.Row key={unit.name} id={unit.name} className={classNames({ 'opacity-60': unit.lists === 0 })}>
                  <Table.Cell>
                    <div className="flex items-baseline gap-2">
                      {unit.lists > 0 ? (
                        <Link className="font-semibold" href={listsLink({ ...listsFilter, unit: unit.name })}>
                          {unit.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{unit.name}</span>
                      )}
                      <WikiLink page={unit.wikiPage} />
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <ModelTypeBadge type={unit.type} />
                  </Table.Cell>
                  <Table.Cell>
                    <Share part={unit.lists} total={totalLists} />
                  </Table.Cell>
                  <Table.Cell>{unit.copies}</Table.Cell>
                  <Table.Cell>{unit.averagePoints ?? '–'}</Table.Cell>
                  <Table.Cell>
                    <WinRate winRate={unit.winRate} games={unit.games} />
                  </Table.Cell>
                  <Table.Cell>
                    <Impact unit={unit} />
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

interface ImpactPoint {
  unit: UnitStatsDto;
  inclusion: number;
  impact: number;
}

function ImpactTooltip({ active, payload }: { active?: boolean; payload?: { payload: ImpactPoint }[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) {
    return null;
  }

  const { unit, inclusion } = point;

  return (
    <div className="bg-overlay border-border rounded border px-3 py-2 text-sm shadow-lg">
      <div className="font-semibold">{unit.name}</div>
      <div>
        In {Math.round(inclusion)}% of the lists <span className="text-muted">({unit.lists})</span>
      </div>
      <div>
        Impact: <span className="font-semibold">{formatImpact(unit.impact!)}</span>
      </div>
      <div className="text-muted text-xs">{describeImpact(unit)}</div>
    </div>
  );
}

// Inclusion on the x axis, so that the models that are played a lot and still lose stand out at the bottom right.
export interface ImpactChartProps extends KnownListProps {
  units: UnitStatsDto[];
  totalLists: number;
}

export function ImpactChart({ units, totalLists, knownListRecord, totalGames }: ImpactChartProps) {
  const points: ImpactPoint[] = units
    .filter((unit) => unit.impact !== null && isReliableImpact(unit))
    .map((unit) => ({
      unit,
      inclusion: totalLists > 0 ? (unit.lists / totalLists) * PERCENT : 0,
      impact: unit.impact! * PERCENT,
    }));

  if (points.length === 0) {
    return <p className="text-muted text-sm">No model has at least {MIN_RELIABLE_GAMES} games with and without it yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <KnownListNote knownListRecord={knownListRecord} totalGames={totalGames} />
      <p className="text-muted text-sm">
        Each dot is a model or unit with at least {MIN_RELIABLE_GAMES} games with and without it. Up means lists with it win more
        often than lists without it. This shows a correlation, not the cause: strong players and popular casters take some models
        more often than others.
      </p>

      <div style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis
              type="number"
              dataKey="inclusion"
              name="Inclusion"
              unit="%"
              domain={[0, PERCENT]}
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              label={{ value: 'In % of the lists', position: 'insideBottom', offset: -12, fill: 'var(--muted)', fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="impact"
              name="Impact"
              unit=" pts"
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              width={64}
            />
            <ZAxis range={[DOT_SIZE, DOT_SIZE]} />
            <ReferenceLine y={0} stroke="var(--muted)" strokeDasharray="4 4" />
            <Tooltip content={<ImpactTooltip />} cursor={false} />
            <Scatter data={points} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const MATCHUP_ACCESSORS = {
  opponent: (x: MatchupStatsDto) => x.opponent,
  winRate: (x: MatchupStatsDto) => x.winRate,
  games: (x: MatchupStatsDto) => x.games,
};

export function MatchupsTable({ matchups }: { matchups: MatchupStatsDto[] }) {
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
