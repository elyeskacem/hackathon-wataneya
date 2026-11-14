import type { ReactNode } from 'react';
import styles from './IconButton.module.css';

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  pressed?: boolean;
  /** Red fill, as the menu button when its panel is open. */
  active?: boolean;
  disabled?: boolean;
  testId?: string;
}

/** Round 48 px glass button with an accessible label (icons are decorative). */
export function IconButton({ label, onClick, children, pressed, active, disabled, testId }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.button} glass ${active ? styles.active : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      data-testid={testId}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
