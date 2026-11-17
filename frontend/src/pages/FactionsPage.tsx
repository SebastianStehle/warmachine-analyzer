import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FactionStatsDto, useClients } from 'src/api';
import { ArmyLink, PageHeader, QueryState, SearchInput, Share, SortHeader, StatTile, WinRate } from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { matchesSearch, useClientSort } from 'src/lib/sorting';

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
  const navigate = useNavigate();
  const { from, to } = useDateRange();
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['factions', from, to],
    queryFn: () => clients.stats.getFactionStats(from, to),
  });

  const items = data?.items ?? [];
  const filtered = items.filter(({ army, faction }) => matchesSearch(search, army, faction));
  const { sorted, sort, toggle } = useClientSort(filtered, SORT_ACCESSORS, { key: 'players', order: 'desc' });

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
        kicker="Meta overview"
        title="Factions"
        description="Share of players, submitted lists and win rates per army. Win rates leave out byes and mirror matches, rates from fewer than 10 games are faded."
        actions={<SearchInput value={search} onChange={setSearch} placeholder="Search armies" />}
      />

      <QueryState isLoading={isLoading} error={error} isEmpty={items.length === 0}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Armies" value={items.length} />
          <StatTile label="Players" value={totalPlayers} detail="Event participations" />
          <StatTile label="Lists" value={totalLists} />
          <StatTile label="Games" value={Math.round(totalGames)} />
        </div>

        <div className="panel overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <SortHeader sortKey="army" sort={sort} onSort={toggle}>
                  Army
                </SortHeader>
                <SortHeader sortKey="faction" sort={sort} onSort={toggle}>
                  Faction
                </SortHeader>
                <SortHeader sortKey="players" sort={sort} onSort={toggle}>
                  Share of players
                </SortHeader>
                <SortHeader sortKey="lists" sort={sort} onSort={toggle}>
                  Lists
                </SortHeader>
                <SortHeader sortKey="winRate" sort={sort} onSort={toggle}>
                  Win rate
                </SortHeader>
                <SortHeader sortKey="games" sort={sort} onSort={toggle}>
                  W / L / D
                </SortHeader>
                <SortHeader sortKey="mirrors" sort={sort} onSort={toggle}>
                  Mirrors
                </SortHeader>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ army, faction, players, lists, games, wins, losses, draws, winRate, mirrors }) => (
                <tr
                  key={army}
                  className="hover:bg-base-200 cursor-pointer"
                  onClick={() => navigate(`/factions/${encodeURIComponent(army)}`)}
                >
                  <td className="font-semibold">
                    <ArmyLink army={army} faction={faction} />
                  </td>
                  <td>{faction ?? '–'}</td>
                  <td>
                    <Share part={players} total={totalPlayers} />
                  </td>
                  <td>{lists}</td>
                  <td>
                    <WinRate winRate={winRate} games={games} />
                  </td>
                  <td className="whitespace-nowrap">
                    {wins} / {losses} / {draws}
                  </td>
                  <td>{mirrors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </>
  );
}
