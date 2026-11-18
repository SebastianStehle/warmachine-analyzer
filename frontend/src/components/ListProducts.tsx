import { Card, Chip, Link, Table } from '@heroui/react';
import { ListDetailsDto } from 'src/api';
import { useListPrices } from 'src/lib/collection';
import { formatPrice } from 'src/lib/format';
import { texts } from 'src/texts';

export function ListProducts({ list }: { list: ListDetailsDto }) {
  const { currency, unpricedModels } = list;

  const { data: left } = useListPrices([list.id]);
  const remaining = left?.items[0];

  const products = remaining ? remaining.products : list.products;
  const price = remaining ? remaining.price : list.price;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">
          {remaining ? texts.common.listProducts.buyRest : texts.common.listProducts.buyList}
        </h2>
        <span className="font-display text-accent text-2xl font-semibold">{formatPrice(price, currency)}</span>
      </div>

      {!currency ? (
        <p className="text-muted text-sm">
          {texts.common.listProducts.noPrices} <code>npm run crawl -- --shop</code>.
        </p>
      ) : (
        <>
          <p className="text-muted text-sm">
            {remaining && price === 0
              ? texts.common.listProducts.collectionComplete
              : price !== null
                ? texts.common.listProducts.cheapest
                : texts.common.listProducts.noTotal}
            {remaining && price !== 0 && ` ${texts.common.listProducts.collectionLeftOut}`}
            {remaining && list.price !== null && price !== list.price && (
              <> {texts.common.listProducts.withoutCollection(formatPrice(list.price, currency))}</>
            )}
          </p>

          {products.length > 0 && (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label={texts.common.products}>
                  <Table.Header>
                    <Table.Column isRowHeader>{texts.common.product}</Table.Column>
                    <Table.Column>{texts.common.listProducts.quantity}</Table.Column>
                    <Table.Column>{texts.common.price}</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {products.map((product) => (
                      <Table.Row key={product.url} id={product.url}>
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
                        <Table.Cell className="tabular-nums">{product.quantity}</Table.Cell>
                        <Table.Cell className="whitespace-nowrap tabular-nums">
                          {formatPrice(product.price * product.quantity, currency)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}

          {unpricedModels.length > 0 && (
            <p className="text-sm">
              <span className="text-warning font-semibold">{texts.common.listProducts.notInShop}</span>{' '}
              {unpricedModels.join(', ')}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
