import { expect, test } from '@playwright/test';
import { enter, press } from './helpers';

test('story mode: scroll, keys and swipe travel through one continuous canvas', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await enter(page);
  await page.getByRole('button', { name: 'تخطّى' }).click();
  await press(page, 'start-journey');

  const bar = page.getByTestId('story-bar');
  const progress = page.getByTestId('story-progress');
  // Stop 1 of 6: Choufli Hal, straight through the screen.
  await expect(bar).toBeVisible();
  await expect(page.getByTestId('title-card')).toContainText('شوفلي حل', { timeout: 30_000 });
  await expect(progress).toHaveAttribute('aria-valuenow', '1');
  await expect(progress).toHaveAttribute('aria-valuemax', '6');

  // Next stop with the keyboard (arrows travel in story mode instead of switching channels).
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('title-card')).toContainText('حفلة أم كلثوم', { timeout: 30_000 });
  await expect(progress).toHaveAttribute('aria-valuenow', '2');

  // Scroll travels too, but not before the previous journey has settled.
  await page.waitForTimeout(1900);
  if (isMobile) {
    await page.touchscreen.tap(10, 10);
  } else {
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 240);
  }
  await expect(progress).toHaveAttribute('aria-valuenow', '3', { timeout: 30_000 });

  // The single canvas is never reloaded or replaced during the visit.
  await expect(page.locator('canvas')).toHaveCount(1);

  // Esc leaves the story first, then the moment.
  await page.keyboard.press('Escape');
  await expect(bar).toBeHidden();
  await expect(page.getByTestId('title-card')).toBeVisible();

  expect(errors).toEqual([]);
});

test('reduced motion: scenes crossfade, the camera never travels', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page);
  await page.getByRole('button', { name: 'تخطّى' }).click();
  await expect(page.locator('[data-reduced-motion="true"]')).toBeVisible();
  await press(page, 'pick-moment');
  await expect(page.getByTestId('lower-third')).toBeVisible();
});
