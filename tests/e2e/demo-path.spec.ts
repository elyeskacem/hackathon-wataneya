import { expect, test, type Page } from '@playwright/test';

// Hotspots drift with the camera on purpose, so clicks are forced instead of waiting for "stable",
// once the element is on screen (camera glides can briefly carry it out of view).
async function press(page: Page, testId: string) {
  const target = page.getByTestId(testId);
  await expect(page.getByTestId('curtain')).toHaveAttribute('data-on', 'false');
  await expect(target).toBeInViewport();
  await target.click({ force: true });
}

async function enter(page: Page) {
  await page.goto('/');
  // The loader shows real progress, then the enter button once the lobby is ready.
  await expect(page.getByTestId('enter')).toBeVisible({ timeout: 60_000 });
  await press(page, 'enter');
  await expect(page.getByTestId('controls-hint')).toBeVisible();
}

test('demo path: entry → lobby → custom → moment → archive → back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await enter(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  // Lobby: three hint cards, then the guide greeting discloses it is an AI.
  for (let i = 1; i <= 3; i++) {
    await expect(page.getByTestId('controls-hint')).toContainText(`${i} / 3`);
    await press(page, 'hint-next');
  }
  await expect(page.getByTestId('guide-home')).toContainText('بالذكاء الاصطناعي');

  // Custom mode: channel 2 is the Om Kalthoum concert.
  await press(page, 'pick-moment');
  await expect(page.getByTestId('lower-third')).toContainText('شوفلي حل');
  await page.keyboard.press('2');
  await expect(page.getByTestId('lower-third')).toContainText('حفلة أم كلثوم');
  await page.keyboard.press('1');
  await expect(page.getByTestId('lower-third')).toContainText('شوفلي حل');

  // Insert the tape: Choufli Hal, office, with Sliman.
  await expect(page.getByTestId('enter-moment')).toBeEnabled();
  await press(page, 'enter-moment');
  await expect(page.getByTestId('title-card')).toContainText('شوفلي حل');
  await press(page, 'character-sliman');
  await expect(page.getByTestId('character-card')).toContainText('سليمان');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('character-card')).toBeHidden();

  // Doors between rooms.
  await press(page, 'door-corridor');
  await expect(page.getByTestId('door-kitchen')).toBeAttached();
  await press(page, 'door-kitchen');
  await expect(page.getByTestId('character-sbou3i')).toBeAttached();

  // Archive viewer: original first, keyboard slider, AI label and source.
  await press(page, 'open-archive');
  const viewer = page.getByTestId('archive-viewer');
  await expect(viewer).toContainText('ملوّن بالذكاء الاصطناعي');
  await expect(viewer).toContainText('المصدر: أرشيف الوطنية');
  const slider = page.getByTestId('archive-slider');
  await expect(slider).toHaveAttribute('aria-valuenow', '80');
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveAttribute('aria-valuenow', '75');
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();

  // Esc back to the lobby.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-journey')).toBeVisible();

  expect(errors).toEqual([]);
});

test('guide answers only from the knowledge file and admits what it does not know', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'تخطّى' }).click();
  await press(page, 'guide-bubble');
  const panel = page.getByTestId('guide-panel');
  await expect(panel).toContainText('أنا دليل زوايا بالذكاء الاصطناعي');

  await page.getByTestId('guide-input').fill('ورّيني حفلة أم كلثوم');
  await page.keyboard.press('Enter');
  await expect(panel).toContainText('القناة 02');
  await expect(page.getByTestId('lower-third')).toContainText('حفلة أم كلثوم');

  // Unverified facts are never shown: the guide says it does not know.
  await page.getByTestId('guide-input').fill('وقتاش صارت الحفلة؟');
  await page.keyboard.press('Enter');
  await expect(panel).toContainText('ما لقيتش هذا في الأرشيف');
  await expect(panel).not.toContainText('TO VERIFY');
});

test('Om Kalthoum stage has no figure by default and opens the archive', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'تخطّى' }).click();
  await press(page, 'pick-moment');
  await page.keyboard.press('2');
  await expect(page.getByTestId('enter-moment')).toBeEnabled();
  await press(page, 'enter-moment');
  await expect(page.getByTestId('title-card')).toContainText('حفلة أم كلثوم');
  await expect(page.getByTestId('character-om-kalthoum')).toHaveCount(0);
  await press(page, 'archive-spot');
  await expect(page.getByTestId('archive-viewer')).toBeVisible();
});
