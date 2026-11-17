import { describe, expect, it } from 'vitest';
import { findCheapestProducts, PricedProduct } from './pricing';

const LEADER = 1;
const WARJACK = 2;
const UNIT = 3;
const SOLO = 4;
const NOT_IN_SHOP = 5;

const product = (id: number, price: number, models: [number, number][]): PricedProduct => ({
  id,
  price,
  models: new Map(models),
});

describe('findCheapestProducts', () => {
  it('should buy a box when it is cheaper than the single kits', async () => {
    const result = await findCheapestProducts(
      new Map([
        [LEADER, 1],
        [WARJACK, 1],
        [UNIT, 1],
      ]),
      [
        product(10, 9000, [
          [LEADER, 1],
          [WARJACK, 1],
          [UNIT, 1],
        ]),
        product(11, 2500, [[LEADER, 1]]),
        product(12, 4000, [[WARJACK, 1]]),
        product(13, 3500, [[UNIT, 1]]),
      ],
    );

    expect(result).toEqual({ price: 9000, products: [{ id: 10, quantity: 1 }], unpricedModels: 0 });
  });

  it('should combine products and buy them several times when models are needed several times', async () => {
    const result = await findCheapestProducts(
      new Map([
        [LEADER, 1],
        [UNIT, 2],
      ]),
      [
        product(10, 6000, [
          [LEADER, 1],
          [UNIT, 1],
        ]),
        product(11, 2500, [[LEADER, 1]]),
        product(13, 4000, [[UNIT, 1]]),
      ],
    );

    expect(result).toEqual({
      price: 10000,
      products: [
        { id: 10, quantity: 1 },
        { id: 13, quantity: 1 },
      ],
      unpricedModels: 0,
    });
  });

  it('should use the quantity of a model in a product', async () => {
    const result = await findCheapestProducts(new Map([[SOLO, 3]]), [
      product(20, 3000, [[SOLO, 3]]),
      product(21, 1500, [[SOLO, 1]]),
    ]);

    expect(result).toEqual({ price: 3000, products: [{ id: 20, quantity: 1 }], unpricedModels: 0 });
  });

  it('should prefer a box over single kits even when the single kits are cheaper', async () => {
    const result = await findCheapestProducts(
      new Map([
        [LEADER, 1],
        [WARJACK, 1],
      ]),
      [
        product(10, 9000, [
          [LEADER, 1],
          [WARJACK, 1],
          [UNIT, 1],
        ]),
        product(11, 2500, [[LEADER, 1]]),
        product(12, 4000, [[WARJACK, 1]]),
      ],
    );

    expect(result).toEqual({ price: 9000, products: [{ id: 10, quantity: 1 }], unpricedModels: 0 });
  });

  it('should take further copies of a model from single kits instead of buying the box again', async () => {
    const result = await findCheapestProducts(
      new Map([
        [LEADER, 1],
        [UNIT, 3],
      ]),
      [
        product(10, 9000, [
          [LEADER, 1],
          [UNIT, 1],
        ]),
        product(13, 3500, [[UNIT, 1]]),
      ],
    );

    expect(result).toEqual({
      price: 16000,
      products: [
        { id: 10, quantity: 1 },
        { id: 13, quantity: 2 },
      ],
      unpricedModels: 0,
    });
  });

  it('should count models that no product contains', async () => {
    const result = await findCheapestProducts(
      new Map([
        [LEADER, 1],
        [NOT_IN_SHOP, 2],
      ]),
      [product(11, 2500, [[LEADER, 1]])],
    );

    expect(result).toEqual({ price: 2500, products: [{ id: 11, quantity: 1 }], unpricedModels: 2 });
  });

  it('should have no price when the shop has none of the models', async () => {
    const result = await findCheapestProducts(new Map([[NOT_IN_SHOP, 1]]), [product(11, 2500, [[LEADER, 1]])]);

    expect(result).toEqual({ price: null, products: [], unpricedModels: 1 });
  });
});
