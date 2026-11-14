import { useEffect } from 'react';
import { useApp, type Route } from '../app/appStore';
import { audio, type Ambience } from './AudioManager';

function ambienceFor(route: Route): Ambience {
  switch (route.name) {
    case 'entry':
      return 'none';
    case 'lobby':
      return 'room';
    case 'custom':
      return 'tv';
    case 'moment':
      if (route.momentId === 'om-kalthoum') return 'hall';
      if (route.momentId === 'choufli-hal') return route.roomId === 'kitchen' ? 'kitchen' : 'office';
      return 'tv';
  }
}

/** One ambient loop per scene, crossfaded on every route change. */
export function useAmbience() {
  const route = useApp((s) => s.route);
  const ambience = ambienceFor(route);
  useEffect(() => audio.setAmbience(ambience), [ambience]);
}
