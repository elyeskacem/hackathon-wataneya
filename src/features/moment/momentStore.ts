import { create } from 'zustand';

interface MomentState {
  /** Character whose card is open. */
  characterId: string | null;
  /** Camera moved to the room's viewpoint (e.g. the front row). */
  closeUp: boolean;
  setCharacter: (id: string | null) => void;
  toggleCloseUp: () => void;
  reset: () => void;
}

export const useMoment = create<MomentState>()((set) => ({
  characterId: null,
  closeUp: false,
  setCharacter: (characterId) => set({ characterId }),
  toggleCloseUp: () => set((s) => ({ closeUp: !s.closeUp })),
  reset: () => set({ characterId: null, closeUp: false }),
}));
