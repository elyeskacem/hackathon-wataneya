import { useEffect } from 'react';
import { useApp, type Curtain, type Route } from './appStore';
import { useSettings } from './settingsStore';
import { audio } from '../audio/AudioManager';
import type { MomentId } from '../data/moments';

const PUSH_MS = 900;
const CURTAIN_MS = 300;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Scene change behind the curtain; the new scene lifts it when its textures are ready. */
export async function changeScene(route: Route, curtain: Exclude<Curtain, null> = 'static') {
  const app = useApp.getState();
  app.setCurtain(curtain);
  await wait(useSettings.getState().reducedMotion ? 0 : CURTAIN_MS);
  useApp.getState().go(route);
}

/** «ادخل للحظة»: tape click, the camera pushes into the screen, static, then the moment. */
export async function insertTape(momentId: MomentId) {
  const app = useApp.getState();
  if (app.inserting) return;
  audio.click('tape');
  app.setInserting(true);
  if (!useSettings.getState().reducedMotion) {
    await wait(PUSH_MS * 0.5);
    audio.static(0.8);
    await wait(PUSH_MS * 0.5);
  }
  await changeScene({ name: 'moment', momentId });
}

/** Called by each scene once mounted (after Suspense resolved its textures); `key` re-lifts on room changes. */
export function useLiftCurtain(key?: string) {
  const setCurtain = useApp((s) => s.setCurtain);
  useEffect(() => {
    const timer = window.setTimeout(() => setCurtain(null), 120);
    return () => window.clearTimeout(timer);
  }, [setCurtain, key]);
}
