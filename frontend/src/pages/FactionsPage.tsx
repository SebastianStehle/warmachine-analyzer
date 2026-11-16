import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useClients } from 'src/api';
import { QueryState, Share, WinRate } from 'src/components';
import { useDateRange } from 'src/lib/date-range';

export function FactionsPage() {
  const clients = useClients();
  const navigate = useNavigate();
  const { from, to } = useDateRange();

  const { data, isLoading, error } = useQuery({
    queryKey: ['factions', from, to],
    queryFn: () => clients.stats.getFactionStats(from, to),
  });

  const items = data?.items ?? [];

  let totalPlayers = 0;
  for (const { players } of items) {
    totalPlayers += players;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Factions</h1>
        <p className="text-base-content/80 text-sm">
          Win rates exclude byes and mirror matches. Rates based on fewer than 10 games are faded.
        </p>
      </div>

      <QueryState isLoading={isLoading} error={error} isEmpty={items.length === 0}>
        <div className="card bg-base-100 overflow-x-auto shadow-sm">
          <table className="table-zebra table">
            <thead>
              <tr>
                <th>Army</th>
                <th>Faction</th>
                <th>Share of players</th>
                <th>Lists</th>
                <th>Win rate</th>
                <th>W / L / D</th>
                <th>Mirrors</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ army, faction, players, lists, games, wins, losses, draws, winRate, mirrors }) => (
                <tr
                  key={army}
                  className="hover:bg-base-200 cursor-pointer"
                  onClick={() => navigate(`/factions/${encodeURIComponent(army)}`)}
                >
                  <td className="font-semibold">{army}</td>
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
    </div>
  );
}
