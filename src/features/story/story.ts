import { useApp } from '../../app/appStore';
import { changeScene, insertTape, leaveMoment } from '../../app/transitions';
import { switchChannel } from '../custom/channelSwitch';
import type { MomentId } from '../../data/moments';
import type { MessageKey } from '../../i18n/useT';

export type StoryStop =
  | { kind: 'lobby'; label: MessageKey }
  | { kind: 'tv'; channel: number; label: MessageKey }
  | { kind: 'moment'; momentId: MomentId; roomId?: string; label: MessageKey };

/** The guided visit: the living room, the TV, then a walk through two moments. */
export const STORY: StoryStop[] = [
  { kind: 'lobby', label: 'story.stop.lobby' },
  { kind: 'tv', channel: 1, label: 'story.stop.tv' },
  { kind: 'moment', momentId: 'choufli-hal', roomId: 'office', label: 'story.stop.office' },
  { kind: 'moment', momentId: 'choufli-hal', roomId: 'corridor', label: 'story.stop.corridor' },
  { kind: 'moment', momentId: 'choufli-hal', roomId: 'kitchen', label: 'story.stop.kitchen' },
  { kind: 'tv', channel: 2, label: 'story.stop.tv2' },
  { kind: 'moment', momentId: 'om-kalthoum', label: 'story.stop.kalthoum' },
];

let busy = false;

/** Travels to a stop with the same journeys the free mode uses (glide, push through the screen, fade). */
export async function goToStop(index: number) {
  const i = Math.max(0, Math.min(STORY.length - 1, index));
  const app = useApp.getState();
  if (busy || (i === app.storyIndex && app.story)) return;
  const stop = STORY[i]!;
  busy = true;
  try {
    app.setStoryIndex(i);
    const route = app.route;
    if (stop.kind === 'lobby') {
      if (route.name === 'moment') await leaveMoment('lobby');
      else app.go({ name: 'lobby' });
    } else if (stop.kind === 'tv') {
      if (route.name === 'moment') await leaveMoment('custom');
      else if (route.name !== 'custom') app.go({ name: 'custom' });
      window.setTimeout(() => switchChannel(stop.channel), route.name === 'custom' ? 0 : 700);
    } else if (route.name === 'moment') {
      await changeScene({ name: 'moment', momentId: stop.momentId, roomId: stop.roomId });
    } else {
      if (route.name !== 'custom') app.go({ name: 'custom' });
      if (useApp.getState().channel !== (stop.momentId === 'choufli-hal' ? 1 : 2)) switchChannel(stop.momentId === 'choufli-hal' ? 1 : 2);
      await insertTape(stop.momentId, stop.roomId);
    }
  } finally {
    busy = false;
  }
}

export function startStory() {
  useApp.getState().setStory(true, 0);
  void goToStop(1);
}

export function endStory() {
  useApp.getState().setStory(false, 0);
}
