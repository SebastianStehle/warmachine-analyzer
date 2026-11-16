import { DataSource } from 'typeorm';

// Returns the same connection URL pointed at a different database on the same server.
export function withDatabase(url: string, database: string) {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;

  return parsed.toString();
}

// CREATE/DROP DATABASE cannot run inside a transaction, so it uses a short-lived connection without entities.
export async function runAdminStatement(url: string, sql: string) {
  const dataSource = new DataSource({ type: 'postgres', url, entities: [] });
  await dataSource.initialize();

  try {
    await dataSource.query(sql);
  } finally {
    await dataSource.destroy();
  }
}
