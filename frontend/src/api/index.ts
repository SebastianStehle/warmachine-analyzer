import { useMemo } from 'react';
import { Configuration, EventsApi, ListsApi, StatsApi } from './generated';
export * from './generated';

export class AppClient {
  public readonly events: EventsApi;
  public readonly lists: ListsApi;
  public readonly stats: StatsApi;

  constructor(configuration: Configuration) {
    this.events = new EventsApi(configuration);
    this.lists = new ListsApi(configuration);
    this.stats = new StatsApi(configuration);
  }
}

export function useClients() {
  return useMemo(() => new AppClient(new Configuration({ basePath: import.meta.env.VITE_SERVER_URL || '' })), []);
}
