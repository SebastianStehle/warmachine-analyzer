import { ArmyListEntity } from './army-list';
import { EventEntity } from './event';
import { GameEntity } from './game';
import { GamePlayerEntity } from './game-player';
import { ListEntryEntity } from './list-entry';
import { PageEntity } from './page';
import { ParticipantEntity } from './participant';
import { PlayerEntity } from './player';

export * from './army-list';
export * from './event';
export * from './game';
export * from './game-player';
export * from './list-entry';
export * from './page';
export * from './participant';
export * from './player';

export const ALL_ENTITIES = [
  ArmyListEntity,
  EventEntity,
  GameEntity,
  GamePlayerEntity,
  ListEntryEntity,
  PageEntity,
  ParticipantEntity,
  PlayerEntity,
];
