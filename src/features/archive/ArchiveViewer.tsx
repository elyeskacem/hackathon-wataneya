import { useEffect, useRef } from 'react';
import { useApp } from '../../app/appStore';
import { asset, displayYear, momentById, type MomentId } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import styles from './ArchiveViewer.module.css';

/**
 * Archive overlay: the original (black and white) first, a slider to the AI colour version,
 * an "AI colorized" badge, an accuracy note and the source line (research: H3, MyHeritage, JuxtaposeJS).
 * Until real archive frames are cleared, the image is a labelled illustration.
 */
export function ArchiveViewer({ momentId }: { momentId: MomentId }) {
  const { t, pick } = useT();
  const setOpen = useApp((s) => s.setArchiveOpen);
  const moment = momentById(momentId);
  const year = displayYear(moment);
  const dialog = useRef<HTMLDivElement>(null);
  const image = moment.thumb ? asset(moment.thumb) : null;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('[role=slider]')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [setOpen]);

  return (
    <div className={styles.backdrop} onClick={() => setOpen(false)}>
      <div
        ref={dialog}
        className={`${styles.viewer} glass`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="archive-viewer"
      >
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>{t('archive.title')}</p>
            <h2 id="archive-title" className={styles.title}>
              {pick(moment.title)}
            </h2>
          </div>
          <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label={t('common.close')} data-testid="close-archive">
            <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M1 1l12 12M13 1 1 13" />
            </svg>
          </button>
        </header>

        {image ? (
          <BeforeAfterSlider src={image} originalLabel={t('archive.original')} colourLabel={t('archive.colour')} sliderLabel={t('archive.slider')} badge={t('archive.badge')} />
        ) : (
          <div className={styles.empty}>{t('moment.placeholderTitle')}</div>
        )}

        <footer className={styles.footer}>
          <p className={styles.note}>
            <PaletteIcon />
            {t('archive.accuracy')}
          </p>
          <p className={styles.source}>
            {t('archive.source')}
            {year !== null && <bdi> · {year}</bdi>}
          </p>
          <p className={styles.placeholder}>{t('archive.placeholder')}</p>
        </footer>
      </div>
    </div>
  );
}

function PaletteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1-.8-1.3-.8-2.2 0-.8.7-1.3 1.5-1.3H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7" r="1" />
      <circle cx="15" cy="7" r="1" />
    </svg>
  );
}
