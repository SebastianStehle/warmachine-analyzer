import highsLoader, { Highs, HighsSolution } from 'highs';

// Defenses are terrain from command cards, every army can take them and the shop sells them as sets per army.
export const NOT_SOLD_MODELS = ['Defenses'];

// Kits that build one of several models, e.g. a heavy warjack chassis for a Toro, Suppressor or Vindicator.
export interface ProductChoice {
  modelIds: number[];
  quantity: number;
}

export interface PricedProduct {
  id: number;
  price: number;
  models: Map<number, number>;
  choices: ProductChoice[];
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
const chosenBoxVariable = (index: number) => `s${index}`;
const builtVariable = (index: number, choice: number, modelId: number) => `x${index}_${choice}_${modelId}`;

const contains = ({ models, choices }: PricedProduct, modelId: number) =>
  models.has(modelId) || choices.some(({ modelIds }) => modelIds.includes(modelId));

function isBox({ models, choices }: PricedProduct) {
  let count = 0;
  for (const quantity of models.values()) {
    count += quantity;
  }
  for (const { quantity } of choices) {
    count += quantity;
  }
  return count > 1;
}

// Finds the products to buy for a list. One box with several models is preferred, even when single kits are cheaper,
// because it leaves room for changes to the list: the box that contains the most required models is always bought.
// Several boxes are not preferred, because they stack up duplicates. The rest is the cheapest combination that
// contains every model at least as often as required, further boxes only when they are cheaper.
//
// Both steps are small integer programs: one variable per product (how often it is bought), one binary variable per box
// (whether it is the preferred box, at most one) and one binary variable per model that a box can contain (whether the
// preferred box contains it). A kit that builds one of several models gets one integer variable per model (how often
// it is built), together at most as often as the kit is bought. The first step maximizes the models from the preferred box, the second minimizes the price
// while keeping that number.
export async function findCheapestProducts(required: Map<number, number>, products: PricedProduct[]): Promise<ProductSelection> {
  const candidates = products.filter((product) => [...required.keys()].some((modelId) => contains(product, modelId)));

  const coverable = new Map<number, number>();
  let unpricedModels = 0;
  for (const [modelId, count] of required) {
    if (candidates.some((candidate) => contains(candidate, modelId))) {
      coverable.set(modelId, count);
    } else {
      unpricedModels += count;
    }
  }

  if (coverable.size === 0) {
    return { price: null, products: [], unpricedModels };
  }

  const boxes = candidates.map((candidate, index) => ({ candidate, index })).filter(({ candidate }) => isBox(candidate));
  const boxModels = [...coverable.keys()].filter((modelId) => boxes.some(({ candidate }) => contains(candidate, modelId)));

  const builds: { index: number; choice: number; modelId: number }[] = [];
  candidates.forEach(({ choices }, index) => {
    choices.forEach(({ modelIds }, choice) => {
      for (const modelId of modelIds.filter((id) => coverable.has(id))) {
        builds.push({ index, choice, modelId });
      }
    });
  });

  const constraints = [...coverable].map(([modelId, count]) => {
    const terms = candidates
      .map(({ models }, index) => (models.has(modelId) ? `${models.get(modelId)} ${productVariable(index)}` : null))
      .filter((term) => term !== null);

    for (const build of builds.filter((build) => build.modelId === modelId)) {
      terms.push(builtVariable(build.index, build.choice, modelId));
    }

    return ` m${modelId}: ${terms.join(' + ')} >= ${count}`;
  });

  candidates.forEach(({ choices }, index) => {
    choices.forEach(({ quantity }, choice) => {
      const terms = builds
        .filter((build) => build.index === index && build.choice === choice)
        .map((build) => builtVariable(index, choice, build.modelId));
      if (terms.length > 0) {
        constraints.push(` k${index}_${choice}: ${terms.join(' + ')} - ${quantity} ${productVariable(index)} <= 0`);
      }
    });
  });

  // A model only counts as coming from a box when the preferred box contains it, and the preferred box must be bought.
  const boxConstraints = boxModels.map((modelId) => {
    const terms = boxes.filter(({ candidate }) => contains(candidate, modelId)).map(({ index }) => chosenBoxVariable(index));

    return ` c${modelId}: ${boxVariable(modelId)} - ${terms.join(' - ')} <= 0`;
  });

  if (boxModels.length > 0) {
    boxConstraints.push(` one: ${boxes.map(({ index }) => chosenBoxVariable(index)).join(' + ')} <= 1`);
    for (const { index } of boxes) {
      boxConstraints.push(` u${index}:${chosenBoxVariable(index)} - ${productVariable(index)} <= 0`);
    }
  }

  const binaries =
    boxModels.length > 0 ? [...boxModels.map(boxVariable), ...boxes.map(({ index }) => chosenBoxVariable(index))] : [];

  // Nobody buys a product more often than its most needed model requires.
  const bounds = candidates.map(({ models, choices }, index) => {
    let max = 0;
    for (const [modelId, quantity] of models) {
      max = Math.max(max, Math.ceil((coverable.get(modelId) ?? 0) / quantity));
    }
    for (const { modelIds, quantity } of choices) {
      let builds = 0;
      for (const modelId of modelIds) {
        builds += coverable.get(modelId) ?? 0;
      }
      max = Math.max(max, Math.ceil(builds / quantity));
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
      ` ${[...candidates.map((_, index) => productVariable(index)), ...builds.map(({ index, choice, modelId }) => builtVariable(index, choice, modelId))].join(' ')}`,
      ...(binaries.length > 0 ? ['Binary', ` ${binaries.join(' ')}`] : []),
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
