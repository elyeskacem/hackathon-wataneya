import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useSettings } from '../../app/settingsStore';
import styles from './BeforeAfterSlider.module.css';

/** Share of the frame covered by the original once the intro settles (handle on the original side). */
const START = 80;
const STEP = 5;

interface SliderProps {
  src: string;
  originalLabel: string;
  colourLabel: string;
  sliderLabel: string;
  badge: string;
}

/**
 * Before/after comparison. The original covers the whole frame on open, then the handle
 * eases back to show a sliver of colour. Drag, touch, arrow keys, Home/End all work.
 * Images never mirror, so the frame stays left-to-right in both languages.
 */
export function BeforeAfterSlider({ src, originalLabel, colourLabel, sliderLabel, badge }: SliderProps) {
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const [pos, setPos] = useState(reducedMotion ? START : 100);
  const frame = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(() => setPos(START), 700);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  const fromPointer = (e: PointerEvent) => {
    const rect = frame.current!.getBoundingClientRect();
    setPos(clamp(((e.clientX - rect.left) / rect.width) * 100));
  };

  const onKey = (e: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowLeft: pos - STEP, ArrowRight: pos + STEP, ArrowDown: pos - STEP, ArrowUp: pos + STEP, Home: 0, End: 100 };
    const next = keys[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setPos(clamp(next));
  };

  return (
    <div
      ref={frame}
      className={`${styles.frame} ${dragging ? styles.dragging : ''}`}
      dir="ltr"
      onPointerDown={(e) => {
        setDragging(true);
        frame.current?.setPointerCapture(e.pointerId);
        fromPointer(e);
      }}
      onPointerMove={(e) => dragging && fromPointer(e)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      <img className={styles.image} src={src} alt="" draggable={false} />
      <span className={styles.badge}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1-.8-1.3-.8-2.2 0-.8.7-1.3 1.5-1.3H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
        </svg>
        {badge}
      </span>
      <span className={`${styles.label} ${styles.right}`}>{colourLabel}</span>

      <div className={styles.original} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img className={`${styles.image} ${styles.bw}`} src={src} alt="" draggable={false} />
        <span className={styles.grain} aria-hidden="true" />
        <span className={`${styles.label} ${styles.left}`}>{originalLabel}</span>
      </div>

      <div
        className={styles.handle}
        style={{ left: `${pos}%` }}
        role="slider"
        tabIndex={0}
        aria-label={sliderLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${originalLabel} ${Math.round(pos)}%`}
        onKeyDown={onKey}
        data-testid="archive-slider"
      >
        <span className={styles.knob} aria-hidden="true">
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 1 1 6l5 5M14 1l5 5-5 5" />
          </svg>
        </span>
      </div>
    </div>
  );
}

const clamp = (v: number) => Math.min(100, Math.max(0, v));
