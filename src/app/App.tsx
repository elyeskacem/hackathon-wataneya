import { useState } from 'react';
import { useApp } from './appStore';
import { useSettings } from './settingsStore';
import { useIdle } from './useIdle';
import { useDocumentLocale } from '../i18n/useT';
import { EntryScreen } from '../features/entry/EntryScreen';
import { Guide } from '../features/guide/Guide';
import { LobbyUI } from '../features/lobby/LobbyUI';
import { Stage } from '../stage/Stage';
import { TopBar } from '../ui/TopBar';
import styles from './App.module.css';

export function App() {
  useDocumentLocale();
  const route = useApp((s) => s.route.name);
  const effects = useSettings((s) => s.effects);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const idle = useIdle(3000);
  const [entryDone, setEntryDone] = useState(false);

  return (
    <div className={styles.app} data-idle={idle} data-effects={effects} data-reduced-motion={reducedMotion}>
      <Stage />
      {route !== 'entry' && (
        <main className={styles.ui}>
          <TopBar />
          {route === 'lobby' && <LobbyUI />}
          <Guide />
        </main>
      )}
      {!entryDone && <EntryScreen onDone={() => setEntryDone(true)} />}
    </div>
  );
}
