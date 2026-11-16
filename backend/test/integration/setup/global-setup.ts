import { randomUUID } from 'crypto';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';
import AppDataSource from 'src/domain/database/data-source';
import { runAdminStatement, withDatabase } from './database';

const POSTGRES_IMAGE = 'postgres:16-alpine';

let container: StartedPostgreSqlContainer | undefined;
let adminUrl: string;
let template: string;

// One container for the whole run, migrated once into a template that every test file clones.
// Set TEST_DB_URL to an existing Postgres server (admin connection) when Docker images cannot be pulled.
export async function setup(project: TestProject) {
  if (process.env.TEST_DB_URL) {
    adminUrl = process.env.TEST_DB_URL;
  } else {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
    adminUrl = container.getConnectionUri();
  }

  template = `analyzer_template_${randomUUID().replace(/-/g, '')}`;
  await runAdminStatement(adminUrl, `CREATE DATABASE "${template}"`);

  AppDataSource.setOptions({ url: withDatabase(adminUrl, template) });
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();

  project.provide('dbAdminUrl', adminUrl);
  project.provide('dbTemplate', template);
}

export async function teardown() {
  if (container) {
    await container.stop();
  } else if (adminUrl) {
    await runAdminStatement(adminUrl, `DROP DATABASE IF EXISTS "${template}" WITH (FORCE)`);
  }
}
