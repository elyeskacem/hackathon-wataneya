import raw from '../../data/moments.json';
import { config } from '../config';
import type { Localized } from '../i18n/useT';

export type MomentId =
  | 'choufli-hal'
  | 'om-kalthoum'
  | 'news-studio'
  | 'el-khottab'
  | 'laroui'
  | 'mnamet-aroussia'
  | 'tv-launch'
  | 'independence'
  | 'dhi3et-mahrous';

export interface Moment {
  id: MomentId;
  channel: number;
  title: Localized;
  kind: Localized;
  year: number | null;
  yearVerified: boolean;
  /** Id of the 3D/2.5D scene, or null while the moment is a placeholder. */
  scene: 'choufli-hal' | 'om-kalthoum' | null;
  thumb: string | null;
}

export const moments = raw as Moment[];

export function momentByChannel(channel: number): Moment {
  const moment = moments.find((m) => m.channel === channel);
  if (!moment) throw new Error(`No moment on channel ${channel}`);
  return moment;
}

export function momentById(id: MomentId): Moment {
  const moment = moments.find((m) => m.id === id);
  if (!moment) throw new Error(`Unknown moment ${id}`);
  return moment;
}

/** Years stay hidden until verified against the archive (ethics rule from the research). */
export function displayYear(moment: Moment): number | null {
  return moment.yearVerified || config.showUnverifiedYears ? moment.year : null;
}

export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const channelLabel = (channel: number) => String(channel).padStart(2, '0');
