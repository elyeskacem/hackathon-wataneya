import { create } from 'zustand';

export type Vec3 = [number, number, number];

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  fov: number;
  /**
   * Free camera (real 3D scenes): drag, parallax and sway follow the camera's own right and up axes.
   * The 2.5D renders leave it off and keep world axes, because their camera always faces -Z.
   */
  free?: boolean;
}

export const REST_POSE: CameraPose = { position: [0, 0, 0], target: [0, 0, -10], fov: 50 };

interface CameraState {
  pose: CameraPose;
  /** Seconds for the journey (1.2–2 s). With reduced motion the rig dissolves instead of travelling. */
  duration: number;
  /** Drag-to-look and wheel zoom. */
  interactive: boolean;
  /** Counts reduced-motion crossfades, so the DOM dissolve can replay for each one. */
  dissolveTick: number;
  setPose: (pose: CameraPose, duration?: number) => void;
  setInteractive: (interactive: boolean) => void;
  dissolve: () => void;
}

export const useCamera = create<CameraState>()((set) => ({
  pose: REST_POSE,
  duration: 0,
  interactive: false,
  dissolveTick: 0,
  setPose: (pose, duration = 1.6) => set({ pose, duration }),
  setInteractive: (interactive) => set({ interactive }),
  dissolve: () => set((s) => ({ dissolveTick: s.dissolveTick + 1 })),
}));
