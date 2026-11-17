import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CasterStatsDto, MatchupStatsDto, UnitStatsDto, useClients } from 'src/api';
import { ArmyLink, PageHeader, QueryState, SearchInput, Share, SortHeader, StatTile, WinRate } from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { factionColor } from 'src/lib/factions';
import { matchesSearch, useClientSort } from 'src/lib/sorting';

type Tab = 'units' | 'casters' | 'matchups';

const TABS: { id: Tab; label: string }[] = [
  { id: 'units', label: 'Models & units' },
  { id: 'casters', label: 'Casters' },
  { id: 'matchups', label: 'Matchups' },
];

const UNIT_ACCESSORS = {
  name: (x: UnitStatsDto) => x.name,
  lists: (x: UnitStatsDto) => x.lists,
  copies: (x: UnitStatsDto) => x.copies,
  averagePoints: (x: UnitStatsDto) => x.averagePoints,
  winRate: (x: UnitStatsDto) => x.winRate,
  games: (x: UnitStatsDto) => x.games,
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

function UnitsTable({ army, units, totalLists }: { army: string; units: UnitStatsDto[]; totalLists: number }) {
  const [search, setSearch] = useState('');
  const { sorted, sort, toggle } = useClientSort(
    units.filter(({ name }) => matchesSearch(search, name)),
    UNIT_ACCESSORS,
    { key: 'lists', order: 'desc' },
  );

  return (
    <>
      <div className="flex justify-end p-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search models and units" />
      </div>
      <table className="table">
        <thead>
          <tr>
            <SortHeader sortKey="name" sort={sort} onSort={toggle}>
              Model / unit
            </SortHeader>
            <SortHeader sortKey="lists" sort={sort} onSort={toggle}>
              In lists
            </SortHeader>
            <SortHeader sortKey="copies" sort={sort} onSort={toggle}>
              Copies
            </SortHeader>
            <SortHeader sortKey="averagePoints" sort={sort} onSort={toggle}>
              Avg. points
            </SortHeader>
            <SortHeader sortKey="winRate" sort={sort} onSort={toggle}>
              Win rate when played
            </SortHeader>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ name, lists, copies, averagePoints, games, winRate }) => (
            <tr key={name} className="hover:bg-base-200">
              <td>
                <Link className="link link-hover font-semibold" to={listsLink(army, { unit: name })}>
                  {name}
                </Link>
              </td>
              <td>
                <Share part={lists} total={totalLists} />
              </td>
              <td>{copies}</td>
              <td>{averagePoints ?? '–'}</td>
              <td>
                <WinRate winRate={winRate} games={games} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function CastersTable({ army, casters, totalLists }: { army: string; casters: CasterStatsDto[]; totalLists: number }) {
  const [search, setSearch] = useState('');
  const { sorted, sort, toggle } = useClientSort(
    casters.filter(({ caster }) => matchesSearch(search, caster)),
    CASTER_ACCESSORS,
    { key: 'lists', order: 'desc' },
  );

  return (
    <>
      <div className="flex justify-end p-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search casters" />
      </div>
      <table className="table">
        <thead>
          <tr>
            <SortHeader sortKey="caster" sort={sort} onSort={toggle}>
              Caster
            </SortHeader>
            <SortHeader sortKey="lists" sort={sort} onSort={toggle}>
              In lists
            </SortHeader>
            <SortHeader sortKey="winRate" sort={sort} onSort={toggle}>
              Win rate
            </SortHeader>
            <SortHeader sortKey="games" sort={sort} onSort={toggle}>
              W / L / D
            </SortHeader>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ caster, lists, games, wins, losses, draws, winRate }) => (
            <tr key={caster} className="hover:bg-base-200">
              <td>
                <Link className="link link-hover font-semibold" to={listsLink(army, { caster })}>
                  {caster}
                </Link>
              </td>
              <td>
                <Share part={lists} total={totalLists} />
              </td>
              <td>
                <WinRate winRate={winRate} games={games} />
              </td>
              <td className="whitespace-nowrap">
                {wins} / {losses} / {draws}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function MatchupsTable({ matchups }: { matchups: MatchupStatsDto[] }) {
  const { sorted, sort, toggle } = useClientSort(matchups, MATCHUP_ACCESSORS, { key: 'games', order: 'desc' });

  return (
    <table className="table">
      <thead>
        <tr>
          <SortHeader sortKey="opponent" sort={sort} onSort={toggle}>
            Against
          </SortHeader>
          <SortHeader sortKey="winRate" sort={sort} onSort={toggle}>
            Win rate
          </SortHeader>
          <SortHeader sortKey="games" sort={sort} onSort={toggle}>
            W / L / D
          </SortHeader>
        </tr>
      </thead>
      <tbody>
        {sorted.map(({ opponent, games, wins, losses, draws, winRate }) => (
          <tr key={opponent} className="hover:bg-base-200">
            <td className="font-semibold">
              <ArmyLink army={opponent} />
            </td>
            <td>
              <WinRate winRate={winRate} games={games} />
            </td>
            <td className="whitespace-nowrap">
              {wins} / {losses} / {draws}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FactionPage() {
  const { army = '' } = useParams();
  const clients = useClients();
  const { from, to } = useDateRange();
  const [tab, setTab] = useState<Tab>('units');

  const { data, isLoading, error } = useQuery({
    queryKey: ['faction', army, from, to],
    queryFn: () => clients.stats.getFactionDetails(army, from, to),
  });

  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/factions">Factions</Link>
          </li>
          <li>{army}</li>
        </ul>
      </div>

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
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label="Players" value={data.stats.players} />
              <StatTile
                label="Lists"
                value={
                  <Link className="link link-hover" to={listsLink(army, {})}>
                    {data.stats.lists}
                  </Link>
                }
              />
              <StatTile label="Win rate" value={<WinRate winRate={data.stats.winRate} games={data.stats.games} />} />
              <StatTile
                label="Record"
                value={`${data.stats.wins} / ${data.stats.losses} / ${data.stats.draws}`}
                detail={`${data.stats.mirrors} mirror matches`}
              />
            </div>

            <div role="tablist" className="tabs tabs-box w-fit">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  role="tab"
                  className={`tab font-display tracking-wide uppercase ${tab === id ? 'tab-active' : ''}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="panel overflow-x-auto">
              {tab === 'units' && <UnitsTable army={army} units={data.units} totalLists={data.stats.lists} />}
              {tab === 'casters' && <CastersTable army={army} casters={data.casters} totalLists={data.stats.lists} />}
              {tab === 'matchups' && <MatchupsTable matchups={data.matchups} />}
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
