import { useApp } from '../app/appStore';
import { useSettings } from '../app/settingsStore';
import { displayYear, momentById } from '../data/moments';
import styles from './VhsOverlay.module.css';

/**
 * VHS on-screen display and effects: tracking lines plus green "▶ PLAY · year" when a tape starts
 * (no year until it is verified), "◀◀" while it rewinds, and the CRT collapsing to a dot on exit.
 * It only runs with effects on and motion not reduced.
 */
export function VhsOverlay() {
  const vhs = useApp((s) => s.vhs);
  const route = useApp((s) => s.route);
  const active = useSettings((s) => s.effects && !s.reducedMotion);
  if (!vhs || !active) return null;

  if (vhs === 'poweroff') return <div className={styles.dot} aria-hidden="true" data-testid="vhs-poweroff" />;

  const year = route.name === 'moment' ? displayYear(momentById(route.momentId)) : null;
  return (
    <div className={`${styles.vhs} ${vhs === 'rewind' ? styles.rewind : ''}`} aria-hidden="true" data-testid={`vhs-${vhs}`}>
      <div className={styles.bands} />
      <p className={styles.osd} dir="ltr">
        {vhs === 'play' ? (year === null ? '▶ PLAY' : `▶ PLAY · ${year}`) : '◀◀'}
      </p>
    </div>
  );
}
