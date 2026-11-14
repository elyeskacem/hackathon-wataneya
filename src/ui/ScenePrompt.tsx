import styles from './ScenePrompt.module.css';

interface ScenePromptProps {
  /** A short question in the scene's own voice, e.g. «تحب تدخل للتلفزة؟». */
  line: string;
  /** The single action that answers it; omit when a button already on screen is the answer. */
  action?: string;
  onAction?: () => void;
  testId?: string;
  actionTestId?: string;
}

/** A floating line that invites the next step, in place; it fades with the rest of the chrome when idle. */
export function ScenePrompt({ line, action, onAction, testId, actionTestId }: ScenePromptProps) {
  return (
    <div className={`${styles.prompt} chrome`} data-testid={testId}>
      <p className={styles.line}>{line}</p>
      {action && (
        <button type="button" className={`${styles.action} glass`} onClick={onAction} data-testid={actionTestId}>
          {action}
        </button>
      )}
    </div>
  );
}
