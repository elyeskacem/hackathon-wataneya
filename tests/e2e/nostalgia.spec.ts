import { expect, test } from '@playwright/test';
import { enter, press } from './helpers';

type Page = import('@playwright/test').Page;

async function insertTape(page: Page) {
  await enter(page);
  await page.getByRole('button', { name: 'تخطّى' }).click();
  await press(page, 'pick-moment');
  await press(page, 'enter-moment');
}

async function toMoment(page: Page) {
  await insertTape(page);
  await expect(page.getByTestId('title-card')).toBeVisible({ timeout: 30_000 });
}

test('entering a moment plays the tape: tracking lines and the green PLAY display', async ({ page }) => {
  await insertTape(page);
  // The display only lasts two seconds and starts when the scene arrives, so wait for it right away.
  const osd = page.getByTestId('vhs-play');
  await expect(osd).toBeVisible({ timeout: 30_000 });
  // The year is not verified, so the display shows no year.
  await expect(osd).toHaveText('▶ PLAY');
  await expect(osd).toBeHidden({ timeout: 6000 });
});

test('leaving rewinds the tape, powers the CRT off and returns to the lobby', async ({ page }) => {
  await toMoment(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('vhs-rewind')).toBeVisible();
  await expect(page.getByTestId('vhs-poweroff')).toBeAttached();
  await expect(page.getByTestId('start-journey')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('vhs-rewind')).toHaveCount(0);
});

test('effects off: no VHS display, no grain, no grade', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'تخطّى' }).click();
  await page.getByRole('button', { name: 'القائمة' }).click();
  await page.getByRole('switch', { name: 'المؤثرات' }).click();
  await page.keyboard.press('Escape');
  await press(page, 'pick-moment');
  await press(page, 'enter-moment');
  await expect(page.getByTestId('title-card')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('vhs-play')).toHaveCount(0);
  await expect(page.locator('[data-look]')).toHaveCount(0);
  await expect(page.locator('[data-effects="false"]')).toHaveCount(1);
});
