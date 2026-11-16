import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { LONGSHANKS_ENV_SCHEMA, longshanksConfig } from '../longshanks/config';
import { DB_ENV_SCHEMA, DbConfig, dbConfig } from './config';
import { ALL_ENTITIES } from './entities';
import { ALL_MIGRATIONS } from './migrations';

const combineSchemas = (...schemas: Joi.ObjectSchema[]) => {
  let result = Joi.object();
  for (const schema of schemas) {
    result = result.concat(schema);
  }
  return result;
};

// Shared by the API server and the crawler CLI, so both use the same configuration and database.
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [dbConfig, longshanksConfig],
      isGlobal: true,
      validationSchema: combineSchemas(DB_ENV_SCHEMA, LONGSHANKS_ENV_SCHEMA),
    }),
    CqrsModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.getOrThrow<DbConfig>('db');
        return {
          ...config,
          retryAttempts: 10,
          retryDelay: 100,
          entities: ALL_ENTITIES,
          migrations: ALL_MIGRATIONS,
          migrationsRun: true,
        };
      },
    }),
  ],
})
export class CoreModule {}
