import { DataSource } from 'typeorm';
import { ArmyEntity, ArmyModelEntity, FactionEntity, ModelEntity } from 'src/domain/database';
import { CatalogModel, ModelMatcher } from './model-matcher';

export async function loadModelMatcher(dataSource: DataSource) {
  const [models, armies, armyModels, factions] = await Promise.all([
    dataSource.getRepository(ModelEntity).find(),
    dataSource.getRepository(ArmyEntity).find(),
    dataSource.getRepository(ArmyModelEntity).find(),
    dataSource.getRepository(FactionEntity).find(),
  ]);

  const armyNames = new Map(armies.map(({ id, name }) => [id, name]));
  const factionNames = new Map(factions.map(({ id, name }) => [id, name]));

  const catalog = new Map<number, CatalogModel>();
  for (const { id, name, type, aliases } of models) {
    catalog.set(id, { id, name, type: type ?? null, aliases, armies: [] });
  }

  for (const { armyId, modelId } of armyModels) {
    const army = armyNames.get(armyId);
    if (army) {
      catalog.get(modelId)?.armies.push(army);
    }
  }

  return new ModelMatcher(
    [...catalog.values()],
    armies.map(({ id, name, factionId }) => ({ id, name, faction: factionId ? (factionNames.get(factionId) ?? null) : null })),
  );
}
