import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

export type Locale = 'ar' | 'fr';

interface SettingsState {
  locale: Locale;
  /** Glow, noise, static and scanlines. */
  effects: boolean;
  reducedMotion: boolean;
  muted: boolean;
  seenControlsHint: boolean;
  setLocale: (locale: Locale) => void;
  toggleEffects: () => void;
  toggleReducedMotion: () => void;
  setMuted: (muted: boolean) => void;
  markHintSeen: () => void;
}

// Storage can be missing or throw (private windows, blocked site data); the app must still run.
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* preferences are a convenience only */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

const prefersReducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      locale: 'ar',
      effects: !prefersReducedMotion,
      reducedMotion: prefersReducedMotion,
      muted: true,
      seenControlsHint: false,
      setLocale: (locale) => set({ locale }),
      toggleEffects: () => set((s) => ({ effects: !s.effects })),
      toggleReducedMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
      setMuted: (muted) => set({ muted }),
      markHintSeen: () => set({ seenControlsHint: true }),
    }),
    {
      name: 'zawaya-settings',
      storage: createJSONStorage(() => safeStorage),
      // Sound always starts muted until the visitor taps "enter".
      partialize: ({ locale, effects, reducedMotion, seenControlsHint }) => ({ locale, effects, reducedMotion, seenControlsHint }),
    },
  ),
);
