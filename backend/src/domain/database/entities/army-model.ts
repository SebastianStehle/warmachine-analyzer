import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Repository } from 'typeorm';
import { ArmyEntity } from './army';
import { ModelEntity } from './model';

export type ArmyModelRepository = Repository<ArmyModelEntity>;

@Entity({ name: 'army_models' })
export class ArmyModelEntity {
  @PrimaryColumn('int')
  armyId: number;

  @ManyToOne(() => ArmyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'armyId' })
  army: ArmyEntity;

  @PrimaryColumn('int')
  modelId: number;

  @ManyToOne(() => ModelEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modelId' })
  model: ModelEntity;

  @Column('boolean')
  isMercenary: boolean;
}
