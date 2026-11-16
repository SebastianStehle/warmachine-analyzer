import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useClients } from 'src/api';
import { Pagination, QueryState } from 'src/components';
import { LONGSHANKS_URL } from 'src/lib/format';

const PAGE_SIZE = 50;

export function EventsPage() {
  const clients = useClients();
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', page],
    queryFn: () => clients.events.getEvents(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Imported events</h1>

      <QueryState isLoading={isLoading} error={error} isEmpty={data?.total === 0}>
        {data && (
          <>
            <div className="card bg-base-100 overflow-x-auto shadow-sm">
              <table className="table-zebra table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Event</th>
                    <th>Type</th>
                    <th>Players</th>
                    <th>Rounds</th>
                    <th>Lists</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(({ id, date, name, location, type, playerCount, rounds, lists }) => (
                    <tr key={id}>
                      <td className="whitespace-nowrap">{date}</td>
                      <td>
                        <a
                          className="link link-hover font-semibold"
                          href={`${LONGSHANKS_URL}/event/${id}/`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {name}
                        </a>
                        {location && <div className="text-base-content/70 text-xs">{location}</div>}
                      </td>
                      <td>{type ?? '–'}</td>
                      <td>{playerCount}</td>
                      <td>{rounds}</td>
                      <td>{lists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
          </>
        )}
      </QueryState>
    </div>
  );
}
