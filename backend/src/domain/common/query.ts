export type SortOrder = 'asc' | 'desc';

export const toSqlOrder = (order: SortOrder | undefined, fallback: SortOrder) => ((order ?? fallback) === 'asc' ? 'ASC' : 'DESC');

// Case insensitive "contains" pattern for LIKE, with the wildcard characters of the input escaped.
export const toSearchPattern = (search: string) => `%${search.toLowerCase().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface SortRequest<TField extends string> {
  sort?: TField;
  order?: SortOrder;
}
