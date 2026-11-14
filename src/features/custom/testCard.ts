import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

// Values mirror the design tokens (a canvas cannot read CSS variables).
const BARS = ['#f5efe3', '#c9a227', '#a39686', '#5a3a24', '#6b6e75', '#2c2d30', '#1b1c1e'];

/**
 * A generic test card for the lobby TV when nobody has touched anything for 30 s.
 * It carries no real channel logo, only bars, a circle and the word TEST.
 */
export function useTestCard(enabled: boolean): CanvasTexture | null {
  const texture = useMemo(() => {
    if (!enabled) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0c0d0e';
    ctx.fillRect(0, 0, 512, 384);
    const w = 512 / BARS.length;
    BARS.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * w, 0, w + 1, 230);
    });
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(256, 292, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(150, 292);
    ctx.lineTo(362, 292);
    ctx.moveTo(256, 222);
    ctx.lineTo(256, 362);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TEST', 256, 38 + 230 - 40);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [enabled]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}
