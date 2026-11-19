// Increase it whenever list parsing, model matching or army resolution changes. The backend re-parses all events on the next start.
export const PARSER_VERSION = 5;

export const PARSER_VERSION_KEY = 'parserVersion';

// The catalog that was imported last, and the one that all events were parsed with.
export const CATALOG_HASH_KEY = 'catalogHash';
export const PARSED_CATALOG_HASH_KEY = 'parsedCatalogHash';
