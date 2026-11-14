import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { CanvasTexture, Color, Euler, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, SRGBColorSpace, Vector3, type Group } from 'three';
import { useModel, MODEL_URLS } from '../../stage/useModel';

/** Baked cassette (public/models/cassette.glb): 1 wide (x), 1.45 long (z), 0.141 thick, lying flat on y = 0. */
const LONG = 1.45;
const THICK = 0.141;
const SPAN = 0.34;

function useCassettePart() {
  const gltf = useModel(MODEL_URLS.cassette);
  const part = useMemo(() => {
    let found: Mesh | null = null;
    gltf.scene.traverse((o) => {
      if (!found && (o as Mesh).isMesh) found = o as Mesh;
    });
    const source = found as Mesh | null;
    if (!source) throw new Error('cassette.glb has no mesh');
    const material = (source.material as MeshStandardMaterial).clone();
    material.metalness = 0.3;
    material.roughness = 1;
    material.color = new Color('#f1dfc8');
    for (const map of [material.map, material.normalMap, material.metalnessMap, material.aoMap]) if (map) map.anisotropy = 8;
    return { geometry: source.geometry, material };
  }, [gltf]);
  useEffect(() => () => part.material.dispose(), [part]);
  return part;
}

export interface CassetteSpot {
  /** Centre of the tape's underside, world units. */
  position: [number, number, number];
  /** Turn around the vertical axis (radians). 0 = long side along x. */
  rotY: number;
}

interface CassettesProps {
  /** World width of the TV; a tape is 34 % of it long. */
  tvWidth: number;
  spots: CassetteSpot[];
}

/** Several tapes as one instanced mesh, each with a soft contact shadow. */
export function Cassettes({ tvWidth, spots }: CassettesProps) {
  const { geometry, material } = useCassettePart();
  const mesh = useRef<InstancedMesh>(null);
  const shadow = useMemo(() => shadowTexture(), []);
  useEffect(() => () => shadow.dispose(), [shadow]);
  const k = (SPAN * tvWidth) / LONG;

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const matrix = new Matrix4();
    spots.forEach((spot, i) => {
      matrix.compose(new Vector3(...spot.position), new Quaternion().setFromEuler(new Euler(0, spot.rotY + Math.PI / 2, 0)), new Vector3(k, k, k));
      m.setMatrixAt(i, matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [spots, k]);

  return (
    <group>
      <instancedMesh ref={mesh} args={[geometry, material, spots.length]} frustumCulled={false} />
      {spots.map((spot, i) => (
        <mesh key={i} position={[spot.position[0], spot.position[1] + 0.002, spot.position[2]]} rotation={[-Math.PI / 2, 0, spot.rotY]} renderOrder={1}>
          <planeGeometry args={[SPAN * tvWidth * 1.35, SPAN * tvWidth * 0.95]} />
          <meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** A single tape for the entry screen, in the TV's own units (1 = TV width); the scene moves the group. */
export const EntryCassette = forwardRef<Group>(function EntryCassette(_props, ref) {
  const { geometry, material } = useCassettePart();
  const k = SPAN / LONG;
  return (
    <group ref={ref}>
      <mesh geometry={geometry} material={material} scale={k} rotation={[0, Math.PI / 2, 0]} position={[0, THICK * k * 0.0, 0]} />
    </group>
  );
});

/** Tape thickness for a TV of the given world width, to stack one tape on another. */
export const tapeThickness = (tvWidth: number) => THICK * ((SPAN * tvWidth) / LONG);

function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.7)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}
