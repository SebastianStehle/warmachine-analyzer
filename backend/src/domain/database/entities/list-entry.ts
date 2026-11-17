import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { ArmyListEntity } from './army-list';
import { ModelEntity } from './model';

export type ListEntryRepository = Repository<ListEntryEntity>;

export type ListEntryKind = 'leader' | 'model' | 'module';

@Entity({ name: 'list_entries' })
export class ListEntryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column('int')
  listId: number;

  @ManyToOne(() => ArmyListEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listId' })
  list: ArmyListEntity;

  @Column('int')
  position: number;

  @Column('varchar', { length: 200 })
  name: string;

  @Index()
  @Column('varchar', { length: 200 })
  baseName: string;

  @Column('int', { nullable: true })
  points: number | null;

  @Column('int')
  depth: number;

  @Column('varchar', { length: 20 })
  kind: ListEntryKind;

  @Index()
  @Column('int', { nullable: true })
  modelId: number | null;

  @ManyToOne(() => ModelEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'modelId' })
  model: ModelEntity | null;
}
