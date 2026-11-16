import { Column, Entity, PrimaryColumn, Repository } from 'typeorm';

export type PlayerRepository = Repository<PlayerEntity>;

@Entity({ name: 'players' })
export class PlayerEntity {
  @PrimaryColumn('int')
  id: number;

  @Column('varchar', { length: 200 })
  name: string;
}
