import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  showEquipment: boolean;
  setShowEquipment: (value: boolean) => void;
}

// Display preferences that should survive reloads.
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      showEquipment: true,
      setShowEquipment: (showEquipment) => set({ showEquipment }),
    }),
    { name: 'preferences' },
  ),
);
