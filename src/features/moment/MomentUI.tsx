import { useEffect, useState } from 'react';
import { useApp } from '../../app/appStore';
import { leaveMoment } from '../../app/transitions';
import { channelLabel, displayYear, momentById, type MomentId } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { ScenePrompt } from '../../ui/ScenePrompt';
import { useMoment } from './momentStore';
import { experienceFor, hasExperience } from './experience';
import { characterInfo, SCENES } from './scenes';
import { useAskEntry } from './useAskEntry';
import styles from './MomentUI.module.css';

/** The title card stays 4 s, then leaves a small tag (motion spec). */
const TITLE_MS = 4000;

/** Overlay inside a moment: title card, character card, subtitle band, Esc. */
export function MomentUI({ momentId }: { momentId: MomentId }) {
  const { t, pick } = useT();
  const moment = momentById(momentId);
  const scene = SCENES[momentId];
  const year = displayYear(moment);
  const characterId = useMoment((s) => s.characterId);
  const setCharacter = useMoment((s) => s.setCharacter);
  const askEntry = useAskEntry(momentId);
  const [titleBig, setTitleBig] = useState(true);
  // Characters come from the 2.5D scene, a GLB or a Unity build; the card needs only a name and a guide entry.
  const character = characterId ? characterInfo(characterId) : undefined;

  useEffect(() => {
    setTitleBig(true);
    const timer = window.setTimeout(() => setTitleBig(false), TITLE_MS);
    return () => window.clearTimeout(timer);
  }, [momentId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const app = useApp.getState();
      if (e.key !== 'Escape' || app.guideOpen || app.menuOpen) return;
      const moment = useMoment.getState();
      if (moment.characterId) setCharacter(null);
      else if (moment.closeUp) moment.toggleCloseUp();
      else void leaveMoment();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCharacter]);

  const askAboutCharacter = () => askEntry(character?.entryId);

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

      {!titleBig && !character && <ScenePrompt line={t('prompt.moment')} action={t('prompt.moment.action')} onAction={() => void leaveMoment()} testId="moment-prompt" />}

      {!hasExperience(moment) && (
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

      {(character || (scene?.ambientLine && experienceFor(momentId).kind === 'render')) && (
        <p className={styles.subtitles} aria-live="polite">
          <span className={styles.speaker}>{character ? t('moment.subtitle.guide') : t('moment.subtitle.sound')}</span>
          {character ? t('moment.characterLine', { name: pick(character.name), show: pick(moment.title) }) : pick(scene!.ambientLine!)}
        </p>
      )}
    </>
  );
}
