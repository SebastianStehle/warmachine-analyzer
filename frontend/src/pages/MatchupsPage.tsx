import { Alert, Key, ListBox, Select, Table, Tabs } from '@heroui/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MatchupCellDto, MatchupGroupDto, MatchupGrouping, useClients } from 'src/api';
import { ArmyLink, MultiSelect, PageHeader, QueryState, SortableColumn, WinRate } from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { factionColor } from 'src/lib/factions';
import { formatPercent } from 'src/lib/format';
import { useClientSort } from 'src/lib/sorting';
import { texts } from 'src/texts';

const MIN_GAMES_OPTIONS = [1, 5, 10, 20];
const DEFAULT_MIN_GAMES = 5;
const EVEN_WIN_RATE = 0.5;

// A win rate 25 points away from even gets the full color.
const FULL_COLOR_DEVIATION = 0.25;
const MAX_COLOR_PERCENT = 45;

type MatchupView = 'matrix' | 'list';

interface ViewProps {
  groups: MatchupGroupDto[];
  cells: MatchupCellDto[];
  grouping: MatchupGrouping;
  minGames: number;
}

function cellBackground(winRate: number | null) {
  if (winRate === null) {
    return undefined;
  }

  const deviation = Math.min(1, Math.abs(winRate - EVEN_WIN_RATE) / FULL_COLOR_DEVIATION);
  const color = winRate >= EVEN_WIN_RATE ? 'var(--success)' : 'var(--danger)';
  return `color-mix(in oklab, ${color} ${Math.round(deviation * MAX_COLOR_PERCENT)}%, transparent)`;
}

function GroupName({ group, grouping }: { group: MatchupGroupDto; grouping: MatchupGrouping }) {
  if (grouping === 'army') {
    return <ArmyLink army={group.name} faction={group.faction} />;
  }

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: factionColor(group.faction) }} />
      {group.name}
    </span>
  );
}

function MatchupCell({ cell, minGames }: { cell: MatchupCellDto | undefined; minGames: number }) {
  if (!cell) {
    return <span className="text-muted">–</span>;
  }

  const title = texts.matchups.cellTitle(cell.group, cell.opponent, cell.wins, cell.losses, cell.draws);

  if (cell.games < minGames) {
    return (
      <span className="text-muted text-xs" title={title}>
        ({cell.games})
      </span>
    );
  }

  return (
    <span title={title} className="flex flex-col items-center leading-tight">
      <span className="font-semibold tabular-nums">{formatPercent(cell.winRate)}</span>
      <span className="text-muted text-xs">({cell.games})</span>
    </span>
  );
}

function MatrixView({ groups, cells, grouping, minGames }: ViewProps) {
  const cellsByKey = new Map(cells.map((cell) => [`${cell.group}\n${cell.opponent}`, cell]));

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label={texts.matchups.matrixLabel}>
          <Table.Header>
            <Table.Column isRowHeader>{grouping === 'army' ? texts.common.army : texts.common.faction}</Table.Column>
            <Table.Column>{texts.matchups.overall}</Table.Column>
            {groups.map(({ name }) => (
              <Table.Column key={name} id={`column-${name}`} className="align-bottom">
                <span
                  className="block max-h-40 rotate-180 overflow-hidden text-ellipsis whitespace-nowrap [writing-mode:vertical-rl]"
                  title={name}
                >
                  {name}
                </span>
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body>
            {groups.map((group) => (
              <Table.Row key={group.name} id={`row-${group.name}`}>
                <Table.Cell>
                  <GroupName group={group} grouping={grouping} />
                </Table.Cell>
                <Table.Cell>
                  <WinRate winRate={group.winRate} games={group.games} />
                </Table.Cell>
                {groups.map(({ name: opponent }) => {
                  const cell = cellsByKey.get(`${group.name}\n${opponent}`);
                  const isShown = cell !== undefined && cell.games >= minGames;

                  return (
                    <Table.Cell
                      key={opponent}
                      id={`cell-${group.name}-${opponent}`}
                      className="text-center"
                      style={{ backgroundColor: isShown ? cellBackground(cell.winRate) : undefined }}
                    >
                      {opponent === group.name ? (
                        <span className="text-muted">·</span>
                      ) : (
                        <MatchupCell cell={cell} minGames={minGames} />
                      )}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

const LIST_ACCESSORS = {
  group: (x: MatchupCellDto) => x.group,
  opponent: (x: MatchupCellDto) => x.opponent,
  winRate: (x: MatchupCellDto) => x.winRate,
  games: (x: MatchupCellDto) => x.games,
};

function ListView({ groups, cells, grouping, minGames }: ViewProps) {
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedOpponents, setSelectedOpponents] = useState<string[]>([]);

  const groupsByName = new Map(groups.map((group) => [group.name, group]));
  const names = groups.map(({ name }) => name);

  const visible = cells.filter(
    ({ group, opponent, games }) =>
      games >= minGames &&
      (selectedGroups.length === 0 || selectedGroups.includes(group)) &&
      (selectedOpponents.length === 0 || selectedOpponents.includes(opponent)),
  );

  const { sorted, sortDescriptor, onSortChange } = useClientSort(visible, LIST_ACCESSORS, {
    column: 'games',
    direction: 'descending',
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect
          options={names}
          selected={selectedGroups}
          placeholder={grouping === 'army' ? texts.common.allArmies : texts.matchups.allFactions}
          onChange={setSelectedGroups}
        />
        <span className="text-muted text-sm">{texts.matchups.versus}</span>
        <MultiSelect
          options={names}
          selected={selectedOpponents}
          placeholder={grouping === 'army' ? texts.matchups.allOpposingArmies : texts.matchups.allOpposingFactions}
          onChange={setSelectedOpponents}
        />
      </div>

      {sorted.length === 0 ? (
        <Alert>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{texts.matchups.noMatchups}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={texts.common.matchups} sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
              <Table.Header>
                <SortableColumn id="group" isRowHeader>
                  {grouping === 'army' ? texts.common.army : texts.common.faction}
                </SortableColumn>
                <SortableColumn id="opponent">{texts.common.opponent}</SortableColumn>
                <SortableColumn id="winRate">{texts.common.winRate}</SortableColumn>
                <SortableColumn id="games">{texts.common.games}</SortableColumn>
                <Table.Column>{texts.matchups.winsLossesDraws}</Table.Column>
              </Table.Header>
              <Table.Body>
                {sorted.map((cell) => (
                  <Table.Row key={`${cell.group}\n${cell.opponent}`} id={`${cell.group}\n${cell.opponent}`}>
                    <Table.Cell>
                      <GroupName group={groupsByName.get(cell.group)!} grouping={grouping} />
                    </Table.Cell>
                    <Table.Cell>
                      <GroupName group={groupsByName.get(cell.opponent)!} grouping={grouping} />
                    </Table.Cell>
                    <Table.Cell>
                      <WinRate winRate={cell.winRate} games={cell.games} />
                    </Table.Cell>
                    <Table.Cell className="tabular-nums">{cell.games}</Table.Cell>
                    <Table.Cell className="whitespace-nowrap tabular-nums">
                      {cell.wins}-{cell.losses}-{cell.draws}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </div>
  );
}

export function MatchupsPage() {
  const clients = useClients();
  const { from, to } = useDateRange();
  const [searchParams, setSearchParams] = useSearchParams();

  const grouping: MatchupGrouping = searchParams.get('grouping') === 'army' ? 'army' : 'faction';
  const view: MatchupView = searchParams.get('view') === 'list' ? 'list' : 'matrix';
  const minGames = Number(searchParams.get('minGames') ?? DEFAULT_MIN_GAMES);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['matchups', from, to, grouping],
    queryFn: () => clients.stats.getMatchups(from, to, grouping),
    placeholderData: keepPreviousData,
  });

  const viewProps: ViewProps = { groups: data?.groups ?? [], cells: data?.cells ?? [], grouping, minGames };

  return (
    <>
      <PageHeader
        kicker={texts.common.matchups}
        title={texts.common.matchups}
        description={texts.matchups.description}
        actions={
          <Select
            aria-label={texts.matchups.minimumGames}
            className="w-44"
            value={String(minGames)}
            onChange={(key: Key | null) => setParam('minGames', String(key ?? DEFAULT_MIN_GAMES))}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {MIN_GAMES_OPTIONS.map((option) => (
                  <ListBox.Item key={option} id={String(option)} textValue={texts.matchups.atLeastGames(option)}>
                    {texts.matchups.atLeastGames(option)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        }
      />

      <div className="flex flex-wrap gap-4">
        <Tabs className="flex-1" selectedKey={grouping} onSelectionChange={(key) => setParam('grouping', String(key))}>
          <Tabs.ListContainer>
            <Tabs.List aria-label={texts.matchups.grouping}>
              <Tabs.Tab id="faction" className="font-display tracking-wide uppercase">
                {texts.common.factions}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="army" className="font-display tracking-wide uppercase">
                {texts.common.armies}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        <Tabs className="flex-1" selectedKey={view} onSelectionChange={(key) => setParam('view', String(key))}>
          <Tabs.ListContainer>
            <Tabs.List aria-label={texts.matchups.view}>
              <Tabs.Tab id="matrix" className="font-display tracking-wide uppercase">
                {texts.matchups.matrix}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="list" className="font-display tracking-wide uppercase">
                {texts.common.list}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      <QueryState isLoading={isLoading} error={error} isEmpty={viewProps.groups.length === 0}>
        {view === 'list' ? <ListView {...viewProps} /> : <MatrixView {...viewProps} />}
      </QueryState>
    </>
  );
}
