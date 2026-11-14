import { useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { SRGBColorSpace, type Texture } from 'three';

/**
 * Loads colour textures through drei's cache, and frees them (GPU memory + cache entry) when the
 * scene that asked for them unmounts, so visiting many moments does not grow memory.
 */
export function useSceneTextures(urls: string[]): Texture[] {
  const textures = useTexture(urls) as Texture[] | Texture;
  const list = Array.isArray(textures) ? textures : [textures];
  for (const tex of list) {
    if (tex.colorSpace !== SRGBColorSpace) {
      tex.colorSpace = SRGBColorSpace;
      tex.needsUpdate = true;
    }
  }
  const key = urls.join('|');
  useEffect(
    () => () => {
      list.forEach((tex) => tex.dispose());
      useTexture.clear(urls);
    },
    // The key stands for the url list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return list;
}

/** Warms drei's cache so the scene mounts without a wait. Safe to call repeatedly. */
export function preloadTextures(urls: string[]) {
  useTexture.preload(urls);
}
