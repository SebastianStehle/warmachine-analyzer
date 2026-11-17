import type { SortDescriptor } from '@heroui/react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type SortDirection = SortDescriptor['direction'];

export interface TableSort<TKey extends string> {
  column: TKey;
  direction: SortDirection;
}

type SortValue = string | number | null | undefined;

function compare(a: SortValue, b: SortValue) {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  }

  return Number(a) - Number(b);
}

// Text columns start ascending, numbers start with the highest value.
const initialDirection = (value: SortValue): SortDirection => (typeof value === 'string' ? 'ascending' : 'descending');

export function useClientSort<T, TKey extends string>(
  items: T[],
  accessors: Record<TKey, (item: T) => SortValue>,
  initial: TableSort<NoInfer<TKey>>,
) {
  const [sortDescriptor, setSortDescriptor] = useState<TableSort<TKey>>(initial);

  const sorted = useMemo(() => {
    const accessor = accessors[sortDescriptor.column];
    const direction = sortDescriptor.direction === 'ascending' ? 1 : -1;

    return [...items].sort((left, right) => {
      const a = accessor(left);
      const b = accessor(right);

      const aEmpty = a === null || a === undefined;
      const bEmpty = b === null || b === undefined;
      if (aEmpty || bEmpty) {
        return Number(aEmpty) - Number(bEmpty);
      }

      return compare(a, b) * direction;
    });
    // The accessors are recreated on every render, but only depend on the sort column.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sortDescriptor]);

  const onSortChange = ({ column, direction }: SortDescriptor) => {
    const key = column as TKey;

    setSortDescriptor((current) => {
      if (current.column === key) {
        return { column: key, direction };
      }

      const sample = items.map(accessors[key]).find((value) => value !== null && value !== undefined);
      return { column: key, direction: initialDirection(sample) };
    });
  };

  return { sorted, sortDescriptor, onSortChange };
}

// Stored in the URL, so that links and the back button keep the sort order.
export function useServerSort<TKey extends string>(initial: TableSort<NoInfer<TKey>>, textKeys: NoInfer<TKey>[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const sortDescriptor: TableSort<TKey> = {
    column: (searchParams.get('sort') as TKey) ?? initial.column,
    direction:
      searchParams.get('order') === 'asc' ? 'ascending' : searchParams.get('order') === 'desc' ? 'descending' : initial.direction,
  };

  const onSortChange = ({ column, direction }: SortDescriptor) => {
    const key = column as TKey;
    const next = new URLSearchParams(searchParams);
    const nextDirection = sortDescriptor.column === key ? direction : textKeys.includes(key) ? 'ascending' : 'descending';

    next.set('sort', key);
    next.set('order', nextDirection === 'ascending' ? 'asc' : 'desc');
    next.delete('page');
    setSearchParams(next);
  };

  return {
    sortDescriptor,
    onSortChange,
    sort: sortDescriptor.column,
    order: sortDescriptor.direction === 'ascending' ? 'asc' : 'desc',
  } as const;
}

export function matchesSearch(search: string, ...values: (string | null | undefined)[]) {
  if (!search) {
    return true;
  }

  const query = search.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(query));
}
