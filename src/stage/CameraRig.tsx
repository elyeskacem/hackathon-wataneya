import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { PerspectiveCamera, Vector3 } from 'three';
import { useCamera } from './cameraStore';
import { useSettings } from '../app/settingsStore';

const MAX_YAW = 0.14;
const MAX_PITCH = 0.06;
const ZOOM_RANGE = 10;

/** Eased camera glides between scene poses, plus slow drift and limited drag-to-look / zoom. */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const pose = useCamera((s) => s.pose);
  const duration = useCamera((s) => s.duration);
  const interactive = useCamera((s) => s.interactive);
  const reducedMotion = useSettings((s) => s.reducedMotion);

  const current = useRef({ px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: -10, fov: 50 });
  const look = useRef({ yaw: 0, pitch: 0, zoom: 0 });
  const target = useRef(new Vector3());

  useEffect(() => {
    const [px, py, pz] = pose.position;
    const [tx, ty, tz] = pose.target;
    const to = { px, py, pz, tx, ty, tz, fov: pose.fov };
    const tween = gsap.to(current.current, { ...to, duration: reducedMotion ? 0 : duration, ease: 'power2.inOut', overwrite: true });
    return () => {
      tween.kill();
    };
  }, [pose, duration, reducedMotion]);

  useEffect(() => {
    if (!interactive) {
      gsap.to(look.current, { yaw: 0, pitch: 0, zoom: 0, duration: reducedMotion ? 0 : 0.8, ease: 'power2.out' });
      return;
    }
    const el = gl.domElement;
    let dragging: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      dragging = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const l = look.current;
      l.yaw = clamp(l.yaw + ((e.clientX - dragging.x) / el.clientWidth) * 0.6, -MAX_YAW, MAX_YAW);
      l.pitch = clamp(l.pitch - ((e.clientY - dragging.y) / el.clientHeight) * 0.3, -MAX_PITCH, MAX_PITCH);
      dragging = { x: e.clientX, y: e.clientY };
    };
    const up = () => {
      dragging = null;
    };
    const wheel = (e: WheelEvent) => {
      const l = look.current;
      l.zoom = clamp(l.zoom + Math.sign(e.deltaY) * 1.5, -ZOOM_RANGE, ZOOM_RANGE * 0.3);
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [interactive, gl, reducedMotion]);

  useFrame((state) => {
    const c = current.current;
    const l = look.current;
    const drift = reducedMotion ? 0 : Math.sin((state.clock.elapsedTime * Math.PI * 2) / 12) * 0.012;
    const follow = reducedMotion || !interactive ? 0 : 0.02;
    camera.position.set(c.px, c.py, c.pz);
    const dist = Math.hypot(c.tx - c.px, c.ty - c.py, c.tz - c.pz);
    // Drag right turns the view left, like grabbing the room.
    const yaw = -l.yaw + drift + state.pointer.x * follow;
    const pitch = l.pitch + state.pointer.y * follow * 0.5;
    target.current.set(c.tx + yaw * dist, c.ty + pitch * dist, c.tz);
    camera.lookAt(target.current);
    const fov = c.fov + l.zoom;
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
