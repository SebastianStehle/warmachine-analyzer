import { Column, Entity, Index, PrimaryGeneratedColumn, Repository } from 'typeorm';

export type ParticipantRepository = Repository<ParticipantEntity>;

@Entity({ name: 'participants' })
@Index(['eventId', 'playerId'], { unique: true })
export class ParticipantEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  eventId: number;

  @Column('int')
  playerId: number;

  @Column('int')
  rank: number;

  @Column('varchar', { length: 100, nullable: true })
  army?: string | null;

  @Column('varchar', { length: 100, nullable: true })
  faction?: string | null;

  @Column('int')
  tournamentPoints: number;

  @Column('int')
  wins: number;

  @Column('int')
  losses: number;

  @Column('int', { nullable: true })
  strengthOfSchedule?: number | null;

  @Column('int', { nullable: true })
  controlPoints?: number | null;

  @Column('int', { nullable: true })
  armyPoints?: number | null;
}
