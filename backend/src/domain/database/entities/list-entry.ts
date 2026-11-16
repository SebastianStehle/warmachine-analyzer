import { Column, Entity, Index, PrimaryGeneratedColumn, Repository } from 'typeorm';

export type ListEntryRepository = Repository<ListEntryEntity>;

export type ListEntryKind = 'leader' | 'model' | 'module';

@Entity({ name: 'list_entries' })
export class ListEntryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column('int')
  listId: number;

  @Index()
  @Column('int')
  eventId: number;

  @Column('int')
  position: number;

  @Column('varchar', { length: 200 })
  name: string;

  @Index()
  @Column('varchar', { length: 200 })
  baseName: string;

  @Column('int', { nullable: true })
  points?: number | null;

  @Column('int')
  depth: number;

  @Column('varchar', { length: 20 })
  kind: ListEntryKind;
}
