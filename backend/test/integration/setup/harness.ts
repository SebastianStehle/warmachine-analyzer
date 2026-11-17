import { randomUUID } from 'crypto';
import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { inject } from 'vitest';
import AppDataSource from 'src/domain/database/data-source';
import { longshanksConfig } from 'src/domain/longshanks/config';
import { runAdminStatement, withDatabase } from './database';

export interface IntegrationTestContext {
  app: INestApplication;
  commandBus: CommandBus;
  queryBus: QueryBus;
  close(): Promise<void>;
}

// Boots real handlers and repositories against a private database cloned from the migrated template.
export async function createIntegrationTest(
  metadata: ModuleMetadata,
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<IntegrationTestContext> {
  const adminUrl = inject('dbAdminUrl');
  const database = `analyzer_test_${randomUUID().replace(/-/g, '')}`;

  await runAdminStatement(adminUrl, `CREATE DATABASE "${database}" TEMPLATE "${inject('dbTemplate')}"`);

  const options = AppDataSource.options as PostgresConnectionOptions;

  let builder = Test.createTestingModule({
    ...metadata,
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [longshanksConfig] }),
      CqrsModule.forRoot(),
      TypeOrmModule.forRoot({
        ...options,
        url: withDatabase(adminUrl, database),
        synchronize: false,
        migrationsRun: false,
        retryAttempts: 0,
      }),
      ...(metadata.imports ?? []),
    ],
  });

  if (configure) {
    builder = configure(builder);
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  await app.init();

  const close = async () => {
    await app.close();
    await runAdminStatement(adminUrl, `DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  };

  return {
    app,
    commandBus: app.get(CommandBus),
    queryBus: app.get(QueryBus),
    close,
  };
}
