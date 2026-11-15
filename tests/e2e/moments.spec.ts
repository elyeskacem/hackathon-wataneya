import { expect, test, type Page } from '@playwright/test';
import { enter, press } from './helpers';

/** The six moments, in channel order (data/moments.json), as shown in Arabic. */
const TITLES = ['شوفلي حل', 'حفلة أم كلثوم', 'ستوديو الأخبار', 'الخطّاب على الباب', 'الأحد الرياضي', 'تونس 3–1 المكسيك'];

async function toTv(page: Page) {
  await enter(page);
  await page.getByRole('button', { name: 'تخطّى' }).click();
  await press(page, 'pick-moment');
  await expect(page.getByTestId('lower-third')).toContainText(TITLES[0]!);
}

/** The controls fade after 3 s without input; wake them before pressing one. */
const wake = async (page: Page) => {
  await page.mouse.move(300, 300);
  await page.mouse.move(330, 330);
};

test('six channels: keys, lower-thirds, years, no seventh channel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await toTv(page);

  const lower = page.getByTestId('lower-third');
  for (let n = 1; n <= 6; n++) {
    await page.keyboard.press(String(n));
    await expect(lower).toContainText(TITLES[n - 1]!);
    await expect(lower).toContainText(`0${n}`);
  }
  // Only Tunisia–Mexico shows a year; Al Ahad Al Riyadhi has none (not verified).
  await expect(lower).toContainText('1978');
  await page.keyboard.press('5');
  await expect(lower).not.toContainText(/19\d\d|20\d\d/);

  // The remote has keys 1–6 only, and 7–9 do nothing.
  await expect(page.getByTestId('key-6')).toBeVisible();
  for (const n of [7, 8, 9]) await expect(page.getByTestId(`key-${n}`)).toHaveCount(0);
  await page.keyboard.press('6');
  await page.keyboard.press('9');
  await expect(lower).toContainText(TITLES[5]!);

  // Channel up wraps from 06 to 01.
  await wake(page);
  await press(page, 'ch-up');
  await expect(lower).toContainText(TITLES[0]!);
  expect(errors).toEqual([]);
});

test('tape shelf: six tapes, picking one puts it in the TV', async ({ page }) => {
  await toTv(page);
  await wake(page);
  await press(page, 'open-tapes');
  const drawer = page.getByTestId('tape-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('6');
  for (let n = 1; n <= 6; n++) await expect(page.getByTestId(`tape-${n}`)).toBeVisible();
  await expect(page.getByTestId('tape-7')).toHaveCount(0);
  await expect(page.getByTestId('tape-5')).toContainText('الأحد الرياضي');
  await expect(page.getByTestId('tape-6')).toContainText('1978');
  await expect(page.getByTestId('tape-5')).not.toContainText(/19\d\d|20\d\d/);
  await page.getByTestId('tape-6').click();
  await expect(page.getByTestId('lower-third')).toContainText(TITLES[5]!);
});

for (const n of [5, 6] as const) {
  test(`moment 0${n} (${TITLES[n - 1]}) opens with a labelled placeholder and its own guide questions`, async ({ page }) => {
    await toTv(page);
    await page.keyboard.press(String(n));
    await expect(page.getByTestId('lower-third')).toContainText(TITLES[n - 1]!);
    await expect(page.getByTestId('enter-moment')).toBeEnabled();
    await wake(page);
    await press(page, 'enter-moment');
    await expect(page.getByTestId('title-card')).toContainText(TITLES[n - 1]!, { timeout: 30_000 });
    if (n === 6) await expect(page.getByTestId('title-card')).toContainText('1978');
    await expect(page.getByText('المشهد ثلاثي الأبعاد مازال يتحضّر')).toBeVisible();

    // Guide chips for this moment.
    await expect(async () => {
      if (!(await page.getByTestId('talk').isVisible())) await page.getByTestId('guide-bubble').click({ force: true, timeout: 2000 });
      await expect(page.getByTestId('talk')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30_000 });
    await expect(page.getByTestId('talk-chips').getByRole('button')).toHaveCount(3);
    if (n === 6) {
      await page.getByTestId('chip-tunisia-mexico-result').click();
      await expect(page.getByTestId('talk-answer')).toContainText('3–1', { timeout: 20_000 });
      await expect(page.getByTestId('talk-answer')).toContainText('FIFA');
    } else {
      await page.getByTestId('chip-al-ahad-what').click();
      await expect(page.getByTestId('talk-answer')).toContainText('الأحد', { timeout: 20_000 });
    }
  });
}

test('story mode walks through all six moments', async ({ page }) => {
  test.setTimeout(300_000);
  await enter(page);
  await page.getByRole('button', { name: 'تخطّى' }).click();
  await press(page, 'start-journey');

  const progress = page.getByTestId('story-progress');
  await expect(progress).toHaveAttribute('aria-valuemax', '6');
  for (let n = 1; n <= 6; n++) {
    await expect(page.getByTestId('title-card')).toContainText(TITLES[n - 1]!, { timeout: 40_000 });
    await expect(progress).toHaveAttribute('aria-valuenow', String(n));
    await expect(page.getByTestId('story-bar')).toContainText(`${n}/6`);
    if (n < 6) {
      await page.waitForTimeout(1900);
      await wake(page);
      await press(page, 'story-next');
    }
  }
  // The last stop's next button ends the story.
  await wake(page);
  await press(page, 'story-next');
  await expect(page.getByTestId('story-bar')).toBeHidden();
});
