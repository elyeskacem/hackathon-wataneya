import { Quaternion, Vector3, type Object3D, type PerspectiveCamera } from 'three';
import type { CameraPose, Vec3 } from '../../stage/cameraStore';

/**
 * Reads the named empties (or Blender cameras) of a scene GLB. The naming is the contract with the 3D
 * team and is documented in docs/3D-HANDOFF.md:
 *
 *   cam_start[@room]       camera start point (position, direction and, on a Camera object, the field of view)
 *   cam_closeup[@room]     optional second camera, e.g. the front row; pair it with hotspot_closeup
 *   char_<id>[@room]       character anchor at the feet; custom property "height" (metres) places the talk ring
 *   door_<room>[@room]     door hotspot leading to <room>
 *   hotspot_<id>[@room]    point of interest; custom properties "entry" (guide entry id), "label_ar", "label_fr", "label_en", "label_zh"
 *
 * A name without @room belongs to the default room "main". Blender's duplicate suffix (.001) is ignored.
 */
export const DEFAULT_ROOM = 'main';
const NAME = /^(cam|char|door|hotspot)_([a-z0-9-]+)(?:@([a-z0-9]+))?$/i;
/** Seconds-worth of distance used to turn a camera direction into a look-at point. */
const LOOK_DISTANCE = 10;
const DEFAULT_FOV = 50;
const DEFAULT_CHARACTER_HEIGHT = 1.7;

/** A label typed by the artist; languages left out fall back (zh to en, en to fr, fr to ar). */
export type GlbLabel = { ar: string; fr?: string; en?: string; zh?: string };

export interface GlbCharacter {
  id: string;
  /** Feet. */
  position: Vec3;
  height: number;
  /** Node to hide (the whole figure) when the character is not allowed on screen. */
  node: Object3D;
}
export interface GlbDoor {
  to: string;
  position: Vec3;
  label?: GlbLabel;
}
export interface GlbHotspot {
  id: string;
  position: Vec3;
  entry?: string;
  label?: GlbLabel;
}
export interface GlbRoom {
  id: string;
  /** Null until the scene provides cam_start for this room. */
  start: CameraPose | null;
  closeup: CameraPose | null;
  characters: GlbCharacter[];
  doors: GlbDoor[];
  hotspots: GlbHotspot[];
}
export interface GlbLayout {
  rooms: GlbRoom[];
  /** Names that look like a marker but could not be used, for the console. */
  warnings: string[];
}

const labelOf = (o: Object3D): GlbLabel | undefined => {
  const ar = o.userData.label_ar as string | undefined;
  if (!ar) return undefined;
  const text = (key: string) => (typeof o.userData[key] === 'string' ? (o.userData[key] as string) : undefined);
  return { ar, fr: text('label_fr'), en: text('label_en'), zh: text('label_zh') };
};

/** The label as text in every language, with the fallbacks above. */
export function fullLabel(l: GlbLabel) {
  const fr = l.fr ?? l.ar;
  const en = l.en ?? fr;
  return { ar: l.ar, fr, en, zh: l.zh ?? en };
}

export function readLayout(root: Object3D): GlbLayout {
  const rooms = new Map<string, GlbRoom>();
  const warnings: string[] = [];
  const room = (id: string) => {
    let r = rooms.get(id);
    if (!r) rooms.set(id, (r = { id, start: null, closeup: null, characters: [], doors: [], hotspots: [] }));
    return r;
  };
  room(DEFAULT_ROOM);
  root.updateWorldMatrix(true, true);
  const p = new Vector3();
  const q = new Quaternion();

  root.traverse((o) => {
    // GLTFLoader strips "." from node names; the original name sits in userData.name.
    const raw = (typeof o.userData.name === 'string' ? o.userData.name : o.name).replace(/\.\d{3}$/, '');
    const m = NAME.exec(raw.replace(/\s+/g, '_'));
    if (!m) {
      if (/^(cam|char|door|hotspot)[_\s]/i.test(raw)) warnings.push(`"${raw}": expected kind_name[@room], lowercase letters, digits and "-" only`);
      return;
    }
    const kind = m[1]!.toLowerCase();
    const name = m[2]!.toLowerCase();
    const r = room((m[3] ?? DEFAULT_ROOM).toLowerCase());
    o.getWorldPosition(p);
    const position = p.toArray() as Vec3;
    if (kind === 'cam') {
      o.getWorldQuaternion(q);
      const forward = new Vector3(0, 0, -1).applyQuaternion(q);
      const fov = (o as PerspectiveCamera).isPerspectiveCamera ? (o as PerspectiveCamera).fov : DEFAULT_FOV;
      const pose: CameraPose = { position, target: p.clone().addScaledVector(forward, LOOK_DISTANCE).toArray() as Vec3, fov, free: true };
      if (name === 'start') r.start = pose;
      else if (name === 'closeup') r.closeup = pose;
      else warnings.push(`"${raw}": unknown camera (use cam_start or cam_closeup)`);
    } else if (kind === 'char') {
      const height = Number(o.userData.height);
      r.characters.push({ id: name, position, height: Number.isFinite(height) && height > 0 ? height : DEFAULT_CHARACTER_HEIGHT, node: o });
    } else if (kind === 'door') {
      r.doors.push({ to: name, position, label: labelOf(o) });
    } else {
      const entry = typeof o.userData.entry === 'string' ? (o.userData.entry as string) : undefined;
      r.hotspots.push({ id: name, position, entry, label: labelOf(o) });
    }
  });

  for (const r of rooms.values()) {
    if (!r.start && (r.id === DEFAULT_ROOM || r.characters.length || r.doors.length || r.hotspots.length)) warnings.push(`room "${r.id}" has no cam_start`);
    for (const d of r.doors) if (!rooms.has(d.to)) warnings.push(`door_${d.to}@${r.id} leads to a room that does not exist`);
  }
  // Rooms that only exist as door targets are not rooms; empty default room is kept (it is where visitors arrive).
  return { rooms: [...rooms.values()].filter((r) => r.id === DEFAULT_ROOM || r.start), warnings };
}
