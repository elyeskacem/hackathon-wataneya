import { test } from '@playwright/test';
import { enter, press } from './helpers';

// Screenshots for reviews: `SCREENS=1 npx playwright test screens --project=desktop`.
test.skip(!process.env.SCREENS, 'screenshots are taken on demand');

const OUT = 'docs/screenshots';
const shot = async (page: import('@playwright/test').Page, name: string) => {
  await page.mouse.move(720, 450); // wakes the auto-hiding UI
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};

test('screens: lobby, custom, moment', async ({ page }, info) => {
  const tag = info.project.name;
  await enter(page);
  await page.getByRole('button', { name: 'تخطّى' }).click();
  await page.waitForTimeout(2500);
  await shot(page, `${tag}-lobby`);

  await press(page, 'pick-moment');
  await page.waitForTimeout(2500);
  await shot(page, `${tag}-custom`);

  await press(page, 'enter-moment');
  await page.waitForTimeout(1500);
  await shot(page, `${tag}-moment-arrival`);
  await page.waitForTimeout(5000);
  await shot(page, `${tag}-moment`);
});
