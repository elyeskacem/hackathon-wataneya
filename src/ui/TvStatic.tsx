import { useEffect, useRef } from 'react';
import { useSettings } from '../app/settingsStore';
import { drawStatic } from '../stage/staticNoise';

/** DOM TV snow at 24 fps; a single still frame when effects are off or motion is reduced. */
export function TvStatic({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const animate = useSettings((s) => s.effects && !s.reducedMotion);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawStatic(ctx, canvas.width, canvas.height);
    if (!animate) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 1000 / 24) {
        drawStatic(ctx, canvas.width, canvas.height);
        last = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  return <canvas ref={ref} className={className} width={160} height={120} aria-hidden="true" />;
}
