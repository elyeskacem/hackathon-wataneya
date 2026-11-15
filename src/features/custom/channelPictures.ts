import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import { useSceneTextures } from '../../stage/textures';
import { asset, channelLabel, moments, type Moment } from '../../data/moments';
import { isRtl, type Locale } from '../../app/settingsStore';
import { pickLocalized } from '../../i18n/useT';

const withThumb = moments.filter((m): m is Moment & { thumb: string } => m.thumb !== null);
export const THUMB_URLS = withThumb.map((m) => asset(m.thumb));

/** One texture per channel: the moment's render, or a test card while it has none. */
export function useChannelPictures(locale: Locale): Texture[] {
  const thumbs = useSceneTextures(THUMB_URLS);

  const cards = useMemo(() => {
    const result = new Map<number, CanvasTexture>();
    for (const m of moments) if (!m.thumb) result.set(m.channel, testCard(m, locale));
    return result;
  }, [locale]);

  useEffect(() => {
    // Redraw once the brand fonts are ready so the card text is not in a fallback face.
    let alive = true;
    // Chinese text needs its own font slices: ask for exactly these characters before drawing.
    const sample = moments.map((m) => pickLocalized(m.title, locale) + pickLocalized(m.kind, locale)).join('');
    const wanted = locale === 'zh' ? Promise.all([document.fonts.load('700 44px "Noto Sans SC"', sample), document.fonts.load('400 22px "Noto Sans SC"', sample)]) : Promise.resolve();
    void Promise.all([document.fonts.ready, wanted.catch(() => undefined)]).then(() => {
      if (!alive) return;
      for (const m of moments) {
        const card = cards.get(m.channel);
        if (card) {
          drawTestCard(card.image as HTMLCanvasElement, m, locale);
          card.needsUpdate = true;
        }
      }
    });
    return () => {
      alive = false;
      cards.forEach((c) => c.dispose());
    };
  }, [cards, locale]);

  return moments.map((m) => {
    const i = withThumb.findIndex((t) => t.id === m.id);
    return i >= 0 ? thumbs[i]! : cards.get(m.channel)!;
  });
}

function testCard(moment: Moment, locale: Locale) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  drawTestCard(canvas, moment, locale);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

// Values mirror the design tokens (canvas cannot read CSS variables).
const BARS = ['#c9beb1', '#c9a227', '#5a3a24', '#6b6e75', '#e30613', '#2c2d30', '#f5efe3'];

function drawTestCard(canvas: HTMLCanvasElement, moment: Moment, locale: Locale) {
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1b1c1e';
  ctx.fillRect(0, 0, 512, 384);
  const barW = 512 / BARS.length;
  BARS.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * barW, 0, barW + 1, 150);
  });
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '600 28px "IBM Plex Mono", monospace';
  ctx.fillText(`CH ${channelLabel(moment.channel)}`, 256, 210);
  const cjk = locale === 'zh' ? '"Noto Sans SC", ' : '';
  ctx.font = `700 44px ${cjk}Changa, Cairo, sans-serif`;
  ctx.direction = isRtl(locale) ? 'rtl' : 'ltr';
  ctx.fillText(pickLocalized(moment.title, locale), 256, 280);
  ctx.font = `400 22px ${cjk}Cairo, sans-serif`;
  ctx.fillStyle = '#ffffff99';
  ctx.fillText(pickLocalized(moment.kind, locale), 256, 330);
}
