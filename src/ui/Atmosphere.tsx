import { useEffect, useState } from 'react';
import { useSettings } from '../app/settingsStore';
import styles from './Atmosphere.module.css';

/** One small noise tile, drawn once and reused as the film grain. */
function makeGrainTile(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const img = ctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + Math.random() * 120;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

/** Soft vignette always (depth), light film grain only with effects on (nostalgia layer). */
export function Atmosphere() {
  const effects = useSettings((s) => s.effects);
  const [tile, setTile] = useState('');
  useEffect(() => {
    if (effects && !tile) setTile(makeGrainTile());
  }, [effects, tile]);
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <div className={styles.vignette} />
      {effects && tile && <div className={styles.grain} style={{ backgroundImage: `url(${tile})` }} />}
    </div>
  );
}
