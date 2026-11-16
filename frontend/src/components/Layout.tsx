import { NavLink, Outlet } from 'react-router-dom';
import { useDateRange } from 'src/lib/date-range';

const NAVIGATION = [
  { to: '/factions', label: 'Factions' },
  { to: '/lists', label: 'Lists' },
  { to: '/events', label: 'Events' },
];

export function Layout() {
  const { from, to, setRange } = useDateRange();

  return (
    <div className="bg-base-200 min-h-screen">
      <div className="navbar bg-base-100 gap-4 px-6 shadow-sm">
        <div className="flex-1 gap-2">
          <span className="text-lg font-bold">Warmachine Analyzer</span>

          <ul className="menu menu-horizontal">
            {NAVIGATION.map(({ to: path, label }) => (
              <li key={path}>
                <NavLink to={path} className={({ isActive }) => (isActive ? 'menu-active' : undefined)}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2">
          <label className="input input-sm w-auto">
            <span className="label">From</span>
            <input type="date" value={from ?? ''} onChange={(event) => setRange(event.target.value, to)} />
          </label>
          <label className="input input-sm w-auto">
            <span className="label">To</span>
            <input type="date" value={to ?? ''} onChange={(event) => setRange(from, event.target.value)} />
          </label>
          {(from || to) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setRange()}>
              Clear
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
