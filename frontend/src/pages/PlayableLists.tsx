import { Alert, Chip, Table } from '@heroui/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useClients } from 'src/api';
import { ArmyLink, CasterLink, EventLink, MultiSelect, Pagination, PlayerLink, QueryState, StatTile } from 'src/components';
import { useListPrices, useOwnedProducts } from 'src/lib/collection';
import { useDateRange } from 'src/lib/date-range';
import { formatPrice } from 'src/lib/format';
import { texts } from 'src/texts';

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
          <Alert.Title>{texts.collection.playableListsTitle}</Alert.Title>
          <Alert.Description>{texts.collection.playableListsDescription}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile label={texts.collection.listsYouCanBuild} value={data?.playable ?? '–'} />
        <StatTile label={texts.collection.listsChecked} value={data?.total ?? '–'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect
          options={factions?.items.map(({ army }) => army) ?? []}
          selected={armies}
          placeholder={texts.common.allArmies}
          onChange={(selected) => {
            setArmies(selected);
            setPage(0);
          }}
        />
      </div>

      <QueryState isLoading={isLoading} error={error} isEmpty={data?.total === 0} emptyText={texts.common.noListsMatch}>
        {data && (
          <>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label={texts.collection.playableLists}>
                  <Table.Header>
                    <Table.Column>{texts.collection.missing}</Table.Column>
                    <Table.Column>{texts.common.army}</Table.Column>
                    <Table.Column isRowHeader>{texts.common.caster}</Table.Column>
                    <Table.Column>{texts.common.player}</Table.Column>
                    <Table.Column>{texts.common.placing}</Table.Column>
                    <Table.Column>{texts.common.event}</Table.Column>
                    <Table.Column>{texts.common.priceLeft}</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.items.map((list) => (
                      <Table.Row key={list.id} id={list.id} href={`/lists/${list.id}`} className="cursor-pointer">
                        <Table.Cell className="whitespace-nowrap">
                          {list.missingModels === 0 ? (
                            <Chip size="sm" color="success" variant="soft">
                              {texts.collection.ready}
                            </Chip>
                          ) : (
                            texts.collection.missingModels(list.missingModels)
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
                          <span className="text-muted text-xs"> {texts.common.ofPlayers(list.eventPlayers)}</span>
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
