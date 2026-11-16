// Connection details are handed from the global setup to every test file via provide/inject.
declare module 'vitest' {
  interface ProvidedContext {
    // Admin connection URL used to create and drop the private databases.
    dbAdminUrl: string;
    // Name of the migrated template database that test databases are cloned from.
    dbTemplate: string;
  }
}

export {};
