import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, Color, DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry, PointLight, ShaderMaterial, SRGBColorSpace, Vector3, type Texture } from 'three';
import { useModel, MODEL_URLS } from '../../stage/useModel';
import { TV_MODEL } from './tvGeometry';

interface TvSetProps {
  /** What the glass shows: static, a channel picture, the test card, or the room. */
  screenTexture: Texture | null;
  /** Cool light spilling from the screen onto the frame, the cabinet and the wall (0–1). */
  glow: number;
  /** CRT curvature, scanlines and flicker on the glass (the nostalgia layer; off with "effects off"). */
  crt: boolean;
  /** No flicker when motion is reduced. */
  still?: boolean;
  /** Brief white flash of the tube switching on (0–1), read every frame so it never re-renders the scene. */
  flashRef?: { current: number };
  onReady?: () => void;
}

/**
 * The old CRT TV (public/models/tv.glb), 1 unit wide with its base on y = 0 (scale it from outside).
 * The glass is part of the body mesh, so the live picture is a slightly bulged quad in front of it.
 * Materials are softened (less chrome, warm tint) so the model sits in the painted room.
 */
export function TvSet({ screenTexture, glow, crt, still = false, flashRef, onReady }: TvSetProps) {
  const gltf = useModel(MODEL_URLS.tv);
  const root = useRef<Group>(null);
  const light = useRef<PointLight>(null);

  const body = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const mat = (mesh.material as MeshStandardMaterial).clone();
      mat.metalness = 0.4;
      mat.roughness = 1;
      mat.color = new Color('#f1dfc8');
      mat.normalScale.set(0.7, 0.7);
      for (const map of [mat.map, mat.normalMap, mat.metalnessMap, mat.aoMap]) if (map) map.anisotropy = 8;
      mesh.material = mat;
    });
    return clone;
  }, [gltf]);
  useEffect(
    () => () =>
      body.traverse((o) => {
        const mesh = o as Mesh;
        if (mesh.isMesh) (mesh.material as MeshStandardMaterial).dispose();
      }),
    [body],
  );

  const s = TV_MODEL.screen;
  const glass = useMemo(() => {
    const g = new PlaneGeometry(s.w, s.h, 24, 18);
    const p = g.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      const nx = p.getX(i) / (s.w / 2);
      const ny = p.getY(i) / (s.h / 2);
      p.setZ(i, -0.075 * (nx * nx + ny * ny));
    }
    g.computeVertexNormals();
    return g;
  }, [s.w, s.h]);
  useEffect(() => () => glass.dispose(), [glass]);

  const shadow = useMemo(() => radialTexture('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)'), []);
  useEffect(() => () => shadow.dispose(), [shadow]);

  const screenMat = useMemo(() => crtMaterial(s.w, s.h), [s.w, s.h]);
  useEffect(() => () => screenMat.dispose(), [screenMat]);
  useEffect(() => {
    onReady?.();
    // once, when the model has arrived
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const u = screenMat.uniforms;
    u.map!.value = screenTexture;
    u.crt!.value = crt ? 1 : 0;
    u.time!.value = t;
    u.flicker!.value = crt && !still ? 1 : 0;
    const flash = flashRef?.current ?? 0;
    u.flash!.value = flash;
    if (light.current && root.current) {
      const k = root.current.getWorldScale(scratch).x;
      const wobble = !still ? 0.1 * Math.sin(t * 23) * Math.sin(t * 7.3) : 0;
      light.current.intensity = (glow + flash * 1.5) * (1 + wobble) * 2.4;
      light.current.distance = 2.4 * k;
    }
  });

  return (
    <group ref={root}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} renderOrder={1}>
        <planeGeometry args={[1.45, 1.0]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <primitive object={body} />
      <mesh geometry={glass} material={screenMat} position={[s.cx, s.cy, s.z + 0.075 - 0.003]} renderOrder={2} />
      <pointLight ref={light} position={[s.cx, s.cy, 0.8]} color="#86a9ff" intensity={0} decay={1} />
    </group>
  );
}

const scratch = new Vector3();

function radialTexture(inner: string, outer: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

const CRT_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/** Rounded glass outline, barrel curvature, scanlines, colour fringing, vignette, tube warm-up flash and flicker. */
const CRT_FRAGMENT = `
uniform sampler2D map;
uniform vec2 size;
uniform float time;
uniform float crt;
uniform float flicker;
uniform float flash;
varying vec2 vUv;

vec2 curve(vec2 uv) {
  uv = uv * 2.0 - 1.0;
  vec2 offset = abs(uv.yx) / vec2(5.5, 4.5);
  uv = uv + uv * offset * offset;
  return uv * 0.5 + 0.5;
}

void main() {
  vec2 q = abs(vUv - 0.5) * size - size * 0.5 + 0.075;
  if (length(max(q, 0.0)) - 0.075 > 0.0) discard;
  vec2 uv = crt > 0.5 ? curve(vUv) : vUv;
  vec3 col = vec3(0.0);
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
    col = texture2D(map, uv).rgb;
    if (crt > 0.5) {
      float fringe = 0.0016;
      col.r = texture2D(map, uv + vec2(fringe, 0.0)).r;
      col.b = texture2D(map, uv - vec2(fringe, 0.0)).b;
      col *= 0.86 + 0.14 * sin(uv.y * 96.0 * 6.28318);
      vec2 d = vUv - 0.5;
      col *= 1.0 - dot(d, d) * 1.6;
      col += 0.03;
      col *= 1.0 + flicker * 0.035 * sin(time * 47.0) * sin(time * 5.0);
    }
  }
  col += flash * vec3(0.85, 0.92, 1.0);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function crtMaterial(w: number, h: number) {
  return new ShaderMaterial({
    uniforms: { map: { value: null }, size: { value: [w, h] }, time: { value: 0 }, crt: { value: 1 }, flicker: { value: 1 }, flash: { value: 0 } },
    vertexShader: CRT_VERTEX,
    fragmentShader: CRT_FRAGMENT,
    toneMapped: false,
    side: DoubleSide,
  });
}
