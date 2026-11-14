import { Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { useApp } from '../app/appStore';
import { LobbyScene } from '../features/lobby/LobbyScene';
import { CameraRig } from './CameraRig';
import styles from './Stage.module.css';

// Each moment loads on demand, behind the static curtain.
const MomentScene = lazy(() => import('../features/moment/MomentScene'));

export const xrStore = createXRStore({ emulate: false });

/** One persistent WebGL canvas; scenes mount and unmount inside it (textures dispose on unmount). */
export function Stage() {
  const route = useApp((s) => s.route);
  return (
    <div className={styles.stage}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
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
    </div>
  );
}
