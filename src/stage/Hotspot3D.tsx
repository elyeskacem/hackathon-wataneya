import { Html } from '@react-three/drei';
import type { Vec3 } from './cameraStore';
import styles from './Hotspot3D.module.css';

interface HotspotProps {
  position: Vec3;
  label: string;
  onSelect: () => void;
  icon?: 'ring' | 'door' | 'talk';
  /** Keep the label visible (used for door and character prompts in moments). */
  showLabel?: boolean;
  testId?: string;
}

/**
 * Gold ring anchored in the scene, rendered as a real <button> so it is reachable with Tab,
 * announced by screen readers and at least 48 px.
 */
export function Hotspot3D({ position, label, onSelect, icon = 'ring', showLabel = false, testId }: HotspotProps) {
  return (
    // The zero-width anchor must stay LTR, or RTL right-aligns the button away from its point.
    <Html position={position} center zIndexRange={[20, 10]} wrapperClass={styles.anchor}>
      <button
        type="button"
        className={`${styles.hotspot} ${showLabel ? styles.pinned : ''}`}
        onClick={onSelect}
        aria-label={label}
        data-testid={testId}
      >
        <span className={styles.ring} aria-hidden="true">
          <span className={styles.dot} />
        </span>
        <span className={`${styles.label} glass`} aria-hidden="true">
          {icon === 'talk' && <TalkIcon />}
          {icon === 'door' && <DoorIcon />}
          {label}
        </span>
      </button>
    </Html>
  );
}

function TalkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M4 5h16v11H9l-5 4z" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M6 21V4h12v17M3 21h18M14 12h.01" />
    </svg>
  );
}
