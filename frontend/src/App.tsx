import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components';
import { EventsPage } from './pages/EventsPage';
import { FactionPage } from './pages/FactionPage';
import { FactionsPage } from './pages/FactionsPage';
import { ListPage } from './pages/ListPage';
import { ListsPage } from './pages/ListsPage';

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
            <Route path="/events" element={<EventsPage />} />
            <Route path="*" element={<Navigate to="/factions" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
