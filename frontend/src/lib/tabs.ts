import type { Key } from '@heroui/react';
import { useSearchParams } from 'react-router-dom';

// The tab is part of the URL, so reloads, links and the back button keep it. Switching tabs replaces the history entry.
export function useTabParam<T extends string>(tabs: readonly T[], fallback: T, param = 'tab') {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(param) as T | null;
  const selectedKey = value && tabs.includes(value) ? value : fallback;

  const onSelectionChange = (key: Key) => {
    const next = new URLSearchParams(searchParams);
    next.set(param, String(key));
    setSearchParams(next, { replace: true });
  };

  return { selectedKey, onSelectionChange };
}
