import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace, type Mesh, type MeshBasicMaterial, type Texture } from 'three';
import { useSettings } from '../app/settingsStore';
import { BACKDROP_DEPTH, type BackdropFrame } from './useBackdropFrame';

interface BackdropProps {
  frame: BackdropFrame;
  texture: Texture;
  /** Optional pre-blurred version that fades in (0–1) when the room should step back. */
  blurTexture?: Texture;
  blur?: number;
  /** 0 = full brightness, 1 = black. */
  dim?: number;
}

/** Layer depths: the sharp mid plane sits at BACKDROP_DEPTH; blur layers sit behind and in front. */
const FAR_DEPTH = BACKDROP_DEPTH + 1.2;
const NEAR_DEPTH = BACKDROP_DEPTH * 0.6;

/**
 * The 2.5D render as three depth layers, so parallax and depth of field read as space:
 *  1. far: a soft copy that shows through at the edges of the sharp layer (peripheral defocus),
 *  2. mid: the sharp render, fading toward the edges,
 *  3. near: a soft copy close to the camera, visible only in the corners (foreground blur).
 * Characters, the TV and hotspots are separate planes in between (see MomentScene, LobbyScene).
 */
export function Backdrop({ frame, texture, blurTexture, blur = 0, dim = 0 }: BackdropProps) {
  const sharp = useRef<Mesh>(null);
  const soft = useRef<Mesh>(null);
  const farMat = useRef<MeshBasicMaterial>(null);
  const nearMat = useRef<MeshBasicMaterial>(null);
  const reducedMotion = useSettings((s) => s.reducedMotion);

  const generated = useMemo(() => (blurTexture ? null : softCopy(texture)), [texture, blurTexture]);
  useEffect(() => () => generated?.dispose(), [generated]);
  const soften = blurTexture ?? generated!;
  const masks = useMemo(() => ({ mid: maskTexture('mid'), near: maskTexture('near') }), []);
  useEffect(
    () => () => {
      masks.mid.dispose();
      masks.near.dispose();
    },
    [masks],
  );

  useFrame((_, delta) => {
    const k = Math.min(1, delta * 3);
    const shade = 1 - dim;
    for (const mat of [sharp.current?.material, farMat.current, nearMat.current] as (MeshBasicMaterial | undefined)[]) {
      if (mat) mat.color.setScalar(mat.color.r + (shade - mat.color.r) * k);
    }
    const softMat = soft.current?.material as MeshBasicMaterial | undefined;
    if (softMat) softMat.opacity += (blur - softMat.opacity) * k;
  });

  const nearScale = NEAR_DEPTH / BACKDROP_DEPTH;
  const farScale = FAR_DEPTH / BACKDROP_DEPTH;
  return (
    <group>
      <mesh position={[0, 0, -FAR_DEPTH]} scale={farScale}>
        <planeGeometry args={[frame.width, frame.height]} />
        <meshBasicMaterial ref={farMat} map={soften} toneMapped={false} />
      </mesh>
      <group position={[0, 0, -BACKDROP_DEPTH]}>
        <mesh ref={sharp}>
          <planeGeometry args={[frame.width, frame.height]} />
          <meshBasicMaterial map={texture} alphaMap={masks.mid} transparent toneMapped={false} depthWrite={false} />
        </mesh>
        {blurTexture && (
          <mesh ref={soft} position={[0, 0, 0.01]}>
            <planeGeometry args={[frame.width, frame.height]} />
            <meshBasicMaterial map={blurTexture} toneMapped={false} transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
      </group>
      {/* Foreground blur: only the corners, and it slides faster than the room when the camera sways. */}
      {!reducedMotion && (
        <mesh position={[0, 0, -NEAR_DEPTH]} scale={nearScale} renderOrder={5}>
          <planeGeometry args={[frame.width, frame.height]} />
          <meshBasicMaterial ref={nearMat} map={soften} alphaMap={masks.near} transparent opacity={0.9} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/** A tiny, upscaled copy is a cheap, cross-browser blur (canvas filters are not in every Safari). */
function softCopy(texture: Texture): CanvasTexture {
  const image = texture.image as CanvasImageSource & { width: number; height: number };
  const w = 72;
  const h = Math.max(1, Math.round((w * image.height) / image.width));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, w, h);
  const copy = new CanvasTexture(canvas);
  copy.colorSpace = SRGBColorSpace;
  return copy;
}

/** Greyscale alpha masks (three reads the green channel): clear centre or clear edges. */
function maskTexture(kind: 'mid' | 'near'): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size * 0.72);
  if (kind === 'mid') {
    g.addColorStop(0, '#fff');
    g.addColorStop(0.6, '#fff');
    g.addColorStop(1, '#3a3a3a');
  } else {
    g.addColorStop(0, '#000');
    g.addColorStop(0.55, '#000');
    g.addColorStop(1, '#8c8c8c');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}
