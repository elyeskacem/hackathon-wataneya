import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture, SRGBColorSpace, type MeshBasicMaterial } from 'three';
import type { Vec3 } from './cameraStore';

interface LampGlowProps {
  position: Vec3;
  /** World width of the halo. */
  size: number;
  /** Seed so two lamps never flicker in step. */
  phase?: number;
  /** Switched off with "effects off" and reduced motion: the halo stays, steady and faint. */
  flicker: boolean;
}

/** A warm halo over a lamp in the render, with the slow irregular flicker of an old bulb. */
export function LampGlow({ position, size, phase = 0, flicker }: LampGlowProps) {
  const mat = useRef<MeshBasicMaterial>(null);
  const map = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,214,150,0.9)');
    g.addColorStop(0.35, 'rgba(255,190,110,0.35)');
    g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, []);
  useEffect(() => () => map.dispose(), [map]);

  useFrame((state) => {
    if (!mat.current) return;
    const t = state.clock.elapsedTime + phase;
    const wobble = flicker ? 0.12 * Math.sin(t * 9.1) * Math.sin(t * 2.3) + 0.06 * Math.sin(t * 31) : 0;
    mat.current.opacity = 0.42 + wobble;
  });

  return (
    <mesh position={position} renderOrder={1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial ref={mat} map={map} transparent opacity={0.4} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
