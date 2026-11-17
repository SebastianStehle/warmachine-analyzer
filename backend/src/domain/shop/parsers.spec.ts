import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseProductPage } from './parsers';

const { products } = parseProductPage(readFileSync(join(__dirname, '../../../test/fixtures/shop/products.json'), 'utf8'));
const byTitle = (title: string) => products.find((product) => product.title.includes(title))!;

describe('parseProducts', () => {
  it('should read the contents of a box from its description', () => {
    expect(byTitle('House Kallyss Core Expansion')).toMatchObject({
      shopId: '8252783001657',
      handle: 'warmachine-dusk-house-kallyss-core-expansion',
      price: 14999,
      available: true,
      armyTags: ['dusk', 'house kallyss'],
      contents: [
        { name: 'Hazaroth, Narcissar of Ruin', quantity: 1 },
        { name: 'Israfyl', quantity: 1 },
        { name: 'Soulless Guardians', quantity: 1 },
        { name: 'Soulless Hunters', quantity: 1 },
        { name: 'Soulless Blademasters', quantity: 1 },
        { name: 'Seeker Adepts', quantity: 1 },
        { name: 'Seeker Warden', quantity: 1 },
      ],
    });
  });

  it('should read quantities when a box contains a model several times', () => {
    expect(byTitle('Court of Shadows').contents).toContainEqual({ name: 'Lesser Eldritch', quantity: 3 });
  });

  it('should take the models from the title when the description has no contents', () => {
    expect(byTitle('Magnus').contents).toEqual([
      { name: 'Magnus the Unstoppable', quantity: 1 },
      { name: 'Invictus', quantity: 1 },
    ]);
  });

  it('should read contents when the base size follows the type', () => {
    expect(byTitle('Abyssal King').contents).toEqual([{ name: 'Abyssal King', quantity: 1 }]);
  });

  it('should take the models from the title when the contents do not name the types', () => {
    expect(byTitle('Meat Thresher').contents).toEqual([{ name: 'Meat Thresher', quantity: 1 }]);
  });

  it('should read contents with several parentheses', () => {
    expect(byTitle('Constance Blaize and Gallant').contents).toEqual([
      { name: 'Constance Blaize, Radiance of Morrow', quantity: 1 },
      { name: 'Gallant', quantity: 1 },
    ]);
  });

  it('should not count chassis variants as models, because they come without weapons and heads', () => {
    expect(byTitle('Stryker Chassis Variant').contents).toEqual([]);
  });

  it('should not count defenses as models, because they are terrain', () => {
    expect(byTitle('Gravediggers Defenses Set').contents).toEqual([]);
  });
});
