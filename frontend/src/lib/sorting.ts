import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type SortOrder = 'asc' | 'desc';

export interface SortState<TKey extends string> {
  key: TKey;
  order: SortOrder;
}

type SortValue = string | number | null | undefined;

function compare(a: SortValue, b: SortValue) {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  }

  return Number(a) - Number(b);
}

// Sorts data that is completely loaded. Empty values always go to the end.
export function useClientSort<T, TKey extends string>(
  items: T[],
  accessors: Record<TKey, (item: T) => SortValue>,
  initial: SortState<NoInfer<TKey>>,
) {
  const [sort, setSort] = useState(initial);

  const sorted = useMemo(() => {
    const accessor = accessors[sort.key];
    const direction = sort.order === 'asc' ? 1 : -1;

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
    // The accessors are recreated on every render, but only depend on the sort key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sort]);

  const toggle = (key: TKey) => {
    setSort((current) => {
      if (current.key === key) {
        return { key, order: current.order === 'asc' ? 'desc' : 'asc' };
      }

      const sample = items.map(accessors[key]).find((value) => value !== null && value !== undefined);
      return { key, order: typeof sample === 'string' ? 'asc' : 'desc' };
    });
  };

  return { sorted, sort, toggle };
}

// Sort state for server side paging, stored in the URL so that links and the back button keep it.
export function useServerSort<TKey extends string>(initial: SortState<NoInfer<TKey>>, textKeys: NoInfer<TKey>[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const sort: SortState<TKey> = {
    key: (searchParams.get('sort') as TKey) ?? initial.key,
    order: (searchParams.get('order') as SortOrder) ?? initial.order,
  };

  const toggle = (key: TKey) => {
    const next = new URLSearchParams(searchParams);
    const order: SortOrder = sort.key === key ? (sort.order === 'asc' ? 'desc' : 'asc') : textKeys.includes(key) ? 'asc' : 'desc';

    next.set('sort', key);
    next.set('order', order);
    next.delete('page');
    setSearchParams(next);
  };

  return { sort, toggle };
}

export function matchesSearch(search: string, ...values: (string | null | undefined)[]) {
  if (!search) {
    return true;
  }

  const query = search.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(query));
}
