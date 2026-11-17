import { Table } from '@heroui/react';
import { ReactNode } from 'react';

export interface SortableColumnProps {
  id: string;
  isRowHeader?: boolean;
  className?: string;
  children: ReactNode;
}

export function SortableColumn({ id, isRowHeader, className, children }: SortableColumnProps) {
  return (
    <Table.Column allowsSorting id={id} isRowHeader={isRowHeader} className={className}>
      {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>{children}</Table.SortableColumnHeader>}
    </Table.Column>
  );
}
