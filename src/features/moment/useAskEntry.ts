import { useCallback } from 'react';
import { useApp } from '../../app/appStore';
import type { MomentId } from '../../data/moments';
import { useT } from '../../i18n/useT';
import { entryById } from '../guide/knowledge';
import { useTalk } from '../guide/talkStore';
import type { GuideContext } from '../guide/types';

/** Opens the guide and asks one knowledge entry (character cards, hotspots in real 3D scenes). */
export function useAskEntry(momentId: MomentId) {
  const { pick, locale } = useT();
  const setGuideOpen = useApp((s) => s.setGuideOpen);
  const submit = useTalk((s) => s.submit);
  return useCallback(
    (entryId: string | undefined) => {
      setGuideOpen(true);
      const entry = entryId ? entryById(entryId) : undefined;
      if (!entry) return;
      const context: GuideContext = momentId;
      void submit(pick(entry.q), { entryId: entry.id }, context, locale);
    },
    [submit, locale, momentId, pick, setGuideOpen],
  );
}
