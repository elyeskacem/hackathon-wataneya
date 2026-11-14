import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { MathUtils, type Group, type Texture } from 'three';
import { useSceneTextures } from '../../stage/textures';
import { useApp } from '../../app/appStore';
import { useSettings } from '../../app/settingsStore';
import { useLiftCurtain } from '../../app/transitions';
import { useT } from '../../i18n/useT';
import { Backdrop } from '../../stage/Backdrop';
import { REST_POSE, useCamera, type CameraPose, type Vec3 } from '../../stage/cameraStore';
import { Hotspot3D } from '../../stage/Hotspot3D';
import { useStaticTexture } from '../../stage/staticNoise';
import { useBackdropFrame, type BackdropFrame } from '../../stage/useBackdropFrame';
import { LampGlow } from '../../stage/LampGlow';
import { SALON_ASPECT, SALON_BLUR, salonUrl } from '../../stage/avif';
import { useIdle } from '../../app/useIdle';
import { useTestCard } from '../custom/testCard';
import { TvSet } from '../custom/TvSet';
import { useChannelPictures } from '../custom/channelPictures';
import { tvMetrics } from '../custom/tvGeometry';
import { Cassettes, EntryCassette, tapeThickness, type CassetteSpot } from './Cassettes';

/** Where the TV stands: the doily on the carved cabinet in the salon painting (image fractions). */
const TV_ANCHOR = { u: 0.47, v: 0.572, depth: 6 };
/** TV width as a share of the painting's width; the cabinet is 0.31 wide. */
const TV_WIDTH_SHARE = 0.17;
/** Lamps in the painting (image fractions), where the halos sit. */
const LAMPS = [
  { u: 0.5, v: 0.115, size: 1.5 },
  { u: 0.71, v: 0.5, size: 1.3 },
];
const TEST_CARD_IDLE_MS = 30_000;
/** Entry: the TV floats on black in front of the camera, this far away. */
const ENTRY_DEPTH = 3.4;
const TRAVEL_S = 1.6;

/** Living room shared by Entry (the TV on black), Lobby and Custom mode. */
export function LobbyScene() {
  const route = useApp((s) => s.route.name);
  const channel = useApp((s) => s.channel);
  const staticBurst = useApp((s) => s.staticBurst);
  const inserting = useApp((s) => s.inserting);
  const go = useApp((s) => s.go);
  const setDrawerOpen = useApp((s) => s.setDrawerOpen);
  const effects = useSettings((s) => s.effects);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const { t, locale } = useT();

  const pictures = useChannelPictures(locale);
  const frame = useBackdropFrame(SALON_ASPECT);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const [roomTexture, setRoomTexture] = useState<Texture | null>(null);

  const isCustom = route === 'custom';
  const idle = useIdle(TEST_CARD_IDLE_MS);
  const testCard = useTestCard(route === 'lobby' && idle);
  const showStatic = !isCustom || staticBurst;
  const staticTexture = useStaticTexture(route === 'entry' || showStatic, effects && !reducedMotion);

  // Lobby placement: base centre of the TV on the doily, and its world width.
  const tvPos = frame.anchor(TV_ANCHOR.u, TV_ANCHOR.v, TV_ANCHOR.depth);
  const width = frame.width * (TV_ANCHOR.depth / 10) * TV_WIDTH_SHARE;
  const m = tvMetrics(width);
  const [tx, ty, tz] = tvPos;

  const setPose = useCamera((s) => s.setPose);
  const setInteractive = useCamera((s) => s.setInteractive);
  useEffect(() => {
    if (route === 'entry') {
      setPose(REST_POSE, 0);
      setInteractive(false);
    } else if (route === 'lobby') {
      // On a portrait screen the cabinet is wider than the view: turn (not slide) toward the TV so it
      // stays centred and still lines up with the painting.
      const yaw = aspect < 1 ? tx * (10 / Math.abs(tz)) : 0;
      setPose({ ...REST_POSE, target: [yaw, 0, -10] }, 1.6);
      setInteractive(true);
    } else if (route === 'custom') {
      // Glide to the TV so its body fills about 55 % of the view height (1.4 s, motion spec);
      // when the tape goes in, push through the screen. On narrow screens the width decides.
      const tan = Math.tan((25 * Math.PI) / 180);
      const distance = Math.max(m.bodyHeight / (0.55 * 2 * tan), (width * 1.02) / (0.85 * 2 * tan * aspect));
      const cy = ty + m.bodyCenterY;
      const front = tz + m.frontZ;
      const [sx, sy] = m.screenOffset;
      const pose: CameraPose = inserting
        ? { position: [tx + sx, ty + sy, front + distance * 0.18], target: [tx + sx, ty + sy, tz - 10], fov: 50 }
        : { position: [tx, cy + m.bodyHeight * 0.06, front + distance], target: [tx, cy + m.bodyHeight * 0.06, tz - 10], fov: 50 };
      setPose(pose, inserting ? 0.9 : 1.4);
      setInteractive(false);
    }
    // m is derived from width
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, inserting, tx, ty, tz, width, aspect, setPose, setInteractive]);

  const screenPos: Vec3 = [tx + m.screenOffset[0], ty + m.screenOffset[1], tz + m.screenOffset[2] + 0.02];

  // Tapes next to the TV on the cabinet top, all on the plane of the doily.
  const spots = useMemo<CassetteSpot[]>(() => {
    const at = (u: number, v: number): Vec3 => frame.anchor(u, v, TV_ANCHOR.depth);
    const a = at(0.592, 0.576);
    const b = at(0.595, 0.575);
    const c = at(0.565, 0.588);
    return [
      { position: a, rotY: 0.16 },
      { position: [b[0], b[1] + tapeThickness(width), b[2]], rotY: -0.2 },
      { position: c, rotY: 0.62 },
    ];
  }, [frame, width]);
  const tapesPos: Vec3 = [spots[1]!.position[0], spots[1]!.position[1] + 0.03 * width, spots[1]!.position[2]];

  const dim = route === 'entry' ? 1 : isCustom ? 0.25 : 0;
  const level = route === 'entry' ? 0.5 : isCustom ? 1 : 0.55;

  return (
    <group>
      <Lights frame={frame} />
      <Suspense fallback={null}>
        <Room frame={frame} blur={isCustom ? 1 : 0} dim={dim} onTexture={setRoomTexture} effects={effects} reducedMotion={reducedMotion} lamps={route !== 'entry'} />
      </Suspense>
      <Suspense fallback={null}>
        <TvStage
          lobbyPos={tvPos}
          lobbyWidth={width}
          aspect={aspect}
          picture={pictures[channel - 1] ?? null}
          staticTexture={staticTexture}
          showStatic={showStatic}
          testCard={testCard}
          roomTexture={roomTexture}
          glow={level}
          crt={effects}
          still={reducedMotion}
        />
      </Suspense>
      {route !== 'entry' && (
        <Suspense fallback={null}>
          <Cassettes tvWidth={width} spots={spots} />
        </Suspense>
      )}
      {route === 'lobby' && (
        <>
          <Hotspot3D position={screenPos} label={t('lobby.hotspot.tv')} onSelect={() => go({ name: 'custom' })} testId="hotspot-tv" />
          <Hotspot3D
            position={tapesPos}
            label={t('lobby.hotspot.tapes')}
            onSelect={() => {
              go({ name: 'custom' });
              setDrawerOpen(true);
            }}
            testId="hotspot-tapes"
          />
        </>
      )}
    </group>
  );
}

/** Lighting matched to the painting: warm key from the table lamp, warm fill from the lantern, cool window spill. */
function Lights({ frame }: { frame: BackdropFrame }) {
  const lamp = frame.anchor(0.71, 0.5, 5.2);
  const lantern = frame.anchor(0.5, 0.1, 5.4);
  const windowSpill = frame.anchor(0.14, 0.3, 5.5);
  return (
    <>
      <hemisphereLight args={['#8d7b6c', '#2a1d17', 0.9]} />
      <pointLight position={lamp} color="#ffb056" intensity={10} decay={0} />
      <pointLight position={lantern} color="#ffd39b" intensity={4.5} decay={0} />
      <pointLight position={windowSpill} color="#6f8fd6" intensity={1.4} decay={0} />
    </>
  );
}

interface RoomProps {
  frame: BackdropFrame;
  blur: number;
  dim: number;
  onTexture: (t: Texture) => void;
  effects: boolean;
  reducedMotion: boolean;
  /** The halos on the lamps belong to the lit room, not to the dark entry. */
  lamps: boolean;
}

/** The painted salon (2.5D backdrop, halos on the two lamps); marks the lobby ready once its textures are in. */
function Room({ frame, blur, dim, onTexture, effects, reducedMotion, lamps }: RoomProps) {
  const setLobbyReady = useApp((s) => s.setLobbyReady);
  const [room, roomBlur] = useSceneTextures([salonUrl(), SALON_BLUR]) as [Texture, Texture];
  useEffect(() => {
    room.anisotropy = 8;
    onTexture(room);
  }, [room, onTexture]);
  useEffect(setLobbyReady, [setLobbyReady]);
  useLiftCurtain();
  return (
    <>
      <Backdrop frame={frame} texture={room} blurTexture={roomBlur} blur={blur} dim={dim} />
      {lamps &&
        LAMPS.map((lamp, i) => (
          <LampGlow key={i} position={frame.anchor(lamp.u, lamp.v, 9.8)} size={lamp.size} phase={i * 4.1} flicker={effects && !reducedMotion} />
        ))}
    </>
  );
}

interface TvStageProps {
  lobbyPos: Vec3;
  lobbyWidth: number;
  aspect: number;
  picture: Texture | null;
  staticTexture: Texture;
  showStatic: boolean;
  testCard: Texture | null;
  roomTexture: Texture | null;
  glow: number;
  crt: boolean;
  still: boolean;
}

/** Two quick flickers, then steady: the tube catching. */
const flashAt = (ms: number) => {
  if (ms < 0) return 0;
  if (ms < 90) return 0.9;
  if (ms < 180) return 0;
  if (ms < 270) return 0.7;
  return Math.max(0, 0.5 - (ms - 270) / 500);
};

/**
 * The one TV of the experience: on black at the entry (swaying, tape in front), then it travels to
 * the cabinet in the salon, so Entry and Lobby show the same object.
 */
function TvStage({ lobbyPos, lobbyWidth, aspect, picture, staticTexture, showStatic, testCard, roomTexture, glow, crt, still }: TvStageProps): ReactNode {
  const route = useApp((s) => s.route.name);
  const phase = useApp((s) => s.entryPhase);
  const setTvReady = useApp((s) => s.setTvReady);
  const rig = useRef<Group>(null);
  const tape = useRef<Group>(null);
  const flash = useRef(0);
  const onSince = useRef(0);
  const prevRoute = useRef(route);
  const placed = useRef(false);

  const entry = useMemo(() => {
    const tan = Math.tan((25 * Math.PI) / 180);
    const viewH = 2 * ENTRY_DEPTH * tan;
    const width = Math.min(viewH * 0.58, viewH * aspect * 0.5);
    return { width, pos: [0, 0.2 - 0.43 * width, -ENTRY_DEPTH] as Vec3 };
  }, [aspect]);

  // Place the rig; travel from the entry spot to the cabinet when the visitor goes in.
  useEffect(() => {
    const g = rig.current;
    if (!g) return;
    const to = route === 'entry' ? { pos: entry.pos, width: entry.width } : { pos: lobbyPos, width: lobbyWidth };
    const travelling = prevRoute.current === 'entry' && route !== 'entry' && placed.current && !still;
    prevRoute.current = route;
    placed.current = true;
    if (!travelling) {
      g.position.set(...to.pos);
      g.scale.setScalar(to.width);
      return;
    }
    const tween = gsap.timeline({ defaults: { duration: TRAVEL_S, ease: 'power2.inOut', overwrite: true } });
    tween.to(g.position, { x: to.pos[0], y: to.pos[1], z: to.pos[2] }, 0);
    tween.to(g.scale, { x: to.width, y: to.width, z: to.width }, 0);
    tween.to(g.rotation, { x: 0, y: 0 }, 0);
    return () => {
      tween.kill();
    };
  }, [route, entry, lobbyPos, lobbyWidth, still]);

  // The tape slides into the front of the TV.
  useEffect(() => {
    const t = tape.current;
    if (!t) return;
    if (phase === 'insert') {
      const tween = gsap.timeline({ defaults: { overwrite: true } });
      tween.to(t.position, { x: -0.09, y: 0.07, z: 0.22, duration: 0.95, ease: 'power2.in' }, 0);
      tween.to(t.rotation, { y: 0, duration: 0.95, ease: 'power2.inOut' }, 0);
      return () => {
        tween.kill();
      };
    }
    t.position.set(0.74, 0, 0.3);
    t.rotation.set(0, -0.45, 0);
  }, [phase, route]);
  useEffect(() => {
    if (phase === 'on') onSince.current = performance.now();
  }, [phase]);

  useFrame((state, delta) => {
    const g = rig.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    if (route === 'entry' && !still && phase !== 'on') {
      g.rotation.y = Math.sin(t * 0.55) * 0.11;
      g.rotation.x = Math.sin(t * 0.4 + 1) * 0.018;
    } else if (route === 'entry') {
      g.rotation.y = MathUtils.damp(g.rotation.y, 0, 6, delta);
      g.rotation.x = MathUtils.damp(g.rotation.x, 0, 6, delta);
    }
    flash.current = phase === 'on' && !still ? flashAt(performance.now() - onSince.current) : 0;
  });

  const screen = phase === 'on' && roomTexture ? roomTexture : testCard ?? (showStatic || !picture ? staticTexture : picture);

  return (
    <group ref={rig}>
      <TvSet screenTexture={screen} glow={glow} crt={crt} still={still} flashRef={flash} onReady={setTvReady} />
      {route === 'entry' && <EntryCassette ref={tape} />}
    </group>
  );
}
