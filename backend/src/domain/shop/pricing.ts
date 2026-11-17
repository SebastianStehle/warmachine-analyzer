import highsLoader, { Highs, HighsSolution } from 'highs';

// Defenses are terrain from command cards, every army can take them and the shop sells them as sets per army.
export const NOT_SOLD_MODELS = ['Defenses'];

export interface PricedProduct {
  id: number;
  price: number;
  models: Map<number, number>;
}

export interface ProductSelection {
  price: number | null;
  products: { id: number; quantity: number }[];
  unpricedModels: number;
}

const OPTIMAL = 'Optimal';

let solver: Promise<Highs> | undefined;

// Loading the WebAssembly module is expensive, the solver itself creates a fresh instance for every solve call.
const loadSolver = () => (solver ??= highsLoader());

const productVariable = (index: number) => `p${index}`;
const boxVariable = (modelId: number) => `b${modelId}`;

const isBox = ({ models }: PricedProduct) => [...models.values()].reduce((sum, quantity) => sum + quantity, 0) > 1;

// Finds the products to buy for a list. Boxes with several models are preferred, even when single kits are cheaper,
// because they leave room for changes to the list: every model that is part of a box comes from a box at least once.
// The rest is the cheapest combination that contains every model at least as often as required.
//
// Both steps are small integer programs: one variable per product (how often it is bought) and one binary variable per
// model that a box can contain (whether a bought box contains it). The first step maximizes the models from boxes, the
// second minimizes the price while keeping that number.
export async function findCheapestProducts(required: Map<number, number>, products: PricedProduct[]): Promise<ProductSelection> {
  const candidates = products.filter(({ models }) => [...models.keys()].some((modelId) => required.has(modelId)));

  const coverable = new Map<number, number>();
  let unpricedModels = 0;
  for (const [modelId, count] of required) {
    if (candidates.some(({ models }) => models.has(modelId))) {
      coverable.set(modelId, count);
    } else {
      unpricedModels += count;
    }
  }

  if (coverable.size === 0) {
    return { price: null, products: [], unpricedModels };
  }

  const boxes = candidates.map((candidate, index) => ({ candidate, index })).filter(({ candidate }) => isBox(candidate));
  const boxModels = [...coverable.keys()].filter((modelId) => boxes.some(({ candidate }) => candidate.models.has(modelId)));

  const constraints = [...coverable].map(([modelId, count]) => {
    const terms = candidates
      .map(({ models }, index) => (models.has(modelId) ? `${models.get(modelId)} ${productVariable(index)}` : null))
      .filter((term) => term !== null);

    return ` m${modelId}: ${terms.join(' + ')} >= ${count}`;
  });

  // A model only counts as coming from a box when at least one bought box contains it.
  const boxConstraints = boxModels.map((modelId) => {
    const terms = boxes
      .filter(({ candidate }) => candidate.models.has(modelId))
      .map(({ candidate, index }) => `${candidate.models.get(modelId)} ${productVariable(index)}`);

    return ` c${modelId}: ${boxVariable(modelId)} - ${terms.join(' - ')} <= 0`;
  });

  // Nobody buys a product more often than its most needed model requires.
  const bounds = candidates.map(({ models }, index) => {
    let max = 0;
    for (const [modelId, quantity] of models) {
      max = Math.max(max, Math.ceil((coverable.get(modelId) ?? 0) / quantity));
    }
    return ` 0 <= ${productVariable(index)} <= ${max}`;
  });

  const solve = async (objective: string[], extraConstraints: string[] = []) => {
    const problem = [
      ...objective,
      'Subject To',
      ...constraints,
      ...boxConstraints,
      ...extraConstraints,
      'Bounds',
      ...bounds,
      'General',
      ` ${candidates.map((_, index) => productVariable(index)).join(' ')}`,
      ...(boxModels.length > 0 ? ['Binary', ` ${boxModels.map(boxVariable).join(' ')}`] : []),
      'End',
    ].join('\n');

    const solution = (await loadSolver()).solve(problem);
    if (solution.Status !== OPTIMAL) {
      throw new Error(`Failed to find the cheapest products, solver returned ${solution.Status}.`);
    }

    return solution;
  };

  const boxTerms = boxModels.map(boxVariable).join(' + ');

  const preferBoxes: string[] = [];
  if (boxModels.length > 0) {
    const mostFromBoxes = await solve(['Maximize', ` boxes: ${boxTerms}`]);
    preferBoxes.push(` boxes: ${boxTerms} >= ${Math.round(mostFromBoxes.ObjectiveValue)}`);
  }

  const cheapest = await solve(
    ['Minimize', ` cost: ${candidates.map(({ price }, index) => `${price} ${productVariable(index)}`).join(' + ')}`],
    preferBoxes,
  );

  return { ...toSelection(candidates, cheapest), unpricedModels };
}

function toSelection(candidates: PricedProduct[], solution: HighsSolution) {
  const products: ProductSelection['products'] = [];
  let price = 0;

  candidates.forEach(({ id, price: productPrice }, index) => {
    const column = solution.Columns[productVariable(index)];
    const quantity = column && 'Primal' in column ? Math.round(column.Primal) : 0;
    if (quantity > 0) {
      products.push({ id, quantity });
      price += productPrice * quantity;
    }
  });

  return { price, products };
}
