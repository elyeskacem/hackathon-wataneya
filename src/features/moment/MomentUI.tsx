import { useEffect, useState } from 'react';
import { useApp } from '../../app/appStore';
import { changeScene } from '../../app/transitions';
import { channelLabel, displayYear, momentById, type MomentId } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { entryById } from '../guide/knowledge';
import { useGuide } from '../guide/guideStore';
import { useMoment } from './momentStore';
import { roomOf, SCENES } from './scenes';
import styles from './MomentUI.module.css';

/** The title card stays 4 s, then leaves a small tag (motion spec). */
const TITLE_MS = 4000;

/** Overlay inside a moment: title card, character card, subtitle band, archive button, Esc. */
export function MomentUI({ momentId, roomId }: { momentId: MomentId; roomId?: string }) {
  const { t, pick, locale } = useT();
  const moment = momentById(momentId);
  const scene = SCENES[momentId];
  const room = scene ? roomOf(scene, roomId) : null;
  const year = displayYear(moment);
  const characterId = useMoment((s) => s.characterId);
  const setCharacter = useMoment((s) => s.setCharacter);
  const setGuideOpen = useApp((s) => s.setGuideOpen);
  const setArchiveOpen = useApp((s) => s.setArchiveOpen);
  const ask = useGuide((s) => s.ask);
  const [titleBig, setTitleBig] = useState(true);
  const character = room?.characters.find((c) => c.id === characterId);

  useEffect(() => {
    setTitleBig(true);
    const timer = window.setTimeout(() => setTitleBig(false), TITLE_MS);
    return () => window.clearTimeout(timer);
  }, [momentId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const app = useApp.getState();
      if (e.key !== 'Escape' || app.guideOpen || app.archiveOpen) return;
      const moment = useMoment.getState();
      if (moment.characterId) setCharacter(null);
      else if (moment.closeUp) moment.toggleCloseUp();
      else void changeScene({ name: 'lobby' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCharacter]);

  const askAboutCharacter = () => {
    if (!character) return;
    const entry = entryById(character.entryId);
    setGuideOpen(true);
    if (entry) void ask({ text: pick(entry.q), entryId: entry.id }, scene ? (momentId as 'choufli-hal' | 'om-kalthoum') : 'home', locale);
  };

  return (
    <>
      <div className={`${styles.title} glass ${titleBig ? styles.big : ''}`} data-testid="title-card">
        <span className={styles.ch} dir="ltr">
          CH {channelLabel(moment.channel)}
        </span>
        <h1 className={styles.name}>
          {pick(moment.title)}
          {year !== null && <bdi className={styles.year}> {year}</bdi>}
        </h1>
        {titleBig && <p className={styles.source}>{t('moment.source')}</p>}
      </div>

      <button type="button" className={`${styles.archiveBtn} glass chrome`} onClick={() => setArchiveOpen(true)} data-testid="open-archive">
        {t('moment.archive')}
      </button>

      {!scene && (
        <section className={`${styles.placeholder} glass`}>
          <h2>{t('moment.placeholderTitle')}</h2>
          <p>{t('moment.placeholderBody')}</p>
        </section>
      )}

      {character && (
        <section className={`${styles.card} glass`} aria-labelledby="character-name" data-testid="character-card">
          <button type="button" className={styles.close} onClick={() => setCharacter(null)} aria-label={t('common.close')}>
            <svg width="12" height="12" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M1 1l12 12M13 1 1 13" />
            </svg>
          </button>
          <h2 id="character-name" className={styles.cardName}>
            {pick(character.name)}
          </h2>
          <p className={styles.cardRole}>{t('moment.character', { show: pick(moment.title) })}</p>
          <p className={styles.fact}>
            <span className={styles.toVerify}>{t('common.toVerify')}</span>
          </p>
          <button type="button" className={styles.ask} onClick={askAboutCharacter}>
            {t('moment.askAbout', { name: pick(character.name) })}
          </button>
        </section>
      )}

      {(character || scene?.archiveLine) && (
        <p className={styles.subtitles} aria-live="polite">
          <span className={styles.speaker}>{character ? t('moment.subtitle.guide') : t('moment.subtitle.archive')}</span>
          {character ? t('moment.characterLine', { name: pick(character.name), show: pick(moment.title) }) : pick(scene!.archiveLine!)}
        </p>
      )}
    </>
  );
}
