import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components';
import { EventPage } from './pages/EventPage';
import { EventsPage } from './pages/EventsPage';
import { FactionPage } from './pages/FactionPage';
import { FactionsPage } from './pages/FactionsPage';
import { ListPage } from './pages/ListPage';
import { ListsPage } from './pages/ListsPage';
import { PlayerPage } from './pages/PlayerPage';
import { PlayersPage } from './pages/PlayersPage';

const STALE_TIME_MS = 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: STALE_TIME_MS,
    },
  },
});

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/factions" element={<FactionsPage />} />
            <Route path="/factions/:army" element={<FactionPage />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/lists/:id" element={<ListPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/players/:id" element={<PlayerPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventPage />} />
            <Route path="*" element={<Navigate to="/factions" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
