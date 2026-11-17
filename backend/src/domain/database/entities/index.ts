import { ArmyEntity } from './army';
import { ArmyListEntity } from './army-list';
import { ArmyModelEntity } from './army-model';
import { EventEntity } from './event';
import { FactionEntity } from './faction';
import { GameEntity } from './game';
import { GamePlayerEntity } from './game-player';
import { ListEntryEntity } from './list-entry';
import { ListProductEntity } from './list-product';
import { ModelEntity } from './model';
import { PageEntity } from './page';
import { ParticipantEntity } from './participant';
import { PlayerEntity } from './player';
import { ShopProductEntity } from './shop-product';
import { ShopProductModelEntity } from './shop-product-model';

export * from './army';
export * from './army-list';
export * from './army-model';
export * from './event';
export * from './faction';
export * from './game';
export * from './game-player';
export * from './list-product';
export * from './list-entry';
export * from './model';
export * from './page';
export * from './participant';
export * from './player';
export * from './shop-product';
export * from './shop-product-model';

export const ALL_ENTITIES = [
  ArmyEntity,
  ArmyListEntity,
  ArmyModelEntity,
  EventEntity,
  FactionEntity,
  GameEntity,
  GamePlayerEntity,
  ListEntryEntity,
  ListProductEntity,
  ModelEntity,
  PageEntity,
  ParticipantEntity,
  PlayerEntity,
  ShopProductEntity,
  ShopProductModelEntity,
];
