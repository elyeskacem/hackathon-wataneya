import { useEffect, useRef } from 'react';
import { useApp } from '../../app/appStore';
import { channelLabel, displayYear, moments } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { switchChannel } from './channelSwitch';
import styles from './TapeDrawer.module.css';

/** «رفّ الكاسيط»: every moment as a VHS tape; picking one puts it in the TV. */
export function TapeDrawer({ onClose }: { onClose: () => void }) {
  const { t, pick } = useT();
  const channel = useApp((s) => s.channel);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus();
  }, []);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={panel}
        className={`${styles.drawer} glass`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="tape-drawer"
      >
        <header className={styles.header}>
          <div>
            <h2 id="drawer-title" className={styles.title}>
              {t('custom.drawerTitle')}
            </h2>
            <p className={styles.sub}>{t('custom.drawerSub', { n: moments.length })}</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label={t('common.close')}>
            <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M1 1l12 12M13 1 1 13" />
            </svg>
          </button>
        </header>
        <ul className={styles.grid}>
          {moments.map((m) => {
            const year = displayYear(m);
            const current = m.channel === channel;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className={`${styles.tape} ${current ? styles.current : ''}`}
                  aria-current={current}
                  onClick={() => {
                    if (!current) switchChannel(m.channel);
                    onClose();
                  }}
                  data-testid={`tape-${m.channel}`}
                >
                  <span className={styles.label}>
                    <span className={styles.num} dir="ltr">
                      {channelLabel(m.channel)}
                    </span>
                    <span className={styles.names}>
                      <strong>{pick(m.title)}</strong>
                      <span>
                        {year !== null && <bdi>{year} · </bdi>}
                        {pick(m.kind)}
                      </span>
                    </span>
                  </span>
                  <span className={styles.reels} aria-hidden="true">
                    <span />
                    <span className={styles.window} />
                    <span />
                  </span>
                  <span className={styles.foot}>
                    {current ? <span className={styles.onTv}>{t('custom.onTv')}</span> : <span />}
                    <span className={styles.vhs}>VHS</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
