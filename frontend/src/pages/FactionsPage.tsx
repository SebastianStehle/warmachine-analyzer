import { Table } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { useState } from 'react';
import { FactionStatsDto, useClients } from 'src/api';
import { ArmyLink, PageHeader, QueryState, SearchInput, Share, SortableColumn, StatTile, WinRate } from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { matchesSearch, useClientSort } from 'src/lib/sorting';
import { texts } from 'src/texts';

const SORT_ACCESSORS = {
  army: (x: FactionStatsDto) => x.army,
  faction: (x: FactionStatsDto) => x.faction,
  players: (x: FactionStatsDto) => x.players,
  lists: (x: FactionStatsDto) => x.lists,
  winRate: (x: FactionStatsDto) => x.winRate,
  games: (x: FactionStatsDto) => x.games,
  mirrors: (x: FactionStatsDto) => x.mirrors,
};

export function FactionsPage() {
  const clients = useClients();
  const { from, to } = useDateRange();
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['factions', from, to],
    queryFn: () => clients.stats.getFactionStats(from, to),
  });

  const items = data?.items ?? [];
  const filtered = items.filter(({ army, faction }) => matchesSearch(search, army, faction));
  const { sorted, sortDescriptor, onSortChange } = useClientSort(filtered, SORT_ACCESSORS, {
    column: 'players',
    direction: 'descending',
  });

  let totalPlayers = 0;
  let totalLists = 0;
  let totalGames = 0;
  for (const { players, lists, games, mirrors } of items) {
    totalPlayers += players;
    totalLists += lists;
    // Every game is counted for both sides, mirrors once per game already.
    totalGames += games / 2 + mirrors;
  }

  return (
    <>
      <PageHeader
        kicker={texts.factions.kicker}
        title={texts.common.factions}
        description={texts.factions.description}
        actions={<SearchInput value={search} onChange={setSearch} placeholder={texts.factions.searchArmies} />}
      />

      <QueryState isLoading={isLoading} error={error} isEmpty={items.length === 0}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label={texts.common.armies} value={items.length} />
          <StatTile label={texts.common.players} value={totalPlayers} detail={texts.factions.eventParticipations} />
          <StatTile label={texts.common.lists} value={totalLists} />
          <StatTile label={texts.common.games} value={Math.round(totalGames)} />
        </div>

        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={texts.common.armies} sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
              <Table.Header>
                <SortableColumn id="army" isRowHeader>
                  {texts.common.army}
                </SortableColumn>
                <SortableColumn id="faction">{texts.common.faction}</SortableColumn>
                <SortableColumn id="players">{texts.factions.shareOfPlayers}</SortableColumn>
                <SortableColumn id="lists">{texts.common.lists}</SortableColumn>
                <SortableColumn id="winRate">{texts.common.winRate}</SortableColumn>
                <SortableColumn id="games">{texts.common.winsLossesDraws}</SortableColumn>
                <SortableColumn id="mirrors">{texts.factions.mirrors}</SortableColumn>
              </Table.Header>
              <Table.Body>
                {sorted.map(({ army, faction, players, lists, games, wins, losses, draws, winRate, mirrors }) => (
                  <Table.Row
                    key={army}
                    id={army}
                    href={`/factions/${encodeURIComponent(army)}`}
                    className={classNames('cursor-pointer', { 'opacity-60': players === 0 && lists === 0 })}
                  >
                    <Table.Cell className="font-semibold">
                      <ArmyLink army={army} faction={faction} />
                    </Table.Cell>
                    <Table.Cell>{faction ?? '–'}</Table.Cell>
                    <Table.Cell>
                      <Share part={players} total={totalPlayers} />
                    </Table.Cell>
                    <Table.Cell>{lists}</Table.Cell>
                    <Table.Cell>
                      <WinRate winRate={winRate} games={games} />
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      {wins} / {losses} / {draws}
                    </Table.Cell>
                    <Table.Cell>{mirrors}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </QueryState>
    </>
  );
}
