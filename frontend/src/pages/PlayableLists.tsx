import { Alert, Chip, Table } from '@heroui/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useClients } from 'src/api';
import { ArmyLink, CasterLink, EventLink, MultiSelect, Pagination, PlayerLink, QueryState, StatTile } from 'src/components';
import { useListPrices, useOwnedProducts } from 'src/lib/collection';
import { useDateRange } from 'src/lib/date-range';
import { formatPrice } from 'src/lib/format';

const PAGE_SIZE = 50;

export function PlayableLists() {
  const clients = useClients();
  const { from, to } = useDateRange();
  const owned = useOwnedProducts();
  const [armies, setArmies] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const { data: factions } = useQuery({
    queryKey: ['factions', from, to],
    queryFn: () => clients.stats.getFactionStats(from, to),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['playable-lists', from, to, armies, owned, page],
    queryFn: () =>
      clients.lists.getPlayableLists({
        from,
        to,
        page,
        pageSize: PAGE_SIZE,
        army: armies.length > 0 ? armies : undefined,
        owned,
      }),
    enabled: owned.length > 0,
    placeholderData: keepPreviousData,
  });

  const { data: pricesLeft } = useListPrices(data?.items.map(({ id }) => id) ?? []);
  const priceLeft = new Map(pricesLeft?.items.map(({ listId, price }) => [listId, price]));

  if (owned.length === 0) {
    return (
      <Alert>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Add the products you own first.</Alert.Title>
          <Alert.Description>
            Then this tab shows which tournament lists you can build and what the rest would cost.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile label="Lists you can build" value={data?.playable ?? '–'} />
        <StatTile label="Lists checked" value={data?.total ?? '–'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect
          options={factions?.items.map(({ army }) => army) ?? []}
          selected={armies}
          placeholder="All armies"
          onChange={(selected) => {
            setArmies(selected);
            setPage(0);
          }}
        />
      </div>

      <QueryState isLoading={isLoading} error={error} isEmpty={data?.total === 0} emptyText="No lists match the filter.">
        {data && (
          <>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Playable lists">
                  <Table.Header>
                    <Table.Column>Missing</Table.Column>
                    <Table.Column>Army</Table.Column>
                    <Table.Column isRowHeader>Caster</Table.Column>
                    <Table.Column>Player</Table.Column>
                    <Table.Column>Placing</Table.Column>
                    <Table.Column>Event</Table.Column>
                    <Table.Column>Price left</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.items.map((list) => (
                      <Table.Row key={list.id} id={list.id} href={`/lists/${list.id}`} className="cursor-pointer">
                        <Table.Cell className="whitespace-nowrap">
                          {list.missingModels === 0 ? (
                            <Chip size="sm" color="success" variant="soft">
                              Ready
                            </Chip>
                          ) : (
                            `${list.missingModels} ${list.missingModels === 1 ? 'model' : 'models'}`
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <ArmyLink army={list.army} faction={list.faction} />
                        </Table.Cell>
                        <Table.Cell className="font-semibold">
                          <CasterLink caster={list.caster} />
                        </Table.Cell>
                        <Table.Cell>
                          <PlayerLink id={list.playerId}>{list.playerName}</PlayerLink>
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          {list.rank ?? '–'}
                          <span className="text-muted text-xs"> of {list.eventPlayers}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <EventLink id={list.eventId}>{list.eventName}</EventLink>{' '}
                          <span className="text-muted text-xs whitespace-nowrap">({list.eventDate})</span>
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap tabular-nums">
                          {formatPrice(priceLeft.has(list.id) ? priceLeft.get(list.id) : list.price, list.currency)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
          </>
        )}
      </QueryState>
    </div>
  );
}
