import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import { changeScene, useLiftCurtain } from '../../app/transitions';
import { useT } from '../../i18n/useT';
import { asset, momentById, type MomentId } from '../../data/moments';
import { Backdrop } from '../../stage/Backdrop';
import { REST_POSE, useCamera, type CameraPose, type Vec3 } from '../../stage/cameraStore';
import { Hotspot3D } from '../../stage/Hotspot3D';
import { BACKDROP_DEPTH, useBackdropFrame, type BackdropFrame } from '../../stage/useBackdropFrame';
import { useMoment } from './momentStore';
import { roomOf, SCENES, type CharacterConfig, type SceneConfig } from './scenes';

/** Arrival: the camera glides in (1.6–2 s, motion spec). */
const ARRIVAL_DURATION = 1.8;

export default function MomentScene({ momentId, roomId }: { momentId: MomentId; roomId?: string }) {
  const scene = SCENES[momentId];
  return scene ? <SceneRooms scene={scene} roomId={roomId} /> : <PlaceholderRoom momentId={momentId} />;
}

function SceneRooms({ scene, roomId }: { scene: SceneConfig; roomId?: string }) {
  const { t, pick } = useT();
  const room = roomOf(scene, roomId);
  const urls = useMemo(
    () => [...scene.rooms.map((r) => r.backdrop), ...scene.rooms.flatMap((r) => r.characters.map((c) => c.image).filter((u): u is string => u !== null))],
    [scene],
  );
  const textures = useTexture(urls, (loaded) => {
    (loaded as Texture[]).forEach((tex) => (tex.colorSpace = SRGBColorSpace));
  }) as Texture[];
  const textureFor = (url: string) => textures[urls.indexOf(url)]!;
  const frame = useBackdropFrame(room.aspect);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const restPose = useMemo((): CameraPose => {
    // Turn toward the room's point of interest, without revealing the backdrop edges.
    const viewW = 2 * BACKDROP_DEPTH * Math.tan((25 * Math.PI) / 180) * aspect;
    const slack = Math.max(0, (frame.width - viewW) / 2) * 0.85;
    const x = Math.max(-slack, Math.min(slack, (room.focusU - 0.5) * frame.width));
    return { ...REST_POSE, target: [x, 0, -BACKDROP_DEPTH] };
  }, [aspect, frame.width, room.focusU]);
  const closeUp = useMoment((s) => s.closeUp);
  const toggleCloseUp = useMoment((s) => s.toggleCloseUp);
  const setCharacter = useMoment((s) => s.setCharacter);
  const reset = useMoment((s) => s.reset);
  const setPose = useCamera((s) => s.setPose);
  const setInteractive = useCamera((s) => s.setInteractive);

  useLiftCurtain(room.id);

  useEffect(() => {
    reset();
    setPose({ ...restPose, position: [0, 0.1, 1.4] }, 0);
    setPose(restPose, ARRIVAL_DURATION);
    setInteractive(true);
    // Arrival runs once per room; resizes are handled by the close-up effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, reset, setPose, setInteractive]);

  useEffect(() => {
    const vp = room.viewpoint;
    if (!vp) return;
    const [x, y] = frame.anchor(vp.u, vp.v, vp.dolly);
    setPose(closeUp ? { position: [x * 0.6, y * 0.3, -vp.dolly], target: [x * 0.6, y * 0.3, -10], fov: 50 } : restPose, 1.6);
  }, [closeUp, room.viewpoint, frame, restPose, setPose]);

  return (
    <group>
      <Backdrop frame={frame} texture={textureFor(room.backdrop)} />
      {room.characters.map((c) => (
        <Character key={c.id} character={c} frame={frame} texture={c.image ? textureFor(c.image) : null} onSelect={() => setCharacter(c.id)} />
      ))}
      {room.doors.map((door) => {
        const target = roomOf(scene, door.to);
        return (
          <Hotspot3D
            key={door.to}
            position={frame.anchor(door.u, door.v, 7)}
            icon="door"
            showLabel
            label={t('moment.door', { room: pick(target.name) })}
            onSelect={() => void changeScene({ name: 'moment', momentId: scene.momentId, roomId: door.to }, 'fade')}
            testId={`door-${door.to}`}
          />
        );
      })}
      {room.viewpoint && (
        <Hotspot3D
          position={closeUp ? frame.anchor(room.viewpoint.u, 0.9, 2) : frame.anchor(room.viewpoint.u, room.viewpoint.v, 6)}
          showLabel
          label={pick(closeUp ? room.viewpoint.backLabel : room.viewpoint.label)}
          onSelect={toggleCloseUp}
          testId="viewpoint"
        />
      )}
    </group>
  );
}

function Character({ character, frame, texture, onSelect }: { character: CharacterConfig; frame: BackdropFrame; texture: Texture | null; onSelect: () => void }) {
  const { t, pick } = useT();
  const height = frame.heightAt(character.depth) * character.heightShare;
  const width = height * character.imageAspect;
  const [x, y, z] = frame.anchor(character.u, character.v, character.depth);
  const silhouette = useMemo(() => (texture ? null : silhouetteTexture()), [texture]);
  useEffect(() => () => silhouette?.dispose(), [silhouette]);
  const ring: Vec3 = [x + (character.ring.u - 0.5) * width, y + (1 - character.ring.v) * height, z + 0.01];

  return (
    <group>
      <mesh position={[x, y + height / 2, z]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture ?? silhouette} transparent alphaTest={0.05} toneMapped={false} />
      </mesh>
      <Hotspot3D position={ring} icon="talk" showLabel label={t('moment.askAbout', { name: pick(character.name) })} onSelect={onSelect} testId={`character-${character.id}`} />
    </group>
  );
}

/** Dark figure for characters without an approved cut-out (Figma: "placeholder (silhouette)"). */
function silhouetteTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 300;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(27,28,30,0.78)';
  ctx.beginPath();
  ctx.arc(64, 40, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(30, 300);
  ctx.bezierCurveTo(28, 150, 34, 78, 64, 76);
  ctx.bezierCurveTo(94, 78, 100, 150, 98, 300);
  ctx.fill();
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Moments without a scene yet: their render (if any) dimmed behind the title card. */
function PlaceholderRoom({ momentId }: { momentId: MomentId }) {
  const moment = momentById(momentId);
  const setPose = useCamera((s) => s.setPose);
  const setInteractive = useCamera((s) => s.setInteractive);
  useLiftCurtain(momentId);
  useEffect(() => {
    setPose(REST_POSE, 0);
    setInteractive(false);
  }, [setPose, setInteractive]);
  return moment.thumb ? <PlaceholderBackdrop url={asset(moment.thumb)} /> : null;
}

function PlaceholderBackdrop({ url }: { url: string }) {
  const texture = useTexture(url, (t) => {
    (t as Texture).colorSpace = SRGBColorSpace;
  }) as Texture;
  const image = texture.image as HTMLImageElement;
  const frame = useBackdropFrame(image.width / image.height);
  return <Backdrop frame={frame} texture={texture} dim={0.55} />;
}
