import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { FactionEntity } from './faction';

export type ArmyRepository = Repository<ArmyEntity>;

@Entity({ name: 'armies' })
export class ArmyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 100, unique: true })
  name: string;

  @Column('int', { nullable: true })
  factionId: number | null;

  @ManyToOne(() => FactionEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'factionId' })
  faction: FactionEntity | null;

  @Column('varchar', { length: 200 })
  wikiIndex: string;
}
