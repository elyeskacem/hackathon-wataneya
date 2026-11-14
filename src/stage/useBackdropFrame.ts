import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { Vec3 } from './cameraStore';

export const BACKDROP_DEPTH = 10;
const FOV = 50;
/** Extra size so drift and drag never reveal the backdrop edges. */
const OVERSCAN = 1.18;

export interface BackdropFrame {
  width: number;
  height: number;
  /**
   * World position at `depth` (distance from the rest camera) that sits in front of
   * the backdrop pixel (u, v), both 0–1 from the top-left of the image.
   */
  anchor: (u: number, v: number, depth: number) => Vec3;
  /** World units per backdrop-image height at a given depth. */
  heightAt: (depth: number) => number;
}

/**
 * The 2.5D layout: a flat render at BACKDROP_DEPTH that covers the viewport, with props and
 * hotspots placed on rays from the rest camera so they line up with the image and parallax as it moves.
 */
export function useBackdropFrame(imageAspect: number): BackdropFrame {
  const aspect = useThree((s) => s.size.width / s.size.height);
  return useMemo(() => {
    const viewH = 2 * BACKDROP_DEPTH * Math.tan(((FOV / 2) * Math.PI) / 180);
    const viewW = viewH * aspect;
    let width: number;
    let height: number;
    if (aspect > imageAspect) {
      width = viewW * OVERSCAN;
      height = width / imageAspect;
    } else {
      height = viewH * OVERSCAN;
      width = height * imageAspect;
    }
    const anchor = (u: number, v: number, depth: number): Vec3 => {
      const k = depth / BACKDROP_DEPTH;
      return [(u - 0.5) * width * k, (0.5 - v) * height * k, -depth];
    };
    const heightAt = (depth: number) => height * (depth / BACKDROP_DEPTH);
    return { width, height, anchor, heightAt };
  }, [aspect, imageAspect]);
}
