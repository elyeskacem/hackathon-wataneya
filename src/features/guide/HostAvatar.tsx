import type { GuideStatus } from './guideStore';
import styles from './HostAvatar.module.css';

/**
 * The guide's face: a neutral, fictional Wataniya host drawn as a silhouette.
 * It is deliberately not based on any real person (research: risks and ethics).
 */
export function HostAvatar({ status = 'idle', size = 48 }: { status?: GuideStatus; size?: number }) {
  return (
    <span className={`${styles.avatar} ${styles[status]}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="32" fill="var(--memory-wood)" />
        <g className={styles.body}>
          <path d="M10 64c2-13 11-19 22-19s20 6 22 19z" fill="var(--memory-paper)" />
          <path d="M26 47l6 6 6-6-2-3h-8z" fill="var(--accent-default)" />
          <path d="M28 47.5 25 50l3 2.5zM36 47.5l3 2.5-3 2.5z" fill="var(--accent-default)" />
          <circle cx="32" cy="27" r="11" fill="var(--art-warm-300)" />
          <path d="M21 25c0-8 5-12 11-12s11 4 11 12c-3-4-7-5-11-5s-8 1-11 5z" fill="var(--art-ink-700)" />
          <rect x="24.5" y="25" width="6" height="4" rx="1.5" fill="none" stroke="var(--art-ink-700)" strokeWidth="1.2" />
          <rect x="33.5" y="25" width="6" height="4" rx="1.5" fill="none" stroke="var(--art-ink-700)" strokeWidth="1.2" />
          <path className={styles.mouth} d="M29 33q3 2 6 0" fill="none" stroke="var(--art-ink-700)" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      </svg>
    </span>
  );
}
