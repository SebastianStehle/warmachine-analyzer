import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useDateRange } from 'src/lib/date-range';

const NAVIGATION = [
  { to: '/factions', label: 'Factions' },
  { to: '/lists', label: 'Lists' },
  { to: '/players', label: 'Players' },
  { to: '/events', label: 'Events' },
];

function Cog() {
  return (
    <svg viewBox="0 0 24 24" className="text-primary h-8 w-8" fill="currentColor" aria-hidden="true">
      <path d="M10.3 2h3.4l.5 2.6a8 8 0 0 1 1.9.8l2.2-1.5 2.4 2.4-1.5 2.2c.3.6.6 1.2.8 1.9l2.6.5v3.4l-2.6.5a8 8 0 0 1-.8 1.9l1.5 2.2-2.4 2.4-2.2-1.5a8 8 0 0 1-1.9.8l-.5 2.6h-3.4l-.5-2.6a8 8 0 0 1-1.9-.8l-2.2 1.5-2.4-2.4 1.5-2.2a8 8 0 0 1-.8-1.9L2 13.7v-3.4l2.6-.5c.2-.7.5-1.3.8-1.9L3.9 5.7l2.4-2.4 2.2 1.5c.6-.3 1.2-.6 1.9-.8L10.3 2Zm1.7 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
  );
}

export function Layout() {
  const { from, to, setRange } = useDateRange();
  const { pathname } = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);

  // Only the content scrolls, so the browser does not reset the position when navigating to another page.
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-base-300 bg-base-100/90 shrink-0 border-b backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <NavLink to="/factions" className="flex items-center gap-2">
            <Cog />
            <span className="font-display text-xl leading-none font-bold tracking-wide uppercase">
              Warmachine <span className="text-primary">Analyzer</span>
            </span>
          </NavLink>

          <nav className="flex flex-1 gap-1">
            {NAVIGATION.map(({ to: path, label }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `font-display rounded px-3 py-1.5 text-base tracking-wide uppercase transition-colors ${
                    isActive ? 'bg-primary text-primary-content' : 'hover:bg-base-300'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

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
      </header>

      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
