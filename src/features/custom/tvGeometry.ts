/**
 * Measurements of public/models/tv.glb after scripts/build-models.mjs: 1 unit wide, base on y = 0,
 * centred on x/z. Everything below is in those units, so multiply by the TV's world width.
 */
export const TV_MODEL = {
  /** Body (without the antennas): height, and the front of the bezel / the glass centre in z. */
  bodyHeight: 0.64,
  frontZ: 0.3,
  /** The glass: centre, size and the z of its (convex) middle. */
  screen: { cx: -0.09, cy: 0.336, w: 0.7, h: 0.5, z: 0.315 },
} as const;

/** World size of a TV that is `width` wide: body height, and where its screen is relative to its base. */
export function tvMetrics(width: number) {
  const s = TV_MODEL.screen;
  return {
    bodyHeight: TV_MODEL.bodyHeight * width,
    bodyCenterY: (TV_MODEL.bodyHeight / 2) * width,
    frontZ: TV_MODEL.frontZ * width,
    screenOffset: [s.cx * width, s.cy * width, s.z * width] as const,
  };
}
