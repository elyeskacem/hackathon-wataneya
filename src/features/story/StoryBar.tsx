import { useApp } from '../../app/appStore';
import { momentById } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { endStory, goToStop, STORY } from './story';
import styles from './StoryBar.module.css';

/** Story mode: where you are in the visit, a hint to keep scrolling, and a way to explore alone. */
export function StoryBar() {
  const { t, pick } = useT();
  const index = useApp((s) => s.storyIndex);
  const last = index === STORY.length - 1;
  const moment = momentById(STORY[index]!.momentId);

  return (
    <div className={`${styles.bar} glass chrome`} role="group" aria-label={t('story.label')} data-testid="story-bar">
      <button type="button" className={styles.step} onClick={() => void goToStop(index - 1)} disabled={index === 0} aria-label={t('story.prev')} data-testid="story-prev">
        <Chevron up />
      </button>
      <div className={styles.middle}>
        <p className={styles.stop} aria-live="polite">
          <bdi dir="ltr">{moment.channel}/{STORY.length}</bdi> · {pick(moment.title)}
        </p>
        <div
          className={styles.track}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STORY.length}
          aria-valuenow={index + 1}
          aria-valuetext={t('story.progress', { n: index + 1, total: STORY.length })}
          data-testid="story-progress"
        >
          <span style={{ width: `${((index + 1) / STORY.length) * 100}%` }} />
        </div>
        <p className={styles.hint}>{last ? t('story.end') : t('story.hint')}</p>
      </div>
      <button type="button" className={styles.step} onClick={() => (last ? endStory() : void goToStop(index + 1))} aria-label={last ? t('story.end') : t('story.next')} data-testid="story-next">
        <Chevron />
      </button>
      <button type="button" className={styles.exit} onClick={endStory} data-testid="story-exit">
        {t('story.end')}
      </button>
    </div>
  );
}

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={up ? 'M13 7 7 1 1 7' : 'M1 1l6 6 6-6'} />
    </svg>
  );
}
