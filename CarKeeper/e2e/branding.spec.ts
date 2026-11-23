import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers';

const ROOT = 'http://localhost:4173/';

async function waitOfflineReady(page: Page) {
  await expect(page.getByTestId('offline-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  if (!(await page.evaluate(() => navigator.serviceWorker.controller !== null))) await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

test('首页显示峰哥品牌标识，且手机布局可访问、无横向溢出', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '爱车记录' })).toBeVisible();
  await expect(page.getByRole('img', { name: '峰哥出品' })).toBeVisible();
  await expect(page.locator('.home-footer span')).toHaveText('峰哥出品');
  await expect(page.locator('.home-footer svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('link', { name: '记保养' })).toBeVisible();
  await expect(page.getByRole('link', { name: '记加油' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('冷启动显示启动画面，随后自动消失；站内导航不重复，刷新后再次显示', async ({ page }) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.querySelector('[data-testid="launch-screen"]')) return;
      (window as Window & { __launchShownAt?: number }).__launchShownAt = performance.now();
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto(ROOT, { waitUntil: 'commit' });
  const launch = page.getByTestId('launch-screen');
  await expect(launch).toBeVisible();
  await expect(launch).toBeHidden({ timeout: 1500 });
  const visibleFor = await page.evaluate(
    () => performance.now() - (window as Window & { __launchShownAt?: number }).__launchShownAt!,
  );
  expect(visibleFor).toBeGreaterThanOrEqual(600);
  expect(visibleFor).toBeLessThanOrEqual(1500);

  await page.getByRole('link', { name: '记保养' }).click();
  await expect(page.getByRole('heading', { name: '记保养' })).toBeVisible();
  await expect(launch).toHaveCount(0);

  await page.reload({ waitUntil: 'commit' });
  await expect(launch).toBeVisible();
});

test('轻点可立即跳过启动画面；减少动效设置下不显示', async ({ page }) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const launch = document.querySelector('[data-testid="launch-screen"]');
      if (!launch) return;
      launch.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
      (window as Window & { __launchPointerDownSent?: boolean }).__launchPointerDownSent = true;
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto(ROOT, { waitUntil: 'commit' });
  const launch = page.getByTestId('launch-screen');
  await page.waitForFunction(() => (window as Window & { __launchPointerDownSent?: boolean }).__launchPointerDownSent);
  await expect(launch).toHaveCount(0);
  await expect(page).toHaveURL(ROOT);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.getByTestId('launch-screen')).toHaveCount(0);
});

test('离线冷启动正常显示品牌标识且不请求外部图片或字体', async ({ page, context }) => {
  const externalMediaRequests: string[] = [];
  page.on('request', (request) => {
    if (!['image', 'font'].includes(request.resourceType())) return;
    if (new URL(request.url()).origin !== new URL(ROOT).origin) externalMediaRequests.push(request.url());
  });

  await page.goto(ROOT);
  await waitOfflineReady(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('launch-screen')).toBeVisible();
  await expect(page.getByRole('img', { name: '峰哥出品' })).toBeVisible();
  await expect(page.locator('.home-footer span')).toHaveText('峰哥出品');
  await expect(page.locator('.launch-screen .brand-logo')).toBeVisible();
  await expect(page.getByTestId('launch-screen')).toBeHidden({ timeout: 1500 });
  expect(externalMediaRequests).toEqual([]);
  await context.setOffline(false);
});
