import { useEffect } from 'react';
import { useApp, type Curtain, type Route } from './appStore';
import { useSettings } from './settingsStore';
import { audio } from '../audio/AudioManager';
import type { MomentId } from '../data/moments';

const PUSH_MS = 1100;
/** How long a journey may take before the glow is replaced by a TV-static bridge (asset not ready). */
const BRIDGE_AFTER_MS = 500;
const GLOW_MS = 450;
const REWIND_MS = 900;
const POWER_OFF_MS = 700;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const motion = () => !useSettings.getState().reducedMotion;

/**
 * Scene change inside the one canvas: the screen fills with warm light, the route swaps, and the
 * new scene lifts the light when its textures are ready. If that takes longer than half a second
 * the light turns into TV static, so a slow asset reads as part of the world.
 */
export async function changeScene(route: Route, curtain: Exclude<Curtain, null> = 'glow') {
  const app = useApp.getState();
  const style: Curtain = motion() ? curtain : 'fade';
  app.setCurtain(style);
  await wait(motion() ? GLOW_MS : 120);
  useApp.getState().go(route);
  if (style === 'glow') {
    window.setTimeout(() => {
      if (useApp.getState().curtain === 'glow') useApp.getState().setCurtain('static');
    }, BRIDGE_AFTER_MS);
  }
}

/** «ادخل للحظة»: tape goes in, the camera pushes through the screen, light, then the moment. */
export async function insertTape(momentId: MomentId, roomId?: string) {
  const app = useApp.getState();
  if (app.inserting) return;
  audio.tapeInsert();
  app.setInserting(true);
  if (motion()) {
    await wait(PUSH_MS * 0.6);
    audio.static(0.7);
    await wait(PUSH_MS * 0.4);
  }
  await changeScene({ name: 'moment', momentId, roomId });
  announcePlay();
}

/** Green "▶ PLAY · year" on arrival (no year until verified) and brief tracking lines. */
export function announcePlay() {
  if (!motion() || !useSettings.getState().effects) return;
  useApp.getState().setVhs('play');
  audio.tracking();
  window.setTimeout(() => {
    if (useApp.getState().vhs === 'play') useApp.getState().setVhs(null);
  }, 2000);
}

/** Leaving a moment: ◀◀ rewind, then the CRT collapses to a line and a dot, then the living room. */
export async function leaveMoment(to: 'lobby' | 'custom' = 'lobby') {
  const app = useApp.getState();
  if (app.route.name !== 'moment' || app.vhs === 'rewind' || app.vhs === 'poweroff') return;
  if (!motion() || !useSettings.getState().effects) {
    await changeScene({ name: 'lobby' });
  } else {
    app.setVhs('rewind');
    audio.rewind();
    await wait(REWIND_MS);
    useApp.getState().setVhs('poweroff');
    audio.powerOff();
    await wait(POWER_OFF_MS);
    useApp.getState().setCurtain('fade');
    await wait(120);
    useApp.getState().go({ name: 'lobby' });
    useApp.getState().setVhs(null);
  }
  if (to === 'custom') useApp.getState().go({ name: 'custom' });
}

/** Called by each scene once mounted (after Suspense resolved its textures); `key` re-lifts on room changes. */
export function useLiftCurtain(key?: string) {
  const setCurtain = useApp((s) => s.setCurtain);
  useEffect(() => {
    const timer = window.setTimeout(() => setCurtain(null), 120);
    return () => window.clearTimeout(timer);
  }, [setCurtain, key]);
}
