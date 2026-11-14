import { expect, type Page } from '@playwright/test';

// Hotspots drift with the camera on purpose, so clicks are forced instead of waiting for "stable",
// once the element is on screen (camera glides can briefly carry it out of view).
export async function press(page: Page, testId: string) {
  const target = page.getByTestId(testId);
  await expect(page.getByTestId('curtain')).toHaveAttribute('data-on', 'false');
  await expect(target).toBeInViewport();
  await target.click({ force: true });
}

export async function enter(page: Page) {
  await page.goto('/');
  // The loader shows real progress, then the enter button once the lobby is ready.
  await expect(page.getByTestId('enter')).toBeVisible({ timeout: 60_000 });
  await press(page, 'enter');
  await expect(page.getByTestId('controls-hint')).toBeVisible();
}

