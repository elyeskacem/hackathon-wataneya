import { useEffect } from 'react';
import { useApp } from '../../app/appStore';
import { endStory, goToStop } from './story';

/** Gap after a journey starts before another scroll or swipe may start the next one. */
const LOCK_MS = 1700;
const WHEEL_THRESHOLD = 60;
const SWIPE_THRESHOLD = 48;

const isTyping = (t: EventTarget | null) => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;

/** Story mode travel: scroll, swipe and arrow keys step through the stops; Esc ends the story. */
export function useTravelInput() {
  const story = useApp((s) => s.story);

  useEffect(() => {
    if (!story) return;
    let lockedUntil = 0;
    let acc = 0;
    let touchY: number | null = null;

    const step = (dir: 1 | -1) => {
      const now = performance.now();
      const app = useApp.getState();
      if (now < lockedUntil || app.guideOpen || app.drawerOpen || app.inserting) return;
      lockedUntil = now + LOCK_MS;
      acc = 0;
      void goToStop(app.storyIndex + dir);
    };

    const onWheel = (e: WheelEvent) => {
      acc += e.deltaY;
      if (Math.abs(acc) >= WHEEL_THRESHOLD) step(acc > 0 ? 1 : -1);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const end = e.changedTouches[0]?.clientY;
      if (touchY === null || end === undefined) return;
      const dy = touchY - end;
      touchY = null;
      if (Math.abs(dy) >= SWIPE_THRESHOLD) step(dy > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      const app = useApp.getState();
      if (isTyping(e.target) || app.guideOpen || app.menuOpen) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'Escape') {
        // First Esc leaves the guided journey, the next one behaves as usual.
        e.stopImmediatePropagation();
        endStory();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    // Capture phase, so the story handles its keys before the scene's own arrow/Esc handlers.
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [story]);
}
