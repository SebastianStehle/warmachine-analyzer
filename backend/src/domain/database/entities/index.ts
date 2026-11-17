import { ArmyEntity } from './army';
import { ArmyListEntity } from './army-list';
import { ArmyModelEntity } from './army-model';
import { EventEntity } from './event';
import { FactionEntity } from './faction';
import { GameEntity } from './game';
import { GamePlayerEntity } from './game-player';
import { ListEntryEntity } from './list-entry';
import { ModelEntity } from './model';
import { PageEntity } from './page';
import { ParticipantEntity } from './participant';
import { PlayerEntity } from './player';

export * from './army';
export * from './army-list';
export * from './army-model';
export * from './event';
export * from './faction';
export * from './game';
export * from './game-player';
export * from './list-entry';
export * from './model';
export * from './page';
export * from './participant';
export * from './player';

export const ALL_ENTITIES = [
  ArmyEntity,
  ArmyListEntity,
  ArmyModelEntity,
  EventEntity,
  FactionEntity,
  GameEntity,
  GamePlayerEntity,
  ListEntryEntity,
  ModelEntity,
  PageEntity,
  ParticipantEntity,
  PlayerEntity,
];
