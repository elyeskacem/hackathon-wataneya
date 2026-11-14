import { useState } from 'react';
import { useApp } from './appStore';
import { useSettings } from './settingsStore';
import { useIdle } from './useIdle';
import { useDocumentLocale } from '../i18n/useT';
import { EntryScreen } from '../features/entry/EntryScreen';
import { Guide } from '../features/guide/Guide';
import { LobbyUI } from '../features/lobby/LobbyUI';
import { CustomUI } from '../features/custom/CustomUI';
import { MomentUI } from '../features/moment/MomentUI';
import { Curtain } from '../ui/Curtain';
import { Atmosphere } from '../ui/Atmosphere';
import { VhsOverlay } from '../ui/VhsOverlay';
import { momentById } from '../data/moments';
import { experienceFor } from '../features/moment/experience';
import { UnityExperience } from '../features/moment/UnityExperience';
import { useAmbience } from '../audio/useAmbience';
import { Stage } from '../stage/Stage';
import { usePreloadNext } from '../stage/preload';
import { StoryBar } from '../features/story/StoryBar';
import { useTravelInput } from '../features/story/useTravelInput';
import { TopBar } from '../ui/TopBar';
import styles from './App.module.css';

export function App() {
  useDocumentLocale();
  useAmbience();
  usePreloadNext();
  useTravelInput();
  const route = useApp((s) => s.route);
  const story = useApp((s) => s.story);
  const vhs = useApp((s) => s.vhs);
  const effects = useSettings((s) => s.effects);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const unity = route.name === 'moment' ? experienceFor(route.momentId) : null;
  // Pointer input inside a Unity iframe never reaches this page, so the HUD must not wait for it to hide.
  const idle = useIdle(3000) && unity?.kind !== 'unity';
  const [entryDone, setEntryDone] = useState(false);

  // Era grade only inside a moment, and only with effects on.
  const look = effects && route.name === 'moment' ? momentById(route.momentId).look : undefined;

  return (
    <div className={styles.app} data-route={route.name} data-idle={idle} data-effects={effects} data-reduced-motion={reducedMotion} data-look={look} data-vhs={vhs ?? undefined}>
      <Stage />
      <Atmosphere />
      {route.name === 'moment' && unity?.kind === 'unity' && <UnityExperience key={route.momentId} momentId={route.momentId} url={unity.url} />}
      {route.name !== 'entry' && (
        <main className={styles.ui}>
          <TopBar />
          {route.name === 'lobby' && <LobbyUI />}
          {route.name === 'custom' && <CustomUI />}
          {route.name === 'moment' && <MomentUI momentId={route.momentId} />}
          {story && <StoryBar />}
          <Guide />
        </main>
      )}
      <VhsOverlay />
      <Curtain />
      {!entryDone && <EntryScreen onDone={() => setEntryDone(true)} />}
    </div>
  );
}
