import { useApp } from '../app/appStore';
import { useSettings } from '../app/settingsStore';
import { TvStatic } from './TvStatic';
import styles from './Curtain.module.css';

/** Full-screen static between scenes; a plain fade when effects are off or motion is reduced. */
export function Curtain() {
  const curtain = useApp((s) => s.curtain);
  const plain = useSettings((s) => !s.effects || s.reducedMotion);
  return (
    <div className={`${styles.curtain} ${curtain ? styles.on : ''}`} aria-hidden="true" data-testid="curtain" data-on={Boolean(curtain)}>
      {curtain === 'static' && !plain && <TvStatic className={styles.static} />}
    </div>
  );
}
