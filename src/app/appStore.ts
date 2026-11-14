import { create } from 'zustand';
import type { MomentId } from '../data/moments';

/** 'glow' = fade through warm CRT light (default journey), 'static' = bridge while an asset loads, 'fade' = plain. */
export type Curtain = 'glow' | 'static' | 'fade' | null;

/** VHS on-screen states shown over the stage. */
export type Vhs = 'play' | 'rewind' | 'poweroff' | null;

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
  guideOpen: boolean;
  /** Story mode: scroll, swipe or arrows travel from stop to stop. */
  story: boolean;
  storyIndex: number;
  vhs: Vhs;
  /** The settings menu is open (Esc closes it before anything else). */
  menuOpen: boolean;
  /** Tape shelf drawer in Custom mode. */
  drawerOpen: boolean;
  /** The lobby scene finished loading its textures (entry can show the enter button). */
  lobbyReady: boolean;
  roomReady: boolean;
  tvReady: boolean;
  /** Entry sequence on stage: the tape slides into the TV, then the screen flickers on. */
  entryPhase: 'insert' | 'on' | null;
  /** Full-screen cover that hides scene changes: TV static, or a plain fade (doors, effects off). */
  curtain: Curtain;
  /** The tape is going in: the camera pushes into the TV screen. */
  inserting: boolean;
  /** WebGL is missing or the 3D stage crashed. */
  stageFailed: boolean;
  go: (route: Route) => void;
  setChannel: (channel: number) => void;
  setStaticBurst: (on: boolean) => void;
  setGuideOpen: (open: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setStory: (story: boolean, index?: number) => void;
  setStoryIndex: (index: number) => void;
  setVhs: (vhs: Vhs) => void;
  setMenuOpen: (open: boolean) => void;
  setLobbyReady: () => void;
  setTvReady: () => void;
  setEntryPhase: (phase: 'insert' | 'on' | null) => void;
  setCurtain: (curtain: Curtain) => void;
  setInserting: (on: boolean) => void;
  setStageFailed: () => void;
}

export const useApp = create<AppState>()((set) => ({
  route: { name: 'entry' },
  channel: 1,
  staticBurst: false,
  guideOpen: false,
  story: false,
  storyIndex: 0,
  vhs: null,
  menuOpen: false,
  drawerOpen: false,
  lobbyReady: false,
  roomReady: false,
  tvReady: false,
  entryPhase: null,
  curtain: null,
  inserting: false,
  stageFailed: false,
  go: (route) => set({ route, drawerOpen: false, inserting: false }),
  setChannel: (channel) => set({ channel: ((channel - 1 + 9) % 9) + 1 }),
  setStaticBurst: (staticBurst) => set({ staticBurst }),
  setGuideOpen: (guideOpen) => set({ guideOpen }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setStory: (story, storyIndex = 0) => set({ story, storyIndex }),
  setStoryIndex: (storyIndex) => set({ storyIndex }),
  setVhs: (vhs) => set({ vhs }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setLobbyReady: () => set((s) => ({ roomReady: true, lobbyReady: s.tvReady })),
  setTvReady: () => set((s) => ({ tvReady: true, lobbyReady: s.roomReady })),
  setEntryPhase: (entryPhase) => set({ entryPhase }),
  setCurtain: (curtain) => set({ curtain }),
  setInserting: (inserting) => set({ inserting }),
  setStageFailed: () => set({ stageFailed: true }),
}));

// Dev only: lets tests and screenshots pose the app (e.g. freeze the entry sequence mid-way).
if (import.meta.env.DEV) (window as unknown as { __app: typeof useApp }).__app = useApp;
