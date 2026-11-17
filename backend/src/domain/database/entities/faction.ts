import { Column, Entity, PrimaryGeneratedColumn, Repository } from 'typeorm';

export type FactionRepository = Repository<FactionEntity>;

@Entity({ name: 'factions' })
export class FactionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 100, unique: true })
  name: string;
}
