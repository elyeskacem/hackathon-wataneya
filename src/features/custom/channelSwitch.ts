import { useApp } from '../../app/appStore';
import { useSettings } from '../../app/settingsStore';
import { audio } from '../../audio/AudioManager';

const STATIC_MS = 500;
let timers: number[] = [];

/** Changes channel behind 0.5 s of static (MyRetroTVs); instant when effects are off. */
export function switchChannel(channel: number) {
  const app = useApp.getState();
  const { effects, reducedMotion } = useSettings.getState();
  timers.forEach(clearTimeout);
  timers = [];
  audio.click();
  if (!effects || reducedMotion) {
    app.setChannel(channel);
    return;
  }
  audio.static(STATIC_MS / 1000);
  app.setStaticBurst(true);
  timers.push(
    window.setTimeout(() => useApp.getState().setChannel(channel), STATIC_MS / 2),
    window.setTimeout(() => useApp.getState().setStaticBurst(false), STATIC_MS),
  );
}
