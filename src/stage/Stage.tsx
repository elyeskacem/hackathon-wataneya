import { Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { XR, createXRStore } from '@react-three/xr';
import { useApp } from '../app/appStore';
import { LobbyScene } from '../features/lobby/LobbyScene';
import { CameraRig } from './CameraRig';
import { StageBoundary } from './StageBoundary';
import { webglAvailable } from './webgl';
import styles from './Stage.module.css';

// Each moment loads on demand, behind the static curtain.
const MomentScene = lazy(() => import('../features/moment/MomentScene'));

export const xrStore = createXRStore({ emulate: false });

/** One persistent WebGL canvas; scenes mount and unmount inside it (textures dispose on unmount). */
export function Stage() {
  const route = useApp((s) => s.route);
  const setStageFailed = useApp((s) => s.setStageFailed);
  if (!webglAvailable) return null;
  return (
    <div className={styles.stage}>
      <StageBoundary onError={setStageFailed}>
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
          camera={{ fov: 50, near: 0.05, far: 100, position: [0, 0, 0] }}
          onCreated={({ gl }) => gl.setClearColor('#1b1c1e')}
        >
          <XR store={xrStore}>
            <CameraRig />
            <Suspense fallback={null}>
              {route.name === 'moment' ? <MomentScene momentId={route.momentId} roomId={route.roomId} /> : <LobbyScene />}
            </Suspense>
          </XR>
        </Canvas>
      </StageBoundary>
    </div>
  );
}
