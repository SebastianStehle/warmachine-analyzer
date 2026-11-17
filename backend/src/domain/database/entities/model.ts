import { Column, Entity, PrimaryGeneratedColumn, Repository } from 'typeorm';

export type ModelRepository = Repository<ModelEntity>;

export type ModelType = 'leader' | 'warjack' | 'warbeast' | 'battle-engine' | 'solo' | 'unit' | 'attachment' | 'structure';

@Entity({ name: 'models' })
export class ModelEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 200, unique: true })
  name: string;

  @Column('varchar', { length: 30, nullable: true })
  type: ModelType | null;

  @Column('varchar', { length: 200, nullable: true })
  wikiPage: string | null;

  @Column('simple-json')
  aliases: string[];

  @Column('varchar', { length: 500, nullable: true })
  imageUrl: string | null;
}
