import { ReactNode } from 'react';

export interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyText?: string;
  children: ReactNode;
}

export function QueryState({ isLoading, error, isEmpty, emptyText, children }: QueryStateProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="alert alert-error">
        <span>Failed to load data: {error instanceof Error ? error.message : String(error)}</span>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div role="alert" className="alert">
        <span>{emptyText ?? 'No data yet. Run the crawler to import events.'}</span>
      </div>
    );
  }

  return <>{children}</>;
}
