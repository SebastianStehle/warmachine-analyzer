export const listsLink = (filter: Record<string, string>) => `/lists?${new URLSearchParams(filter).toString()}`;
