import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoredDateRange {
  from?: string;
  to?: string;
  setRange: (from?: string, to?: string) => void;
}

// The URL only covers the current page, the store keeps the range when the user follows a link without it.
const useStoredDateRange = create<StoredDateRange>()(
  persist(
    (set) => ({
      setRange: (from, to) => set({ from: from || undefined, to: to || undefined }),
    }),
    { name: 'date-range' },
  ),
);

export function useDateRange() {
  const [searchParams, setSearchParams] = useSearchParams();
  const stored = useStoredDateRange();

  // Until the sync puts the stored range into the URL, the pages already query with it.
  const hasUrlRange = searchParams.has('from') || searchParams.has('to');
  const from = (hasUrlRange ? searchParams.get('from') : stored.from) ?? undefined;
  const to = (hasUrlRange ? searchParams.get('to') : stored.to) ?? undefined;

  const setRange = (nextFrom?: string, nextTo?: string) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of [
      ['from', nextFrom],
      ['to', nextTo],
    ] as const) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    next.delete('page');

    stored.setRange(nextFrom, nextTo);
    setSearchParams(next);
  };

  return { from, to, setRange };
}

export function useDateRangeSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const stored = useStoredDateRange();

  const from = searchParams.get('from');
  const to = searchParams.get('to');

  useEffect(() => {
    if (from || to) {
      // A shared link with a range becomes the range for the following pages as well.
      if (from !== (stored.from ?? null) || to !== (stored.to ?? null)) {
        stored.setRange(from ?? undefined, to ?? undefined);
      }
      return;
    }

    if (stored.from || stored.to) {
      const next = new URLSearchParams(searchParams);
      if (stored.from) {
        next.set('from', stored.from);
      }
      if (stored.to) {
        next.set('to', stored.to);
      }
      setSearchParams(next, { replace: true });
    }
  }, [from, to, stored, searchParams, setSearchParams]);
}
