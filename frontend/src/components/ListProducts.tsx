import { Card, Chip, Link, Table } from '@heroui/react';
import { ListDetailsDto } from 'src/api';
import { formatPrice } from 'src/lib/format';

export function ListProducts({ list }: { list: ListDetailsDto }) {
  const { products, price, currency, unpricedModels } = list;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Buy this list</h2>
        <span className="font-display text-accent text-2xl font-semibold">{formatPrice(price, currency)}</span>
      </div>

      {!currency ? (
        <p className="text-muted text-sm">
          No prices yet. Import the shop with <code>npm run crawl -- --shop</code>.
        </p>
      ) : (
        <>
          <p className="text-muted text-sm">
            {price !== null
              ? 'The cheapest combination of products from the shop that contains all models.'
              : 'No total, because not all models of the list are sold in the shop. The products cover the other models.'}
          </p>

          {products.length > 0 && (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Products">
                  <Table.Header>
                    <Table.Column isRowHeader>Product</Table.Column>
                    <Table.Column>Qty</Table.Column>
                    <Table.Column>Price</Table.Column>
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
                                Sold out
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
              <span className="text-warning font-semibold">Not in the shop:</span> {unpricedModels.join(', ')}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
