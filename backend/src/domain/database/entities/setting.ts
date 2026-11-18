import { Column, Entity, PrimaryColumn, Repository } from 'typeorm';

export type SettingRepository = Repository<SettingEntity>;

@Entity({ name: 'settings' })
export class SettingEntity {
  @PrimaryColumn('varchar', { length: 100 })
  key: string;

  @Column('varchar', { length: 500 })
  value: string;
}
