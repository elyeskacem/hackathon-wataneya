import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial, Texture } from 'three';
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

/** The flat render behind a 2.5D scene, with eased blur/dim for focus changes. */
export function Backdrop({ frame, texture, blurTexture, blur = 0, dim = 0 }: BackdropProps) {
  const sharp = useRef<Mesh>(null);
  const soft = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const k = Math.min(1, delta * 3);
    const shade = 1 - dim;
    const sharpMat = sharp.current?.material as MeshBasicMaterial | undefined;
    if (sharpMat) sharpMat.color.setScalar(sharpMat.color.r + (shade - sharpMat.color.r) * k);
    const softMat = soft.current?.material as MeshBasicMaterial | undefined;
    if (softMat) {
      softMat.opacity += (blur - softMat.opacity) * k;
      softMat.color.setScalar(softMat.color.r + (shade - softMat.color.r) * k);
    }
  });

  return (
    <group position={[0, 0, -BACKDROP_DEPTH]}>
      <mesh ref={sharp}>
        <planeGeometry args={[frame.width, frame.height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {blurTexture && (
        <mesh ref={soft} position={[0, 0, 0.01]}>
          <planeGeometry args={[frame.width, frame.height]} />
          <meshBasicMaterial map={blurTexture} toneMapped={false} transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
