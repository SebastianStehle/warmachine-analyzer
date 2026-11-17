import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { ArmyEntity } from './army';
import { ArmyListEntity } from './army-list';
import { GameEntity } from './game';
import { ModelEntity } from './model';
import { PlayerEntity } from './player';

export type GamePlayerRepository = Repository<GamePlayerEntity>;

export type GameResult = 'win' | 'loss' | 'draw';

@Entity({ name: 'game_players' })
export class GamePlayerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column('int')
  gameId: number;

  @ManyToOne(() => GameEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: GameEntity;

  @Index()
  @Column('int')
  playerId: number;

  @ManyToOne(() => PlayerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'playerId' })
  player: PlayerEntity;

  @Index()
  @Column('int', { nullable: true })
  opponentId: number | null;

  @ManyToOne(() => PlayerEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'opponentId' })
  opponent: PlayerEntity | null;

  @Index()
  @Column('int', { nullable: true })
  armyId: number | null;

  @ManyToOne(() => ArmyEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'armyId' })
  army: ArmyEntity | null;

  @Index()
  @Column('int', { nullable: true })
  opponentArmyId: number | null;

  @ManyToOne(() => ArmyEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'opponentArmyId' })
  opponentArmy: ArmyEntity | null;

  @Index()
  @Column('int', { nullable: true })
  casterId: number | null;

  @ManyToOne(() => ModelEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'casterId' })
  caster: ModelEntity | null;

  @Column('int', { nullable: true })
  opponentCasterId: number | null;

  @ManyToOne(() => ModelEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'opponentCasterId' })
  opponentCaster: ModelEntity | null;

  @Index()
  @Column('int', { nullable: true })
  listId: number | null;

  @ManyToOne(() => ArmyListEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'listId' })
  list: ArmyListEntity | null;

  @Column('varchar', { length: 10 })
  result: GameResult;

  @Column('int', { nullable: true })
  controlPoints: number | null;

  @Column('int', { nullable: true })
  armyPoints: number | null;
}
