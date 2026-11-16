import { Column, Entity, Index, PrimaryColumn, Repository } from 'typeorm';

export type GameRepository = Repository<GameEntity>;

@Entity({ name: 'games' })
export class GameEntity {
  @PrimaryColumn('int')
  id: number;

  @Index()
  @Column('int')
  eventId: number;

  @Column('int')
  round: number;

  @Column('int', { nullable: true })
  table?: number | null;

  @Column('varchar', { length: 100, nullable: true })
  scenario?: string | null;

  @Column('boolean')
  isBye: boolean;
}
