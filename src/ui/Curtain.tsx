import { useApp } from '../app/appStore';
import { useSettings } from '../app/settingsStore';
import { useCamera } from '../stage/cameraStore';
import { TvStatic } from './TvStatic';
import styles from './Curtain.module.css';

/**
 * Covers scene swaps. Default is a fade through warm CRT light; TV static appears only as a bridge
 * when an asset is slow; a plain fade is used when effects are off or motion is reduced.
 */
export function Curtain() {
  const curtain = useApp((s) => s.curtain);
  const plain = useSettings((s) => !s.effects || s.reducedMotion);
  const dissolveTick = useCamera((s) => s.dissolveTick);
  const kind = curtain && (plain ? 'fade' : curtain);
  return (
    <>
      <div className={`${styles.curtain} ${styles[kind || 'fade']} ${curtain ? styles.on : ''}`} aria-hidden="true" data-testid="curtain" data-on={Boolean(curtain)}>
        {kind === 'static' && <TvStatic className={styles.static} />}
      </div>
      {/* Reduced motion: a camera "journey" is a quick dissolve instead (replays through the key). */}
      {dissolveTick > 0 && <div key={dissolveTick} className={styles.dissolve} aria-hidden="true" />}
    </>
  );
}
