import { expect, type Page } from '@playwright/test';

// Hotspots drift with the camera on purpose, so clicks are forced instead of waiting for "stable",
// once the element is on screen (camera glides can briefly carry it out of view).
export async function press(page: Page, testId: string) {
  const target = page.getByTestId(testId);
  await expect(page.getByTestId('curtain')).toHaveAttribute('data-on', 'false');
  await expect(target).toBeInViewport();
  await target.click({ force: true });
}

/** Waits until a hotspot has stopped gliding with the camera (it may still drift a few pixels). */
export async function settled(page: Page, testId: string) {
  const target = page.getByTestId(testId);
  let last = { x: Infinity, y: Infinity };
  await expect
    .poll(
      async () => {
        const box = await target.boundingBox();
        if (!box) return false;
        const vp = page.viewportSize();
        if (!vp || box.x < 0 || box.y < 0 || box.x + box.width > vp.width || box.y + box.height > vp.height) return false;
        const still = Math.abs(box.x - last.x) < 4 && Math.abs(box.y - last.y) < 4;
        last = { x: box.x, y: box.y };
        return still;
      },
      { intervals: [250], timeout: 15_000 },
    )
    .toBe(true);
}

export async function enter(page: Page) {
  await page.goto('/');
  // The loader shows real progress, then the enter button once the lobby is ready.
  await expect(page.getByTestId('enter')).toBeVisible({ timeout: 60_000 });
  await press(page, 'enter');
  await expect(page.getByTestId('controls-hint')).toBeVisible();
}

