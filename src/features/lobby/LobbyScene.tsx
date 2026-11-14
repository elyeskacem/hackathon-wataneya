import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { Texture } from 'three';
import { useSceneTextures } from '../../stage/textures';
import { useApp } from '../../app/appStore';
import { useSettings } from '../../app/settingsStore';
import { useLiftCurtain } from '../../app/transitions';
import { asset } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { Backdrop } from '../../stage/Backdrop';
import { REST_POSE, useCamera, type CameraPose, type Vec3 } from '../../stage/cameraStore';
import { Hotspot3D } from '../../stage/Hotspot3D';
import { useStaticTexture } from '../../stage/staticNoise';
import { useBackdropFrame } from '../../stage/useBackdropFrame';
import { TvSet } from '../custom/TvSet';
import { useChannelPictures } from '../custom/channelPictures';
import { screenCenterOffset } from '../custom/tvGeometry';

export const LOBBY_URLS = [asset('renders/lobby-living-room.webp'), asset('renders/lobby-living-room-blur.webp')];
const IMAGE_ASPECT = 1005 / 644;
/** Where the TV stands: the coffee table in the living-room render. */
const TV_ANCHOR = { u: 0.435, v: 0.545, depth: 6 };
const TV_BODY_SHARE = 0.2;
/** First arrival: the camera eases in from the doorway (1.6 s, motion spec). */
const DOORWAY_POSE: CameraPose = { position: [0.5, 0.15, 2.4], target: [0.2, 0, -10], fov: 50 };

/** Living room shared by Entry (preloaded behind the loader), Lobby and Custom mode. */
export function LobbyScene() {
  const route = useApp((s) => s.route.name);
  const channel = useApp((s) => s.channel);
  const staticBurst = useApp((s) => s.staticBurst);
  const inserting = useApp((s) => s.inserting);
  const go = useApp((s) => s.go);
  const setDrawerOpen = useApp((s) => s.setDrawerOpen);
  const setLobbyReady = useApp((s) => s.setLobbyReady);
  const effects = useSettings((s) => s.effects);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const { t, locale } = useT();

  const [room, roomBlur] = useSceneTextures(LOBBY_URLS) as [Texture, Texture];
  const pictures = useChannelPictures(locale);
  const frame = useBackdropFrame(IMAGE_ASPECT);
  const aspect = useThree((s) => s.size.width / s.size.height);

  const isCustom = route === 'custom';
  const showStatic = !isCustom || staticBurst;
  const staticTexture = useStaticTexture(showStatic, effects && !reducedMotion);

  const tvPos = frame.anchor(TV_ANCHOR.u, TV_ANCHOR.v, TV_ANCHOR.depth);
  const bodyHeight = frame.heightAt(TV_ANCHOR.depth) * TV_BODY_SHARE;

  const setPose = useCamera((s) => s.setPose);
  const setInteractive = useCamera((s) => s.setInteractive);
  const [tx, ty, tz] = tvPos;

  useEffect(() => {
    if (route === 'entry') {
      setPose(DOORWAY_POSE, 0);
      setInteractive(false);
    } else if (route === 'lobby') {
      setPose(REST_POSE, 1.6);
      setInteractive(true);
    } else if (route === 'custom') {
      // Glide to the TV so its body fills about 55 % of the view height (1.4 s, motion spec);
      // when the tape goes in, push through the screen.
      // On narrow screens the width decides: the TV (body ≈ 0.9 × its height wide) fills 85 % of it.
      const tan = Math.tan((25 * Math.PI) / 180);
      const distance = Math.max(bodyHeight / (0.55 * 2 * tan), (bodyHeight * 0.9) / (0.85 * 2 * tan * aspect));
      const [sx, sy] = screenCenterOffset(bodyHeight);
      const pose: CameraPose = inserting
        ? { position: [tx + sx, ty + sy, tz + distance * 0.18], target: [tx + sx, ty + sy, tz - 10], fov: 50 }
        : { position: [tx, ty + bodyHeight * 0.06, tz + distance], target: [tx, ty + bodyHeight * 0.06, tz - 10], fov: 50 };
      setPose(pose, inserting ? 0.9 : 1.4);
      setInteractive(false);
    }
  }, [route, inserting, tx, ty, tz, bodyHeight, aspect, setPose, setInteractive]);

  // Runs once textures resolved (this component suspends until then).
  useEffect(setLobbyReady, [setLobbyReady]);
  useLiftCurtain();

  const [sx, sy] = screenCenterOffset(bodyHeight);
  const screenPos: Vec3 = [tx + sx, ty + sy, tz + 0.01];
  const tapesPos: Vec3 = [tx + bodyHeight * 0.55, ty - bodyHeight * 0.62, tz + 0.01];

  return (
    <group>
      <Backdrop frame={frame} texture={room} blurTexture={roomBlur} blur={isCustom ? 1 : 0} dim={isCustom ? 0.25 : 0} />
      <TvSet
        position={tvPos}
        bodyHeight={bodyHeight}
        picture={pictures[channel - 1] ?? null}
        staticTexture={staticTexture}
        showStatic={showStatic}
        glow={isCustom && effects}
      />
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
