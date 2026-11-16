import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { loadDbConfig } from './config';
import { ALL_ENTITIES } from './entities';
import { ALL_MIGRATIONS } from './migrations';

config();

export default new DataSource({
  ...loadDbConfig(),
  entities: ALL_ENTITIES,
  migrations: ALL_MIGRATIONS,
});
