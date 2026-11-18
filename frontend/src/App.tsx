import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { RouterProvider } from 'react-aria-components';
import { BrowserRouter, Navigate, Route, Routes, useHref, useNavigate } from 'react-router-dom';
import { Layout } from './components';
import { CasterPage } from './pages/CasterPage';
import { CollectionPage } from './pages/CollectionPage';
import { EventPage } from './pages/EventPage';
import { EventsPage } from './pages/EventsPage';
import { FactionPage } from './pages/FactionPage';
import { FactionsPage } from './pages/FactionsPage';
import { ListPage } from './pages/ListPage';
import { ListsPage } from './pages/ListsPage';
import { MatchupsPage } from './pages/MatchupsPage';
import { PlayerPage } from './pages/PlayerPage';
import { PlayersPage } from './pages/PlayersPage';
import { UnmatchedPage } from './pages/UnmatchedPage';

const STALE_TIME_MS = 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: STALE_TIME_MS,
    },
  },
});

const ABSOLUTE_URL = /^([a-z][a-z0-9+.-]*:)?\/\//i;

// The router resolves every href relative to the current route, which breaks links to other sites.
function useAppHref(href: string) {
  const resolved = useHref(href);
  return ABSOLUTE_URL.test(href) ? href : resolved;
}

// Links and table rows of HeroUI navigate with the router instead of reloading the page.
function AriaRouter({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <RouterProvider navigate={navigate} useHref={useAppHref}>
      {children}
    </RouterProvider>
  );
}

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AriaRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/factions" element={<FactionsPage />} />
              <Route path="/factions/:army" element={<FactionPage />} />
              <Route path="/casters/:caster" element={<CasterPage />} />
              <Route path="/matchups" element={<MatchupsPage />} />
              <Route path="/lists" element={<ListsPage />} />
              <Route path="/lists/:id" element={<ListPage />} />
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/players/:id" element={<PlayerPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventPage />} />
              <Route path="/collection" element={<CollectionPage />} />
              <Route path="/unmatched" element={<UnmatchedPage />} />
              <Route path="*" element={<Navigate to="/factions" replace />} />
            </Route>
          </Routes>
        </AriaRouter>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
