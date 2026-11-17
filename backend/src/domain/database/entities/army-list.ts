import { Column, Entity, Index, PrimaryGeneratedColumn, Repository } from 'typeorm';

export type ArmyListRepository = Repository<ArmyListEntity>;

@Entity({ name: 'army_lists' })
export class ArmyListEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column('int')
  eventId: number;

  @Column('int')
  playerId: number;

  @Column('int')
  sourceId: number;

  @Column('int', { default: 0 })
  sourceIndex: number;

  @Column('varchar', { length: 200 })
  title: string;

  @Column('varchar', { length: 100, nullable: true })
  faction?: string | null;

  @Index()
  @Column('varchar', { length: 100, nullable: true })
  army?: string | null;

  @Column('varchar', { length: 200, nullable: true })
  caster?: string | null;

  @Column('varchar', { length: 100, nullable: true })
  format?: string | null;

  @Column('int', { nullable: true })
  pointLevel?: number | null;

  @Column('int', { nullable: true })
  totalPoints?: number | null;

  @Column('simple-json')
  commandCards: string[];

  @Column('simple-json')
  warnings: string[];

  @Column('text')
  rawText: string;
}
