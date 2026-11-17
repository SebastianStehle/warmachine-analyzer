import classNames from 'classnames';
import { ReactNode } from 'react';
import { SortState } from 'src/lib/sorting';

export interface SortHeaderProps<TKey extends string> {
  sortKey: TKey;
  sort: SortState<TKey>;
  onSort: (key: TKey) => void;
  className?: string;
  children: ReactNode;
}

export function SortHeader<TKey extends string>({ sortKey, sort, onSort, className, children }: SortHeaderProps<TKey>) {
  const isActive = sort.key === sortKey;

  return (
    <th className={className} aria-sort={isActive ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        className={classNames('inline-flex cursor-pointer items-center gap-1 uppercase', { 'text-primary': isActive })}
        onClick={() => onSort(sortKey)}
      >
        {children}
        <span className={classNames('text-xs', { 'opacity-0': !isActive })}>{sort.order === 'asc' ? '▲' : '▼'}</span>
      </button>
    </th>
  );
}
