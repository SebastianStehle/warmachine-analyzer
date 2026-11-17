import { Alert, Spinner } from '@heroui/react';
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
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Failed to load data</Alert.Title>
          <Alert.Description>{error instanceof Error ? error.message : String(error)}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  if (isEmpty) {
    return (
      <Alert>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{emptyText ?? 'No data yet. Run the crawler to import events.'}</Alert.Title>
        </Alert.Content>
      </Alert>
    );
  }

  return <>{children}</>;
}
