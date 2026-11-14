import { useCallback } from 'react';
import { useApp } from '../../app/appStore';
import { momentById, type MomentId } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { entryById } from '../guide/knowledge';
import { useGuide } from '../guide/guideStore';
import type { GuideContext } from '../guide/types';

/** Opens the guide and asks one knowledge entry (character cards, hotspots in real 3D scenes). */
export function useAskEntry(momentId: MomentId) {
  const { pick, locale } = useT();
  const setGuideOpen = useApp((s) => s.setGuideOpen);
  const ask = useGuide((s) => s.ask);
  return useCallback(
    (entryId: string | undefined) => {
      setGuideOpen(true);
      const entry = entryId ? entryById(entryId) : undefined;
      if (!entry) return;
      // The guide only knows two moments so far; the rest ask in the general context.
      const context: GuideContext = momentById(momentId).scene ?? 'home';
      void ask({ text: pick(entry.q), entryId: entry.id }, context, locale);
    },
    [ask, locale, momentId, pick, setGuideOpen],
  );
}
