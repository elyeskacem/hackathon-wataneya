import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, SRGBColorSpace, type MeshBasicMaterial, type Texture } from 'three';
import { asset } from '../../data/moments';
import type { Vec3 } from '../../stage/cameraStore';
import { TV_BODY as BODY, TV_IMAGE_ASPECT as IMAGE_ASPECT, TV_SCREEN as SCREEN } from './tvGeometry';

export const TV_URL = asset('renders/old-tv.webp');

interface TvSetProps {
  /** World position of the centre of the TV body. */
  position: Vec3;
  /** World height of the TV body (without antenna and tapes). */
  bodyHeight: number;
  picture: Texture | null;
  staticTexture: Texture;
  showStatic: boolean;
  glow: boolean;
}

/** The old TV cut-out with a live screen (picture or static) mapped onto its glass. */
export function TvSet({ position, bodyHeight, picture, staticTexture, showStatic, glow }: TvSetProps) {
  const tv = useTexture(TV_URL, (t) => {
    (t as Texture).colorSpace = SRGBColorSpace;
  });
  const h = bodyHeight / BODY.h;
  const w = h * IMAGE_ASPECT;
  const toLocal = (u: number, v: number): [number, number] => [(u - 0.5) * w, (0.5 - v) * h];

  const screen = useMemo(() => {
    const g = new BufferGeometry();
    const pts = [SCREEN.tl, SCREEN.tr, SCREEN.br, SCREEN.bl].map(([u, v]) => toLocal(u, v));
    g.setAttribute('position', new BufferAttribute(new Float32Array(pts.flatMap(([x, y]) => [x, y, 0.002])), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]), 2));
    g.setIndex([0, 3, 1, 1, 3, 2]);
    return g;
    // toLocal only depends on w and h
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h]);
  useEffect(() => () => screen.dispose(), [screen]);

  const glowTexture = useMemo(() => radialTexture('rgba(255,190,110,0.9)', 'rgba(201,162,39,0)'), []);
  const shadowTexture = useMemo(() => radialTexture('rgba(0,0,0,0.75)', 'rgba(0,0,0,0)'), []);
  useEffect(
    () => () => {
      glowTexture.dispose();
      shadowTexture.dispose();
    },
    [glowTexture, shadowTexture],
  );

  const glowMat = useRef<MeshBasicMaterial>(null);
  useFrame((_, delta) => {
    if (!glowMat.current) return;
    const target = glow ? 0.55 : 0;
    glowMat.current.opacity += (target - glowMat.current.opacity) * Math.min(1, delta * 2);
  });

  // Shift the image so `position` is the centre of the TV body, not of the picture.
  const offset: Vec3 = [-(BODY.cx - 0.5) * w, (BODY.cy - 0.5) * h, 0];
  const [screenCx, screenCy] = toLocal((SCREEN.tl[0] + SCREEN.br[0]) / 2, (SCREEN.tl[1] + SCREEN.br[1]) / 2);

  return (
    <group position={position}>
      <group position={offset}>
        <mesh position={[screenCx, screenCy, -0.02]} renderOrder={0}>
          <planeGeometry args={[w * 1.4, h * 1.2]} />
          <meshBasicMaterial ref={glowMat} map={glowTexture} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, (0.5 - BODY.bottom) * h, -0.01]} renderOrder={1}>
          <planeGeometry args={[w * 0.6, h * 0.12]} />
          <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh renderOrder={2}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={tv} transparent alphaTest={0.02} toneMapped={false} />
        </mesh>
        <mesh geometry={screen} renderOrder={3}>
          <meshBasicMaterial map={showStatic || !picture ? staticTexture : picture} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function radialTexture(inner: string, outer: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}
