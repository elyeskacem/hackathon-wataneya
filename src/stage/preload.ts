import { useEffect } from 'react';
import { useApp } from '../app/appStore';
import { momentByChannel } from '../data/moments';
import { SCENES, sceneUrls } from '../features/moment/scenes';
import { preloadTextures } from './textures';

let chunkWarm = false;

/** Warms the moment chunk and a scene's textures while the browser is idle. */
function warm(momentId: 'choufli-hal' | 'om-kalthoum') {
  const run = () => {
    if (!chunkWarm) {
      chunkWarm = true;
      void import('../features/moment/MomentScene');
    }
    const scene = SCENES[momentId];
    if (scene) preloadTextures(sceneUrls(scene));
  };
  // Safari has no requestIdleCallback.
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 400);
}

/**
 * Preloads the next likely scene: from the lobby the first moment, in Custom mode the tape that is
 * in the TV. If the visitor is faster than the network, the curtain falls back to TV static.
 */
export function usePreloadNext() {
  const route = useApp((s) => s.route.name);
  const channel = useApp((s) => s.channel);
  useEffect(() => {
    if (route === 'lobby') warm('choufli-hal');
    else if (route === 'custom') {
      const scene = momentByChannel(channel).scene;
      if (scene) warm(scene);
    }
  }, [route, channel]);
}
