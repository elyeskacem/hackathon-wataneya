import { glb, unity } from 'virtual:scenes3d';
import { asset, type Moment, type MomentId } from '../../data/moments';

/**
 * How a moment is shown. The team's real 3D can arrive in two forms (docs/3D-HANDOFF.md); the 2.5D
 * renders stay as the fallback, so a moment never goes empty while its 3D is still being built.
 *  1. unity: public/experiences/<id>/index.html, a Unity WebGL build in a full-screen iframe
 *  2. glb:   public/models/scenes/<id>.glb, a Blender export drawn inside our own canvas
 *  3. render: the 2.5D backdrops in scenes.ts
 */
export type Experience = { kind: 'unity'; url: string } | { kind: 'glb'; url: string } | { kind: 'render' };

export function experienceFor(momentId: MomentId): Experience {
  if (unity.includes(momentId)) return { kind: 'unity', url: asset(`experiences/${momentId}/index.html`) };
  if (glb.includes(momentId)) return { kind: 'glb', url: asset(`models/scenes/${momentId}.glb`) };
  return { kind: 'render' };
}

/** True when the moment has anything to show besides the "still being prepared" card. */
export function hasExperience(moment: Moment): boolean {
  return moment.scene !== null || experienceFor(moment.id).kind !== 'render';
}
