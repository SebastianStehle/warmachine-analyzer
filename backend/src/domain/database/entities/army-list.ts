import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { ArmyEntity } from './army';
import { EventEntity } from './event';
import { ModelEntity } from './model';
import { PlayerEntity } from './player';

export type ArmyListRepository = Repository<ArmyListEntity>;

@Entity({ name: 'army_lists' })
export class ArmyListEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column('int')
  eventId: number;

  @ManyToOne(() => EventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: EventEntity;

  @Index()
  @Column('int')
  playerId: number;

  @ManyToOne(() => PlayerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'playerId' })
  player: PlayerEntity;

  @Column('int')
  sourceId: number;

  @Column('int', { default: 0 })
  sourceIndex: number;

  @Column('varchar', { length: 200 })
  title: string;

  @Index()
  @Column('int')
  armyId: number;

  @ManyToOne(() => ArmyEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'armyId' })
  army: ArmyEntity;

  @Index()
  @Column('int', { nullable: true })
  casterId: number | null;

  @ManyToOne(() => ModelEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'casterId' })
  caster: ModelEntity | null;

  @Column('varchar', { length: 100, nullable: true })
  format: string | null;

  @Column('int', { nullable: true })
  pointLevel: number | null;

  @Column('int', { nullable: true })
  totalPoints: number | null;

  @Index()
  @Column('int', { nullable: true })
  price: number | null;

  @Column('int', { default: 0 })
  unpricedModels: number;

  @Column('simple-json')
  commandCards: string[];

  @Column('simple-json')
  warnings: string[];

  @Column('text')
  rawText: string;
}
