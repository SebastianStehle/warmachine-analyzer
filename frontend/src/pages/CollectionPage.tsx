import { Button, Chip, Link, NumberField, Switch, Table, Tabs } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { memo, useMemo, useState } from 'react';
import { ShopProductDto, useClients } from 'src/api';
import { PageHeader, Pagination, QueryState, SearchInput, StatTile } from 'src/components';
import { useCollection } from 'src/lib/collection';
import { formatPrice } from 'src/lib/format';
import { useTabParam } from 'src/lib/tabs';
import { texts } from 'src/texts';
import { PlayableLists } from './PlayableLists';

// The shop has several hundred products, rendering all of them makes every change of a quantity slow.
const PAGE_SIZE = 50;

const TABS = ['products', 'playable'] as const;

// Only the field of a product subscribes to its quantity, so a change does not render the whole table again.
const OwnedField = memo(function OwnedField({ shopId, title }: { shopId: string; title: string }) {
  const quantity = useCollection((state) => state.owned[shopId] ?? 0);
  const setQuantity = useCollection((state) => state.setQuantity);

  return (
    <NumberField
      aria-label={texts.collection.ownedProduct(title)}
      minValue={0}
      value={quantity}
      onChange={(value) => setQuantity(shopId, Number.isNaN(value) ? 0 : value)}
    >
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input className="w-12 text-center" />
        <NumberField.IncrementButton />
      </NumberField.Group>
    </NumberField>
  );
});

function CollectionStats({ products, currency }: { products: ShopProductDto[]; currency: string | null }) {
  const owned = useCollection((state) => state.owned);

  const ownedProducts = products.filter(({ shopId }) => owned[shopId]);
  const ownedModels = ownedProducts.reduce(
    (sum, { shopId, models }) => sum + owned[shopId] * models.reduce((count, { quantity }) => count + quantity, 0),
    0,
  );
  const ownedValue = ownedProducts.reduce((sum, { shopId, price }) => sum + owned[shopId] * price, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatTile label={texts.common.products} value={ownedProducts.length} />
      <StatTile label={texts.collection.models} value={ownedModels} />
      <StatTile label={texts.collection.value} value={formatPrice(ownedValue, currency)} />
    </div>
  );
}

export function CollectionPage() {
  const clients = useClients();
  const tabs = useTabParam(TABS, 'products');
  const clear = useCollection((state) => state.clear);
  const hasOwned = useCollection((state) => Object.keys(state.owned).length > 0);
  const [search, setSearch] = useState('');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['shop-products'],
    queryFn: () => clients.shop.getShopProducts(),
  });

  const products = useMemo(() => data?.items ?? [], [data]);
  const term = search.trim().toLowerCase();

  // The owned products are taken when the filter changes, so a product does not disappear while its quantity is edited.
  const visible = useMemo(() => {
    const owned = useCollection.getState().owned;

    return products.filter(
      (product) =>
        (!ownedOnly || owned[product.shopId]) &&
        (!term ||
          product.title.toLowerCase().includes(term) ||
          product.models.some(({ name }) => name.toLowerCase().includes(term))),
    );
  }, [products, ownedOnly, term]);

  const pageItems = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <PageHeader kicker={texts.collection.kicker} title={texts.common.collection} description={texts.collection.description} />

      <Tabs {...tabs}>
        <Tabs.ListContainer>
          <Tabs.List aria-label={texts.common.collection} className="w-fit">
            <Tabs.Tab id="products" className="font-display tracking-wide uppercase">
              {texts.common.products}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="playable" className="font-display tracking-wide uppercase">
              {texts.collection.playableLists}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel className="flex flex-col gap-4 pt-4" id="products">
          <CollectionStats products={products} currency={data?.currency ?? null} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(0);
              }}
              placeholder={texts.collection.searchPlaceholder}
            />

            <Switch
              isSelected={ownedOnly}
              onChange={(value) => {
                setOwnedOnly(value);
                setPage(0);
              }}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                {texts.collection.onlyOwned}
              </Switch.Content>
            </Switch>

            {hasOwned && (
              <Button size="sm" variant="ghost" onPress={clear}>
                {texts.collection.removeAll}
              </Button>
            )}
          </div>

          <QueryState
            isLoading={isLoading}
            error={error}
            isEmpty={visible.length === 0}
            emptyText={products.length === 0 ? texts.collection.noProducts : texts.collection.noProductsMatch}
          >
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label={texts.common.products}>
                  <Table.Header>
                    <Table.Column isRowHeader>{texts.common.product}</Table.Column>
                    <Table.Column>{texts.collection.models}</Table.Column>
                    <Table.Column>{texts.common.price}</Table.Column>
                    <Table.Column>{texts.collection.owned}</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {pageItems.map((product) => (
                      <Table.Row key={product.shopId} id={product.shopId}>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            {product.imageUrl && (
                              <img
                                src={product.imageUrl}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded object-cover"
                                loading="lazy"
                              />
                            )}
                            <Link href={product.url} target="_blank" rel="noreferrer">
                              {product.title}
                              <Link.Icon />
                            </Link>
                            {!product.available && (
                              <Chip size="sm" color="warning" variant="soft">
                                {texts.common.soldOut}
                              </Chip>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-muted text-sm">
                          {product.models.map(({ name, quantity }) => (quantity > 1 ? `${quantity}× ${name}` : name)).join(', ')}
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap tabular-nums">
                          {formatPrice(product.price, data?.currency ?? null)}
                        </Table.Cell>
                        <Table.Cell>
                          <OwnedField shopId={product.shopId} title={product.title} />
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>

            <Pagination page={page} pageSize={PAGE_SIZE} total={visible.length} onChange={setPage} />
          </QueryState>
        </Tabs.Panel>
        <Tabs.Panel className="pt-4" id="playable">
          <PlayableLists />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
