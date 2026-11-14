import { asset } from '../data/moments';

/** A 2×2 AVIF: if it decodes, the browser can show the AVIF backdrop, otherwise the WebP one. */
const PROBE =
  'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZgAAAOptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAEOAAEAAAAAAAAAGwAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAamlwcnAAAABLaXBjbwAAABNjb2xybmNseAABAA0ABoAAAAAMYXYxQ4EgAgAAAAAUaXNwZQAAAAAAAAACAAAAAgAAABBwaXhpAAAAAAMICAgAAAAXaXBtYQAAAAAAAAABAAEEAYIDBAAAACNtZGF0EgAKBzgANhAQ0GkyDhgAAABQlXdpJctOI6FQ';

let result: boolean | null = null;
let probing: Promise<void> | null = null;

/** Suspends once (a few ms) until the probe has answered; afterwards it returns synchronously. */
export function avifSupported(): boolean {
  if (result !== null) return result;
  probing ??= new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      result = img.width > 0;
      resolve();
    };
    img.onerror = () => {
      result = false;
      resolve();
    };
    img.src = PROBE;
  });
  throw probing;
}

/** Lobby backdrop at the width the screen needs (never beyond the 1376 px original). */
export function salonUrl(): string {
  const px = typeof window === 'undefined' ? 1920 : window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
  const w = px <= 1280 ? 1280 : 1376;
  return asset(`renders/lobby-salon-${w}.${avifSupported() ? 'avif' : 'webp'}`);
}
export const SALON_BLUR = asset('renders/lobby-salon-blur.webp');
export const SALON_ASPECT = 1376 / 768;
