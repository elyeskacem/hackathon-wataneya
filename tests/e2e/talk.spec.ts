import { expect, test, type Page } from '@playwright/test';
import { press } from './helpers';

// The browser-side callbacks below run in the page; this project's test config has no DOM types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: Record<string, any>;

type Lang = 'ar' | 'fr';
const LANGS: Lang[] = ['ar', 'fr'];

const TEXT = {
  ar: { listening: 'نسمع فيك', unheardTitle: 'ما سمعتكش مليح', unheardBody: 'اختار سؤال من تحت.', zawaya: 'رحلة في الزمن', speaker: 'سليمان', whoIsSliman: 'شكون سليمان' },
  fr: { listening: 'Je vous écoute', unheardTitle: 'Je n\'ai pas bien entendu', unheardBody: 'Touchez une question ci-dessous.', zawaya: 'voyage dans le temps', speaker: 'Sliman', whoIsSliman: 'qui est sliman' },
};

/** A stand-in for the browser's SpeechRecognition: says whatever the test put in window.__heard. */
async function fakeSpeech(page: Page, heard: string, keepTalking = false) {
  await page.addInitScript(([words, keep]) => {
    const w = window as unknown as Record<string, unknown>;
    w.__heard = words;
    class FakeRecognition {
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      private timer = 0;
      start() {
        const say = () => this.onresult?.({ results: [[{ transcript: w.__heard }]] });
        // keepTalking: new words every 300 ms, so the 1.5 s silence timer never fires (a steady listening state to photograph).
        this.timer = keep ? window.setInterval(say, 300) : window.setTimeout(say, 500);
      }
      stop() {
        window.clearTimeout(this.timer);
        window.clearInterval(this.timer);
        window.setTimeout(() => this.onend?.(), 20);
      }
      abort() {
        window.clearTimeout(this.timer);
        window.clearInterval(this.timer);
      }
    }
    w.SpeechRecognition = FakeRecognition;
  }, [heard, keepTalking] as const);
}

async function openGuide(page: Page, lang: Lang, url = '/') {
  await page.addInitScript(
    ([l]) => localStorage.setItem('zawaya-settings', JSON.stringify({ state: { locale: l, effects: true, reducedMotion: false, seenControlsHint: true }, version: 0 })),
    [lang],
  );
  await page.goto(url);
  await expect(page.getByTestId('enter')).toBeVisible({ timeout: 60_000 });
  await press(page, 'enter');
  // The bubble can be tapped while the entry sequence is still settling; tap again until the panel is open.
  await expect(async () => {
    if (!(await page.getByTestId('talk').isVisible())) await page.getByTestId('guide-bubble').click({ force: true, timeout: 2000 });
    await expect(page.getByTestId('talk')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
}

const shot = (page: Page, state: string, lang: Lang) => page.getByTestId('guide-panel').screenshot({ path: `test-results/talk/${state}-${lang}.png` });

for (const lang of LANGS) {
  const L = TEXT[lang];

  test(`chips: idle → tap a chip → answer, then follow-ups (${lang})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openGuide(page, lang);

    // Idle: three chips, the mic ready.
    await expect(page.getByTestId('talk-chips').getByRole('button')).toHaveCount(3);
    await expect(page.getByTestId('mic')).toBeEnabled();
    await expect(page.getByTestId('mic')).toHaveAttribute('aria-pressed', 'false');
    await shot(page, '1-idle', lang);

    await page.getByTestId('chip-what-is-zawaya').click();
    // Answering: the bubble with its speaker; chips hidden, mic dimmed.
    await expect(page.getByTestId('talk-answer')).toBeVisible();
    await expect(page.getByTestId('talk-chips')).toHaveCount(0);
    await expect(page.getByTestId('mic')).toBeDisabled();
    await expect(page.getByTestId('talk-answer')).toContainText(L.zawaya, { timeout: 20_000 });
    await shot(page, '4-answering', lang);

    // After the answer: two follow-ups, mic back.
    await expect(page.getByTestId('talk-chips').getByRole('button')).toHaveCount(2, { timeout: 30_000 });
    await expect(page.getByTestId('mic')).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test(`mic in demo mode: listening → answer (${lang})`, async ({ page }) => {
    await openGuide(page, lang, '/?demo=1');
    const mic = page.getByTestId('mic');
    await mic.click();
    await expect(mic).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('talk-listening')).toContainText(L.listening);
    await expect(page.getByTestId('talk-transcript')).not.toBeEmpty({ timeout: 5000 });
    await expect(page.getByTestId('talk-live')).toContainText(L.listening);
    // The scripted question is answered: the bubble appears and the pill is gone.
    await expect(page.getByTestId('talk-answer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('talk-listening')).toHaveCount(0);
  });

  test(`listening state (${lang})`, async ({ page }) => {
    await fakeSpeech(page, L.whoIsSliman, true);
    await openGuide(page, lang);
    await page.getByTestId('mic').click();
    await expect(page.getByTestId('talk-listening')).toContainText(L.listening);
    await expect(page.getByTestId('talk-transcript')).toContainText(L.whoIsSliman);
    await expect(page.getByTestId('mic')).toHaveAttribute('aria-pressed', 'true');
    await shot(page, '2-listening', lang);
    // Tapping again ends the capture and the words are answered.
    await page.getByTestId('mic').click();
    await expect(page.getByTestId('talk-answer')).toBeVisible({ timeout: 10_000 });
  });

  test(`a nonsense transcript shows "didn't hear", chips stay (${lang})`, async ({ page }) => {
    await fakeSpeech(page, 'xyzzy plugh qwertz');
    await openGuide(page, lang);
    await page.getByTestId('mic').click();
    await expect(page.getByTestId('talk-listening')).toBeVisible();
    // Silence for 1.5 s ends the capture by itself.
    await expect(page.getByTestId('talk-unheard')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('talk-unheard')).toContainText(L.unheardTitle);
    await expect(page.getByTestId('talk-unheard')).toContainText(L.unheardBody);
    await expect(page.getByTestId('mic')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('talk-chips').getByRole('button')).toHaveCount(3);
    await shot(page, '3-unheard', lang);
    // Still tappable.
    await page.getByTestId('chip-what-is-zawaya').click();
    await expect(page.getByTestId('talk-answer')).toBeVisible();
  });

  test(`a spoken question is matched locally and answered by its speaker (${lang})`, async ({ page }) => {
    await fakeSpeech(page, L.whoIsSliman);
    await openGuide(page, lang);
    await page.getByTestId('mic').click();
    await expect(page.getByTestId('talk-answer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('talk-answer')).toContainText(L.speaker);
  });
}

test('tapping the mic again stops listening', async ({ page }) => {
  await fakeSpeech(page, 'xyzzy');
  await openGuide(page, 'ar');
  await page.getByTestId('mic').click();
  await expect(page.getByTestId('talk-listening')).toBeVisible();
  await page.getByTestId('mic').click();
  await expect(page.getByTestId('talk-unheard')).toBeVisible({ timeout: 5000 });
});

test('without speech recognition the mic is disabled with a line, chips and typing still work', async ({ page }) => {
  await openGuide(page, 'ar');
  // Headless Chromium has a recognition class; remove it for this page before the app checks.
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
  });
  await page.getByRole('button', { name: 'سكّر الدليل' }).click();
  await page.getByTestId('guide-bubble').click();
  await expect(page.getByTestId('mic')).toBeDisabled();
  await expect(page.getByTestId('talk-note')).toContainText('الميكرو موش مدعوم');
  await page.getByTestId('guide-input').fill('شنوة زوايا');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('talk-answer')).toContainText('رحلة في الزمن', { timeout: 20_000 });
});

test('a denied microphone is explained and never blocks', async ({ page }) => {
  await page.addInitScript(() => {
    class Denied {
      onerror: ((e: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        window.setTimeout(() => {
          this.onerror?.({ error: 'not-allowed' });
          this.onend?.();
        }, 50);
      }
      stop() {}
      abort() {}
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = Denied;
  });
  await openGuide(page, 'fr');
  await page.getByTestId('mic').click();
  await expect(page.getByTestId('talk-note')).toContainText('Le micro est bloqué');
  await expect(page.getByTestId('talk-chips').getByRole('button')).toHaveCount(3);
});

test('the chip row never clips: every chip is reachable by scrolling', async ({ page }) => {
  await openGuide(page, 'fr');
  const row = page.getByTestId('talk-chips');
  const { clientWidth, scrollWidth, overflowX } = await row.evaluate((el) => ({ clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, overflowX: (globalThis as unknown as { getComputedStyle: (e: unknown) => { overflowX: string } }).getComputedStyle(el).overflowX }));
  expect(overflowX).toBe('auto');
  if (scrollWidth > clientWidth) {
    // The last chip can be scrolled fully into view.
    await page.getByTestId('talk-chips').getByRole('button').last().scrollIntoViewIfNeeded();
    const box = await page.getByTestId('talk-chips').getByRole('button').last().boundingBox();
    const rowBox = await row.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(rowBox!.x + rowBox!.width + 1);
  }
});
