import { create } from 'zustand';
import type { MomentId } from '../data/moments';

export type Curtain = 'static' | 'fade' | null;

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
  /** Full-screen cover that hides scene changes: TV static, or a plain fade (doors, effects off). */
  curtain: Curtain;
  /** The tape is going in: the camera pushes into the TV screen. */
  inserting: boolean;
  /** WebGL is missing or the 3D stage crashed. */
  stageFailed: boolean;
  go: (route: Route) => void;
  setChannel: (channel: number) => void;
  setStaticBurst: (on: boolean) => void;
  setArchiveOpen: (open: boolean) => void;
  setGuideOpen: (open: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setLobbyReady: () => void;
  setCurtain: (curtain: Curtain) => void;
  setInserting: (on: boolean) => void;
  setStageFailed: () => void;
}

export const useApp = create<AppState>()((set) => ({
  route: { name: 'entry' },
  channel: 1,
  staticBurst: false,
  archiveOpen: false,
  guideOpen: false,
  drawerOpen: false,
  lobbyReady: false,
  curtain: null,
  inserting: false,
  stageFailed: false,
  go: (route) => set({ route, archiveOpen: false, drawerOpen: false, inserting: false }),
  setChannel: (channel) => set({ channel: ((channel - 1 + 9) % 9) + 1 }),
  setStaticBurst: (staticBurst) => set({ staticBurst }),
  setArchiveOpen: (archiveOpen) => set({ archiveOpen }),
  setGuideOpen: (guideOpen) => set({ guideOpen }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setLobbyReady: () => set({ lobbyReady: true }),
  setCurtain: (curtain) => set({ curtain }),
  setInserting: (inserting) => set({ inserting }),
  setStageFailed: () => set({ stageFailed: true }),
}));
