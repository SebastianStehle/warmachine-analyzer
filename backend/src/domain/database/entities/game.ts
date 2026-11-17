import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Repository } from 'typeorm';
import { EventEntity } from './event';

export type GameRepository = Repository<GameEntity>;

@Entity({ name: 'games' })
export class GameEntity {
  @PrimaryColumn('int')
  id: number;

  @Index()
  @Column('int')
  eventId: number;

  @ManyToOne(() => EventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: EventEntity;

  @Column('int')
  round: number;

  @Column('int', { nullable: true })
  table: number | null;

  @Column('varchar', { length: 100, nullable: true })
  scenario: string | null;

  @Column('boolean')
  isBye: boolean;
}
