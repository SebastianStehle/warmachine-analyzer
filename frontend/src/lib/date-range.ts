import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DateRangeState {
  from?: string;
  to?: string;
  setRange: (from?: string, to?: string) => void;
}

// The date range applies to every page, so it lives in a global store and survives reloads.
export const useDateRange = create<DateRangeState>()(
  persist(
    (set) => ({
      setRange: (from, to) => set({ from: from || undefined, to: to || undefined }),
    }),
    { name: 'date-range' },
  ),
);
