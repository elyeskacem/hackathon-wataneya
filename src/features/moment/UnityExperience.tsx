import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/appStore';
import { useSettings } from '../../app/settingsStore';
import { announcePlay, leaveMoment, useLiftCurtain } from '../../app/transitions';
import { type MomentId } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { TvStatic } from '../../ui/TvStatic';
import { useMoment } from './momentStore';
import { useAskEntry } from './useAskEntry';
import styles from './UnityExperience.module.css';

/**
 * A moment delivered as a Unity WebGL build (public/experiences/<moment-id>/index.html), full screen in
 * an iframe with our HUD (back, sound, guide) on top. The page and the build talk through postMessage;
 * the messages are listed in docs/3D-HANDOFF.md and are all optional: a plain Unity template still works.
 */
const SOURCE = 'wataniya';
/** Without a "ready" message the loading screen leaves this long after the page itself has loaded. */
const GRACE_MS = 3000;

type FromBuild = { type: 'ready' } | { type: 'exit' } | { type: 'character'; id: string } | { type: 'ask'; entry: string };

function isFromBuild(data: unknown): data is FromBuild {
  return typeof data === 'object' && data !== null && (data as { source?: unknown }).source === SOURCE && typeof (data as { type?: unknown }).type === 'string';
}

export function UnityExperience({ momentId, url }: { momentId: MomentId; url: string }) {
  const { t } = useT();
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const announced = useRef(false);
  const muted = useSettings((s) => s.muted);
  const guideOpen = useApp((s) => s.guideOpen);
  const setCharacter = useMoment((s) => s.setCharacter);
  const askEntry = useAskEntry(momentId);

  // The static bridge from the journey hands over to this component's own loading screen.
  useLiftCurtain(momentId);

  const post = useCallback((message: Record<string, unknown>) => {
    frame.current?.contentWindow?.postMessage({ source: SOURCE, ...message }, window.location.origin);
  }, []);

  const markReady = useCallback(() => {
    setReady(true);
    if (!announced.current) {
      announced.current = true;
      announcePlay();
    }
    frame.current?.focus();
  }, []);

  useEffect(() => {
    useMoment.getState().reset();
  }, [momentId]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow || !isFromBuild(e.data)) return;
      if (e.data.type === 'ready') markReady();
      else if (e.data.type === 'exit') void leaveMoment();
      else if (e.data.type === 'character') setCharacter(e.data.id);
      else if (e.data.type === 'ask') askEntry(e.data.entry);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [askEntry, markReady, setCharacter]);

  // Sound state and the guide ducking follow the page; resent once the build says it is listening.
  useEffect(() => post({ type: 'mute', muted }), [post, muted, ready]);
  useEffect(() => post({ type: 'duck', on: guideOpen }), [post, guideOpen, ready]);

  const onLoad = () => {
    post({ type: 'mute', muted });
    window.setTimeout(markReady, GRACE_MS);
  };

  return (
    <>
      <iframe
        ref={frame}
        className={styles.frame}
        src={url}
        title={t('moment.unity.title')}
        onLoad={onLoad}
        allow="autoplay; fullscreen; gamepad; xr-spatial-tracking; accelerometer; gyroscope"
        data-testid="unity-frame"
      />
      <div className={`${styles.loading} ${ready ? styles.done : ''}`} aria-hidden={ready} data-testid="unity-loading" data-ready={ready}>
        <TvStatic className={styles.static} />
        <p className={`${styles.text} glass`} role="status">
          {t('moment.unity.loading')}
        </p>
      </div>
    </>
  );
}
