import { useApp } from '../../app/appStore';
import { changeScene, insertTape } from '../../app/transitions';
import { momentById, moments, type MomentId } from '../../data/moments';
import { switchChannel } from '../custom/channelSwitch';

/** One stop per moment, in channel order: the guided visit is a tour of the whole tape shelf. */
export const STORY: { momentId: MomentId }[] = moments.map((m) => ({ momentId: m.id }));

let busy = false;

/** Travels to a stop with the same journeys the free mode uses (glide to the TV, push through the screen, fade). */
async function travelTo(i: number) {
  const app = useApp.getState();
  const { id, channel } = momentById(STORY[i]!.momentId);
  app.setStoryIndex(i);
  if (app.route.name === 'moment') {
    // Already inside a moment: go straight to the next one, and leave the TV on its channel.
    app.setChannel(channel);
    await changeScene({ name: 'moment', momentId: id });
    return;
  }
  if (app.route.name !== 'custom') app.go({ name: 'custom' });
  if (useApp.getState().channel !== channel) switchChannel(channel);
  await insertTape(id);
}

export async function goToStop(index: number) {
  const i = Math.max(0, Math.min(STORY.length - 1, index));
  const app = useApp.getState();
  if (busy || (i === app.storyIndex && app.story)) return;
  busy = true;
  try {
    await travelTo(i);
  } finally {
    busy = false;
  }
}

export async function startStory() {
  if (busy) return;
  useApp.getState().setStory(true, 0);
  busy = true;
  try {
    await travelTo(0);
  } finally {
    busy = false;
  }
}

export function endStory() {
  useApp.getState().setStory(false, 0);
}
