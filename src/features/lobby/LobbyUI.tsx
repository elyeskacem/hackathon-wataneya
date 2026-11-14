import { useEffect, useState } from 'react';
import { useApp } from '../../app/appStore';
import { useSettings } from '../../app/settingsStore';
import { useT } from '../../i18n/useT';
import { switchChannel } from '../custom/channelSwitch';
import { GuideHomeCard } from '../guide/Guide';
import { useGuide } from '../guide/guideStore';
import { ControlsHint } from './ControlsHint';
import styles from './LobbyUI.module.css';

/** Greeting arrives 1 s after the hint is dismissed (motion spec). */
const GREETING_DELAY_MS = 1000;

/** Lobby overlay: controls hint on first visit, then the guide greeting; two actions bottom-centre. */
export function LobbyUI() {
  const { t } = useT();
  const go = useApp((s) => s.go);
  const guideOpen = useApp((s) => s.guideOpen);
  const seenHint = useSettings((s) => s.seenControlsHint);
  const asked = useGuide((s) => s.messages.length > 0);
  const [greet, setGreet] = useState(false);

  useEffect(() => {
    if (!seenHint) return;
    const timer = window.setTimeout(() => setGreet(true), GREETING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [seenHint]);

  return (
    <>
      {!seenHint && <ControlsHint />}
      {greet && !guideOpen && !asked && <GuideHomeCard />}
      <div className={`${styles.actions} chrome`}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            go({ name: 'custom' });
            switchChannel(1);
          }}
          data-testid="start-journey"
        >
          {t('lobby.start')}
        </button>
        <button type="button" className={`${styles.secondary} glass`} onClick={() => go({ name: 'custom' })} data-testid="pick-moment">
          {t('lobby.pick')}
        </button>
      </div>
    </>
  );
}
