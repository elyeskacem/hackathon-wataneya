import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';

const W = 160;
const H = 120;

/** Fills a canvas with grey TV snow. Shared by the DOM static and the in-scene texture. */
export function drawStatic(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const img = ctx.createImageData(width, height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** Animated snow texture for the TV screen; it only redraws while `active`. */
export function useStaticTexture(active: boolean, animate: boolean) {
  const { texture, ctx } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    drawStatic(ctx, W, H);
    const texture = new CanvasTexture(canvas);
    texture.magFilter = NearestFilter;
    texture.colorSpace = SRGBColorSpace;
    return { texture, ctx };
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  const last = useRef(0);
  useFrame((state) => {
    if (!active || !animate) return;
    const t = state.clock.elapsedTime;
    if (t - last.current < 1 / 24) return;
    last.current = t;
    drawStatic(ctx, W, H);
    texture.needsUpdate = true;
  });

  return texture;
}
