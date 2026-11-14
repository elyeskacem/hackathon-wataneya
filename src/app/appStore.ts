import { create } from 'zustand';
import type { MomentId } from '../data/moments';

export type Route =
  | { name: 'entry' }
  | { name: 'lobby' }
  | { name: 'custom' }
  | { name: 'moment'; momentId: MomentId; roomId?: string };

interface AppState {
  route: Route;
  /** Channel shown on the TV in Custom mode (1–9). */
  channel: number;
  /** True for 0.5 s while the TV shows static between channels or scenes. */
  staticBurst: boolean;
  archiveOpen: boolean;
  guideOpen: boolean;
  /** Tape shelf drawer in Custom mode. */
  drawerOpen: boolean;
  /** The lobby scene finished loading its textures (entry can show the enter button). */
  lobbyReady: boolean;
  go: (route: Route) => void;
  setChannel: (channel: number) => void;
  setStaticBurst: (on: boolean) => void;
  setArchiveOpen: (open: boolean) => void;
  setGuideOpen: (open: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setLobbyReady: () => void;
}

export const useApp = create<AppState>()((set) => ({
  route: { name: 'entry' },
  channel: 1,
  staticBurst: false,
  archiveOpen: false,
  guideOpen: false,
  drawerOpen: false,
  lobbyReady: false,
  go: (route) => set({ route, archiveOpen: false, drawerOpen: false }),
  setChannel: (channel) => set({ channel: ((channel - 1 + 9) % 9) + 1 }),
  setStaticBurst: (staticBurst) => set({ staticBurst }),
  setArchiveOpen: (archiveOpen) => set({ archiveOpen }),
  setGuideOpen: (guideOpen) => set({ guideOpen }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setLobbyReady: () => set({ lobbyReady: true }),
}));
