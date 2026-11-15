import { expect, test, type Page } from '@playwright/test';
import { press } from './helpers';

// The browser-side callbacks below run in the page; this project's test config has no DOM types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: Record<string, any>;

type Lang = 'en' | 'zh';
const LANGS: Lang[] = ['en', 'zh'];

const T = {
  en: { lang: 'en', dir: 'ltr', enter: 'Tap to enter', menu: 'Menu', zawaya: 'journey through time', listening: "I'm listening", heard: 'who is sliman', speaker: 'Sliman', title: 'Choufli Hal', pick: 'Pick a moment', back: 'Back to the living room' },
  zh: { lang: 'zh-CN', dir: 'ltr', enter: '点击进入', menu: '菜单', zawaya: '穿越时间', listening: '我在听', heard: 'Sliman 是谁', speaker: 'Sliman', title: 'Choufli Hal', pick: '选择一个时刻', back: '回到客厅' },
};

async function seed(page: Page, lang: string, hintSeen = true) {
  await page.addInitScript(
    ([l, seen]) => localStorage.setItem('zawaya-settings', JSON.stringify({ state: { locale: l, effects: true, reducedMotion: false, seenControlsHint: seen }, version: 0 })),
    [lang, hintSeen] as const,
  );
}

async function toEntry(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('enter')).toBeVisible({ timeout: 60_000 });
}

async function toLobby(page: Page) {
  await toEntry(page);
  await press(page, 'enter');
  await expect(page.getByTestId('guide-home')).toBeVisible();
}

async function openGuide(page: Page) {
  await expect(async () => {
    if (!(await page.getByTestId('talk').isVisible())) await page.getByTestId('guide-bubble').click({ force: true, timeout: 2000 });
    await expect(page.getByTestId('talk')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
}

/** A stand-in for the browser's SpeechRecognition that keeps "talking", so the listening state holds still. */
async function fakeSpeech(page: Page, heard: string) {
  await page.addInitScript((words) => {
    class FakeRecognition {
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      lang = '';
      private timer = 0;
      start() {
        window.__lang = this.lang;
        this.timer = window.setInterval(() => this.onresult?.({ results: [[{ transcript: words }]] }), 300);
      }
      stop() {
        window.clearInterval(this.timer);
        window.setTimeout(() => this.onend?.(), 20);
      }
      abort() {
        window.clearInterval(this.timer);
      }
    }
    window.SpeechRecognition = FakeRecognition;
  }, heard);
}

const shot = (page: Page, name: string, lang: Lang) => page.screenshot({ path: `test-results/i18n/${name}-${lang}.png` });

for (const lang of LANGS) {
  const L = T[lang];

  test(`${lang}: entry, lobby, tape shelf, moment`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await seed(page, lang, false);
    await toEntry(page);
    await expect(page.locator('html')).toHaveAttribute('lang', L.lang);
    await expect(page.locator('html')).toHaveAttribute('dir', L.dir);
    await expect(page.getByTestId('enter')).toHaveText(L.enter);
    await expect(page.getByTestId(`lang-${lang}`)).toHaveAttribute('aria-checked', 'true');
    await shot(page, '1-entry', lang);

    await press(page, 'enter');
    await expect(page.getByTestId('controls-hint')).toBeVisible();
    await shot(page, '2-lobby-hint', lang);
    for (let i = 0; i < 3; i++) await press(page, 'hint-next');
    await expect(page.getByTestId('guide-home')).toBeVisible();
    await shot(page, '3-lobby', lang);

    await press(page, 'pick-moment');
    await expect(page.getByTestId('lower-third')).toContainText(L.title);
    await shot(page, '4-custom', lang);
    // The controls fade after 3 s without input (the screenshot takes longer): wake them first.
    await page.mouse.move(300, 300);
    await page.mouse.move(320, 320);
    await press(page, 'open-tapes');
    await expect(page.getByTestId('tape-drawer')).toBeVisible();
    await shot(page, '4b-tapes', lang);

    await page.keyboard.press('Escape');
    await page.mouse.move(340, 340);
    await press(page, 'enter-moment');
    await expect(page.getByTestId('title-card')).toContainText(L.title);
    await shot(page, '5-moment', lang);
    expect(errors).toEqual([]);
  });

  test(`${lang}: guide idle, listening, answer`, async ({ page }) => {
    await fakeSpeech(page, L.heard);
    await seed(page, lang);
    await toLobby(page);
    await openGuide(page);
    await expect(page.getByTestId('talk-chips').getByRole('button')).toHaveCount(3);
    await shot(page, '6-guide-idle', lang);

    await page.getByTestId('mic').click();
    await expect(page.getByTestId('talk-listening')).toContainText(L.listening);
    await expect(page.getByTestId('talk-transcript')).toContainText(L.heard);
    // The recognition language follows the interface.
    expect(await page.evaluate(() => window.__lang)).toBe(lang === 'zh' ? 'zh-CN' : 'en-US');
    await shot(page, '7-guide-listening', lang);

    await page.getByTestId('mic').click();
    await expect(page.getByTestId('talk-answer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('talk-answer')).toContainText(L.speaker);
    await shot(page, '8-guide-answer', lang);
  });

  test(`${lang}: chips answer in the language, and the demo asks in it`, async ({ page }) => {
    await seed(page, lang);
    await page.goto('/?demo=1');
    await expect(page.getByTestId('enter')).toBeVisible({ timeout: 60_000 });
    await press(page, 'enter');
    await openGuide(page);
    await page.getByTestId('chip-what-is-zawaya').click();
    await expect(page.getByTestId('talk-answer')).toContainText(L.zawaya, { timeout: 20_000 });
    // Wait for the answer to finish, then the scripted mic asks the next sample question in this language.
    await expect(page.getByTestId('mic')).toBeEnabled({ timeout: 30_000 });
    await page.getByTestId('mic').click();
    const transcript = page.getByTestId('talk-transcript');
    // The words appear a few at a time; wait until enough of them are there to tell the language.
    if (lang === 'zh') await expect(transcript).toHaveText(/\p{Script=Han}/u, { timeout: 5000 });
    else {
      await expect(transcript).not.toBeEmpty({ timeout: 5000 });
      expect(await transcript.textContent()).toMatch(/^[\x20-\x7e]+$/);
    }
    await expect(page.getByTestId('talk-answer')).toBeVisible({ timeout: 10_000 });
  });
}

test('the language switch on the entry screen changes language and is remembered', async ({ page }) => {
  await toEntry(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  for (const [code, lang, dir] of [
    ['fr', 'fr', 'ltr'],
    ['en', 'en', 'ltr'],
    ['zh', 'zh-CN', 'ltr'],
    ['ar', 'ar', 'rtl'],
    ['zh', 'zh-CN', 'ltr'],
  ] as const) {
    await page.getByTestId(`lang-${code}`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('html')).toHaveAttribute('dir', dir);
  }
  await expect(page.getByTestId('enter')).toHaveText('点击进入');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByTestId('enter')).toHaveText('点击进入', { timeout: 60_000 });
});

test('the menu has the language switch too', async ({ page }) => {
  await seed(page, 'en');
  await toLobby(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByTestId('lang-zh').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('radiogroup')).toHaveAttribute('aria-label', '语言');
  await page.getByTestId('lang-fr').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});
