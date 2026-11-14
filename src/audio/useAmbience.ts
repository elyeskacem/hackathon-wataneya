import { useEffect } from 'react';
import { useApp, type Route } from '../app/appStore';
import { audio, type Ambience } from './AudioManager';
import { experienceFor } from '../features/moment/experience';

function ambienceFor(route: Route): Ambience {
  switch (route.name) {
    case 'entry':
      return 'none';
    case 'lobby':
      return 'room';
    case 'custom':
      return 'tv';
    case 'moment':
      // A Unity build brings its own sound.
      if (experienceFor(route.momentId).kind === 'unity') return 'none';
      if (route.momentId === 'om-kalthoum') return 'hall';
      if (route.momentId === 'choufli-hal') return route.roomId === 'kitchen' ? 'kitchen' : 'office';
      return 'tv';
  }
}

/** One ambient loop per scene, crossfaded on every route change; ducked while the guide is open. */
export function useAmbience() {
  const route = useApp((s) => s.route);
  const guideOpen = useApp((s) => s.guideOpen);
  const ambience = ambienceFor(route);
  useEffect(() => audio.setAmbience(ambience), [ambience]);
  useEffect(() => audio.duck(guideOpen), [guideOpen]);
}
