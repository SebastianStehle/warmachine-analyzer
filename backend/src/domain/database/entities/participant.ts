import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { ArmyEntity } from './army';
import { EventEntity } from './event';
import { PlayerEntity } from './player';

export type ParticipantRepository = Repository<ParticipantEntity>;

@Entity({ name: 'participants' })
@Index(['eventId', 'playerId'], { unique: true })
export class ParticipantEntity {
  @PrimaryGeneratedColumn()
  id: number;

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
  rank: number;

  @Index()
  @Column('int', { nullable: true })
  armyId: number | null;

  @ManyToOne(() => ArmyEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'armyId' })
  army: ArmyEntity | null;

  @Column('int')
  tournamentPoints: number;

  @Column('int')
  wins: number;

  @Column('int')
  losses: number;

  @Column('int', { nullable: true })
  strengthOfSchedule: number | null;

  @Column('int', { nullable: true })
  controlPoints: number | null;

  @Column('int', { nullable: true })
  armyPoints: number | null;
}
