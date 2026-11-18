import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useClients } from 'src/api';

interface CollectionState {
  owned: Record<string, number>;
  setQuantity: (shopId: string, quantity: number) => void;
  clear: () => void;
}

// The collection belongs to the user of the browser, there are no accounts.
export const useCollection = create<CollectionState>()(
  persist(
    (set) => ({
      owned: {},
      setQuantity: (shopId, quantity) =>
        set(({ owned }) => {
          const next = { ...owned };
          if (quantity > 0) {
            next[shopId] = quantity;
          } else {
            delete next[shopId];
          }
          return { owned: next };
        }),
      clear: () => set({ owned: {} }),
    }),
    { name: 'collection' },
  ),
);

export function useOwnedProducts() {
  const owned = useCollection((state) => state.owned);
  return Object.entries(owned).map(([shopId, quantity]) => ({ shopId, quantity }));
}

// The prices depend on the collection, which only exists in the browser, so they are calculated on request.
export function useListPrices(listIds: number[]) {
  const clients = useClients();
  const owned = useOwnedProducts();

  return useQuery({
    queryKey: ['list-prices', listIds, owned],
    queryFn: () => clients.lists.getListPrices({ listIds, owned }),
    enabled: owned.length > 0 && listIds.length > 0,
    placeholderData: keepPreviousData,
  });
}
