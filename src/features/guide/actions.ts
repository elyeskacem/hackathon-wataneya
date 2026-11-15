import { useApp } from '../../app/appStore';
import { switchChannel } from '../custom/channelSwitch';
import type { GuideAction, GuideContext } from './types';

/** Which set of suggestions and which scene-specific answers apply on the current screen. */
export function useGuideContext(): GuideContext {
  const route = useApp((s) => s.route);
  return contextOf(route);
}

export function currentGuideContext(): GuideContext {
  return contextOf(useApp.getState().route);
}

function contextOf(route: ReturnType<typeof useApp.getState>['route']): GuideContext {
  if (route.name === 'custom') return 'custom';
  if (route.name === 'moment') return route.momentId;
  return 'home';
}

/** An answer can move the TV ("show me X"): go to the TV and flip the channel once the camera is on its way. */
export function runAction(action: GuideAction | undefined) {
  if (!action) return;
  const app = useApp.getState();
  if (app.route.name !== 'custom') app.go({ name: 'custom' });
  // Let the camera start its glide to the TV before the channel flips.
  window.setTimeout(() => switchChannel(action.channel), 600);
}
