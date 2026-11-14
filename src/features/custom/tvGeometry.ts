/** Measurements of old-tv.webp, as fractions of the image from its top-left corner. */
export const TV_IMAGE_ASPECT = 1280 / 960;
export const TV_BODY = { cx: 0.466, cy: 0.516, h: 0.577, bottom: 0.8 };
export const TV_SCREEN = { tl: [0.311, 0.294], tr: [0.548, 0.321], br: [0.551, 0.618], bl: [0.3125, 0.5625] } as const;

/** The screen quad as a CSS clip-path, for the DOM version of the TV (entry screen). */
export const TV_SCREEN_CLIP = `polygon(${[TV_SCREEN.tl, TV_SCREEN.tr, TV_SCREEN.br, TV_SCREEN.bl]
  .map(([u, v]) => `${u * 100}% ${v * 100}%`)
  .join(', ')})`;

/** Offset from the TV body centre to the screen centre, for a TV of the given body height. */
export function screenCenterOffset(bodyHeight: number): [number, number] {
  const h = bodyHeight / TV_BODY.h;
  const w = h * TV_IMAGE_ASPECT;
  const u = (TV_SCREEN.tl[0] + TV_SCREEN.br[0]) / 2;
  const v = (TV_SCREEN.tl[1] + TV_SCREEN.br[1]) / 2;
  return [(u - TV_BODY.cx) * w, (TV_BODY.cy - v) * h];
}
