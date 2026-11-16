import { Column, Entity, PrimaryColumn, Repository, UpdateDateColumn } from 'typeorm';

export type PageRepository = Repository<PageEntity>;

@Entity({ name: 'pages' })
export class PageEntity {
  @PrimaryColumn('varchar', { length: 500 })
  url: string;

  @Column('text')
  body: string;

  @UpdateDateColumn()
  fetchedAt: Date;
}
