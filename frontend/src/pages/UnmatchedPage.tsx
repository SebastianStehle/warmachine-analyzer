import { Chip, Table } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { UnmatchedEntryDto, useClients } from 'src/api';
import { ListLink, PageHeader, QueryState, SearchInput, SortableColumn, StatTile } from 'src/components';
import { useDateRange } from 'src/lib/date-range';
import { matchesSearch, useClientSort } from 'src/lib/sorting';

// Some entries appear in almost every army, the full list is in the tooltip.
const SHOWN_ARMIES = 3;

const ACCESSORS = {
  name: (x: UnmatchedEntryDto) => x.name,
  kind: (x: UnmatchedEntryDto) => x.kind,
  lists: (x: UnmatchedEntryDto) => x.lists,
  entries: (x: UnmatchedEntryDto) => x.entries,
  armies: (x: UnmatchedEntryDto) => x.armies.length,
  lastSeen: (x: UnmatchedEntryDto) => x.lastSeen,
};

export function UnmatchedPage() {
  const clients = useClients();
  const { from, to } = useDateRange();
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['unmatched', from, to],
    queryFn: () => clients.lists.getUnmatchedEntries(from, to),
  });

  const items = (data?.items ?? []).filter(({ name, armies }) => matchesSearch(search, name, ...armies));
  const { sorted, sortDescriptor, onSortChange } = useClientSort(items, ACCESSORS, { column: 'lists', direction: 'descending' });

  let entries = 0;
  for (const item of data?.items ?? []) {
    entries += item.entries;
  }

  return (
    <>
      <PageHeader
        kicker="Data quality"
        title="Unmatched entries"
        description="List entries that match no model of the catalog. They have no model stats and no price. Fix them in the parser or the catalog, then run npm run crawl -- --reparse."
        actions={<SearchInput value={search} onChange={setSearch} placeholder="Search name or army" />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile label="Distinct names" value={data?.items.length ?? '–'} />
        <StatTile label="Entries" value={data ? entries : '–'} />
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={sorted.length === 0}
        emptyText={data?.items.length === 0 ? 'Every entry matches a model of the catalog.' : 'No entries match the search.'}
      >
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Unmatched entries" sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
              <Table.Header>
                <SortableColumn id="name" isRowHeader>
                  Name
                </SortableColumn>
                <SortableColumn id="kind">Kind</SortableColumn>
                <SortableColumn id="lists">Lists</SortableColumn>
                <SortableColumn id="entries">Entries</SortableColumn>
                <SortableColumn id="armies">Armies</SortableColumn>
                <SortableColumn id="lastSeen">Last seen</SortableColumn>
                <Table.Column>Example</Table.Column>
              </Table.Header>
              <Table.Body>
                {sorted.map((item) => (
                  <Table.Row
                    key={`${item.name}-${item.kind}`}
                    id={`${item.name}-${item.kind}`}
                    href={`/lists?unit=${encodeURIComponent(item.name)}`}
                    className="cursor-pointer"
                  >
                    <Table.Cell className="font-semibold">{item.name}</Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" variant="soft">
                        {item.kind}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell className="tabular-nums">{item.lists}</Table.Cell>
                    <Table.Cell className="tabular-nums">{item.entries}</Table.Cell>
                    <Table.Cell className="text-muted text-sm">
                      <span title={item.armies.join(', ')}>
                        {item.armies.slice(0, SHOWN_ARMIES).join(', ')}
                        {item.armies.length > SHOWN_ARMIES && ` +${item.armies.length - SHOWN_ARMIES} more`}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">{item.lastSeen}</Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <ListLink id={item.exampleListId}>Open list</ListLink>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </QueryState>
    </>
  );
}
