import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { useCamera } from './cameraStore';
import { useApp } from '../app/appStore';
import { useSettings } from '../app/settingsStore';

const MAX_YAW = 0.14;
/** Portrait screens see a thin slice of each render, so they may look further around. */
const MAX_YAW_NARROW = 0.3;
const MAX_PITCH = 0.06;
const ZOOM_RANGE = 10;
/** Pointer parallax: how far the camera slides (world units) at the screen edge. */
const PARALLAX = { x: 0.2, y: 0.1 };
/** Exponential damping rates (1/s): higher = snappier. The journey itself is eased by GSAP on top. */
const FOLLOW_POSE = 7;
const FOLLOW_LOOK = 5;
const FOLLOW_POINTER = 3.2;

/**
 * Physical camera: GSAP eases the goal along each journey, and the camera follows the goal with
 * damping, so every move starts and stops with a little inertia. Pointer parallax and a slow idle
 * drift ride on top; reduced motion swaps journeys for a crossfade and removes parallax and drift.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const pose = useCamera((s) => s.pose);
  const duration = useCamera((s) => s.duration);
  const interactive = useCamera((s) => s.interactive);
  const reducedMotion = useSettings((s) => s.reducedMotion);

  const goal = useRef({ px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: -10, fov: 50 });
  const now = useRef({ px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: -10, fov: 50 });
  /** Drag-to-look target and its damped value. */
  const look = useRef({ yaw: 0, pitch: 0, zoom: 0 });
  const lookNow = useRef({ yaw: 0, pitch: 0, zoom: 0 });
  const pointerNow = useRef({ x: 0, y: 0 });
  const target = useRef(new Vector3());
  const first = useRef(true);

  useEffect(() => {
    const [px, py, pz] = pose.position;
    const [tx, ty, tz] = pose.target;
    const to = { px, py, pz, tx, ty, tz, fov: pose.fov };
    if (first.current || duration === 0) {
      first.current = false;
      Object.assign(goal.current, to);
      Object.assign(now.current, to);
      return;
    }
    if (reducedMotion) {
      // No travelling: dissolve and arrive (a scene change already hides the jump behind the curtain).
      if (useApp.getState().curtain) {
        Object.assign(goal.current, to);
        Object.assign(now.current, to);
        return;
      }
      useCamera.getState().dissolve();
      const timer = window.setTimeout(() => {
        Object.assign(goal.current, to);
        Object.assign(now.current, to);
      }, 180);
      return () => window.clearTimeout(timer);
    }
    const tween = gsap.to(goal.current, { ...to, duration, ease: 'power2.inOut', overwrite: true });
    return () => {
      tween.kill();
    };
  }, [pose, duration, reducedMotion]);

  useEffect(() => {
    if (!interactive) {
      look.current.yaw = look.current.pitch = look.current.zoom = 0;
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
      const maxYaw = el.clientWidth < el.clientHeight ? MAX_YAW_NARROW : MAX_YAW;
      l.yaw = clamp(l.yaw + ((e.clientX - dragging.x) / el.clientWidth) * 0.6, -maxYaw, maxYaw);
      l.pitch = clamp(l.pitch - ((e.clientY - dragging.y) / el.clientHeight) * 0.3, -MAX_PITCH, MAX_PITCH);
      dragging = { x: e.clientX, y: e.clientY };
    };
    const up = () => {
      dragging = null;
    };
    const wheel = (e: WheelEvent) => {
      // In Story mode the wheel travels between stops instead of zooming.
      if (useApp.getState().story) return;
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
  }, [interactive, gl]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = goal.current;
    const c = now.current;
    const lk = lookNow.current;
    const lt = look.current;
    const p = pointerNow.current;

    // Follow the journey goal with inertia.
    for (const k of ['px', 'py', 'pz', 'tx', 'ty', 'tz', 'fov'] as const) c[k] = MathUtils.damp(c[k], g[k], FOLLOW_POSE, dt);
    lk.yaw = MathUtils.damp(lk.yaw, lt.yaw, FOLLOW_LOOK, dt);
    lk.pitch = MathUtils.damp(lk.pitch, lt.pitch, FOLLOW_LOOK, dt);
    lk.zoom = MathUtils.damp(lk.zoom, lt.zoom, FOLLOW_LOOK, dt);

    const still = reducedMotion;
    p.x = MathUtils.damp(p.x, still ? 0 : state.pointer.x, FOLLOW_POINTER, dt);
    p.y = MathUtils.damp(p.y, still ? 0 : state.pointer.y, FOLLOW_POINTER, dt);
    const t = state.clock.elapsedTime;
    const driftX = still ? 0 : Math.sin((t * Math.PI * 2) / 15) * 0.035;
    const driftY = still ? 0 : Math.sin((t * Math.PI * 2) / 11 + 1.3) * 0.02;
    // Smaller sway while the camera frames something small (TV close-up).
    const amount = interactive ? 1 : 0.35;
    const offX = p.x * PARALLAX.x * amount + driftX;
    const offY = p.y * PARALLAX.y * amount + driftY;

    camera.position.set(c.px + offX, c.py + offY, c.pz);
    const dist = Math.hypot(c.tx - c.px, c.ty - c.py, c.tz - c.pz);
    // Drag right turns the view left, like grabbing the room.
    const yaw = -lk.yaw;
    const pitch = lk.pitch;
    target.current.set(c.tx + yaw * dist + offX * 0.4, c.ty + pitch * dist + offY * 0.4, c.tz);
    camera.lookAt(target.current);
    const fov = c.fov + lk.zoom;
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
