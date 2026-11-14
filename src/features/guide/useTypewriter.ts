import { useEffect, useState } from 'react';

export const WORD_MS = 90;

/** Reveals text word by word (speaking state); instant when motion is reduced. */
export function useTypewriter(text: string, enabled: boolean) {
  const words = text.split(' ');
  const [count, setCount] = useState(enabled ? 0 : words.length);

  useEffect(() => {
    if (!enabled) {
      setCount(words.length);
      return;
    }
    setCount(0);
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= words.length) window.clearInterval(timer);
    }, WORD_MS);
    return () => window.clearInterval(timer);
    // Restart only when the text itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled]);

  return words.slice(0, count).join(' ');
}
