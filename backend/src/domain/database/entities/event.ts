import { Column, CreateDateColumn, Entity, PrimaryColumn, Repository, UpdateDateColumn } from 'typeorm';

export type EventRepository = Repository<EventEntity>;

@Entity({ name: 'events' })
export class EventEntity {
  @PrimaryColumn('int')
  id: number;

  @Column('varchar', { length: 200 })
  name: string;

  @Column('varchar', { length: 10 })
  date: string;

  @Column('varchar', { length: 300, nullable: true })
  location?: string | null;

  @Column('varchar', { length: 100, nullable: true })
  type?: string | null;

  @Column('int')
  playerCount: number;

  @Column('int')
  rounds: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
