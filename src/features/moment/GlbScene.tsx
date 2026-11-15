import { useEffect, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import { changeScene, announcePlay, useLiftCurtain } from '../../app/transitions';
import { config } from '../../config';
import type { MomentId } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { REST_POSE, useCamera, type CameraPose } from '../../stage/cameraStore';
import { Hotspot3D } from '../../stage/Hotspot3D';
import { useModel } from '../../stage/useModel';
import { fullLabel, readLayout, type GlbRoom } from './glbLayout';
import { characterInfo, roomName } from './scenes';
import { useAskEntry } from './useAskEntry';
import { useMoment } from './momentStore';

const ARRIVAL_DURATION = 1.8;
/** A point straight ahead of a camera pose and a little below its centre: where the way back from a close-up sits. */
function inFront(pose: CameraPose, distance: number): [number, number, number] {
  const f = new Vector3(...pose.target).sub(new Vector3(...pose.position)).normalize();
  return [pose.position[0] + f.x * distance, pose.position[1] + f.y * distance - 0.25, pose.position[2] + f.z * distance];
}

/** Used when a scene forgot cam_start: standing at the origin at eye height, looking along -Z. */
const FALLBACK_POSE: CameraPose = { ...REST_POSE, position: [0, 1.6, 0], target: [0, 1.6, -10], free: true };

/**
 * A moment drawn from the team's own scene GLB (public/models/scenes/<moment-id>.glb). Camera starts,
 * door and talk hotspots and characters all come from named empties in the file (see glbLayout.ts).
 */
export default function GlbScene({ momentId, url, roomId }: { momentId: MomentId; url: string; roomId?: string }) {
  const { t, pick } = useT();
  const gltf = useModel(url);
  const layout = useMemo(() => readLayout(gltf.scene), [gltf]);
  const room: GlbRoom = layout.rooms.find((r) => r.id === roomId) ?? layout.rooms[0]!;
  const characters = useMemo(() => room.characters.filter((c) => c.id !== 'om-kalthoum' || config.showOmKalthoumFigure), [room]);
  const closeUp = useMoment((s) => s.closeUp);
  const toggleCloseUp = useMoment((s) => s.toggleCloseUp);
  const setCharacter = useMoment((s) => s.setCharacter);
  const reset = useMoment((s) => s.reset);
  const setPose = useCamera((s) => s.setPose);
  const setInteractive = useCamera((s) => s.setInteractive);
  const askEntry = useAskEntry(momentId);
  const start = room.start ?? FALLBACK_POSE;

  useEffect(() => {
    for (const w of layout.warnings) console.warn(`[${momentId}.glb] ${w}`);
  }, [layout, momentId]);

  // The real Om Kalthoum figure appears only when the team turns the flag on (docs/PLAN.md §6.6).
  useEffect(() => {
    for (const c of room.characters) c.node.visible = c.id !== 'om-kalthoum' || config.showOmKalthoumFigure;
  }, [room]);

  // A scene with no lights of its own (everything baked) still needs something to show its materials.
  const lit = useMemo(() => {
    let found = false;
    gltf.scene.traverse((o) => {
      if ((o as { isLight?: boolean }).isLight) found = true;
    });
    return found;
  }, [gltf]);

  useLiftCurtain(room.id);
  useEffect(() => announcePlay(), [momentId]);

  useEffect(() => {
    reset();
    // Arrive from inside the screen: start a little behind and lower, then glide to cam_start.
    const back = new Vector3(...start.target).sub(new Vector3(...start.position)).normalize().multiplyScalar(-1.4);
    setPose({ ...start, position: [start.position[0] + back.x, start.position[1] + back.y - 0.1, start.position[2] + back.z], fov: start.fov - 8 }, 0);
    setPose(start, ARRIVAL_DURATION);
    setInteractive(true);
    // Arrival runs once per room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, reset, setPose, setInteractive]);

  // Only a change of the close-up toggle moves the camera; the first run must not cancel the arrival glide.
  const seenCloseUp = useRef(closeUp);
  useEffect(() => {
    if (seenCloseUp.current === closeUp) return;
    seenCloseUp.current = closeUp;
    if (room.closeup) setPose(closeUp ? room.closeup : start, 1.6);
  }, [closeUp, room, start, setPose]);

  const closeupSpot = room.hotspots.find((h) => h.id === 'closeup');
  const spots = room.hotspots.filter((h) => h !== closeupSpot);

  return (
    <group>
      <primitive object={gltf.scene} />
      {!lit && <hemisphereLight args={['#fff2de', '#40342a', 1.1]} />}
      {characters.map((c) => {
        const info = characterInfo(c.id);
        return (
          <Hotspot3D
            key={c.id}
            position={[c.position[0], c.position[1] + c.height, c.position[2]]}
            icon="talk"
            showLabel
            label={t('moment.askAbout', { name: pick(info.name) })}
            onSelect={() => setCharacter(c.id)}
            testId={`character-${c.id}`}
          />
        );
      })}
      {room.doors.map((door) => {
        const label = door.label ? pick(fullLabel(door.label)) : pick(roomName(momentId, door.to));
        return (
          <Hotspot3D
            key={door.to}
            position={door.position}
            icon="door"
            showLabel
            label={t('moment.door', { room: label })}
            onSelect={() => void changeScene({ name: 'moment', momentId, roomId: door.to }, 'fade')}
            testId={`door-${door.to}`}
          />
        );
      })}
      {spots.map((h) => (
        <Hotspot3D
          key={h.id}
          position={h.position}
          showLabel
          label={h.label ? pick(fullLabel(h.label)) : h.id.replace(/-/g, ' ')}
          onSelect={() => askEntry(h.entry)}
          testId={`hotspot-${h.id}`}
        />
      ))}
      {room.closeup && closeupSpot && (
        <Hotspot3D
          position={closeUp ? inFront(room.closeup, 2) : closeupSpot.position}
          showLabel
          label={closeupSpot.label ? pick(fullLabel(closeupSpot.label)) : t(closeUp ? 'moment.farther' : 'moment.closer')}
          onSelect={toggleCloseUp}
          testId="viewpoint"
        />
      )}
    </group>
  );
}
