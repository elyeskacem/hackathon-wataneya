import { create } from 'zustand';

export type Vec3 = [number, number, number];

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  fov: number;
}

export const REST_POSE: CameraPose = { position: [0, 0, 0], target: [0, 0, -10], fov: 50 };

interface CameraState {
  pose: CameraPose;
  /** Seconds for the glide; 0 jumps (used for the reduced-motion mode and scene changes). */
  duration: number;
  /** Drag-to-look and wheel zoom (lobby only). */
  interactive: boolean;
  setPose: (pose: CameraPose, duration?: number) => void;
  setInteractive: (interactive: boolean) => void;
}

export const useCamera = create<CameraState>()((set) => ({
  pose: REST_POSE,
  duration: 0,
  interactive: false,
  setPose: (pose, duration = 1.6) => set({ pose, duration }),
  setInteractive: (interactive) => set({ interactive }),
}));
