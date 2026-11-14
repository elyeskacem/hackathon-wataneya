import { useEffect, useState } from 'react';
import { useApp } from '../../app/appStore';
import { useSettings } from '../../app/settingsStore';
import { useT } from '../../i18n/useT';
import { ScenePrompt } from '../../ui/ScenePrompt';
import { startStory } from '../story/story';
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
  const story = useApp((s) => s.story);
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
      {!story && (
        <>
          <ScenePrompt line={t('prompt.lobby')} action={t('prompt.lobby.action')} onAction={() => go({ name: 'custom' })} testId="lobby-prompt" actionTestId="pick-moment" />
          <div className={`${styles.actions} chrome`}>
            <button type="button" className={styles.primary} onClick={startStory} data-testid="start-journey">
              {t('lobby.start')}
            </button>
          </div>
        </>
      )}
    </>
  );
}
