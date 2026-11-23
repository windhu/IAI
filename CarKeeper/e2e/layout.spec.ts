import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers';

test('首页提供四个入口且各页面在手机宽度下无横向溢出', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '爱车记录' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('link', { name: '记保养' }).click();
  await expect(page.getByRole('heading', { name: '记保养' })).toBeVisible();
  await expect(page).toHaveURL(/#\/maintenance\/new$/);
  await page.getByLabel('总里程（公里）').fill('12345');
  await page.locator('.chip', { hasText: '更换机油' }).click();
  await expect(page.locator('.chip', { hasText: '更换机油' })).toHaveClass(/chip-on/);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('link', { name: '返回', exact: true }).click();
  await page.getByRole('link', { name: '记加油' }).click();
  await expect(page.getByRole('heading', { name: '记加油' })).toBeVisible();
  await page.getByLabel('金额（元）').fill('300');
  await expect(page.getByLabel('金额（元）')).toHaveValue('300');
  await expectNoHorizontalOverflow(page);

  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '历史' }).click();
  await expect(page.getByRole('heading', { name: '历史记录' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '备份' }).click();
  await expect(page.getByRole('heading', { name: '备份与恢复' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Hash routes work after a full reload without any server-side routing.
  await page.reload();
  await expect(page.getByRole('heading', { name: '备份与恢复' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: '历史记录' })).toBeVisible();
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`${width}px 视口利用空间且主要控件保持可操作`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '爱车记录' })).toBeVisible();
    const main = page.locator('.main');
    const metrics = await main.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        width: element.getBoundingClientRect().width,
        paddingLeft: parseFloat(style.paddingLeft),
        paddingRight: parseFloat(style.paddingRight),
        fontSize: parseFloat(getComputedStyle(document.body).fontSize),
      };
    });
    expect(metrics.fontSize).toBeGreaterThanOrEqual(17);
    if (width <= 390) {
      expect(metrics.paddingLeft).toBeLessThanOrEqual(12);
      expect(metrics.paddingRight).toBeLessThanOrEqual(12);
    }
    if (width === 1440) expect(metrics.width - metrics.paddingLeft - metrics.paddingRight).toBeGreaterThanOrEqual(900);
    await page.goto('/#/fuel/new');
    const formWidth = await page.locator('.form').evaluate((element) => element.getBoundingClientRect().width);
    expect(formWidth).toBeLessThanOrEqual(720);
    for (const control of await page.locator('.form .input, .form .button').all()) {
      await expect(control).toBeVisible();
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expectNoHorizontalOverflow(page);
  });
}

test('文字放大后页面和底部导航不裁切或遮挡控件', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.addInitScript(() => { document.documentElement.style.fontSize = '32px'; });
  await page.goto('/');
  for (const [route, heading] of [
    ['/', '爱车记录'],
    ['/#/maintenance/new', '记保养'],
    ['/#/fuel/new', '记加油'],
    ['/#/history', '历史记录'],
    ['/#/backup', '备份与恢复'],
  ]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    const clipped = await page.evaluate(() => {
      const selectors = 'main h1, main h2, main p, main label:not(.visually-hidden), main input:not(.visually-hidden), main textarea, main button, main a, nav a';
      return Array.from(document.querySelectorAll<HTMLElement>(selectors))
        .filter((element) => element.getClientRects().length > 0)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 1;
        })
        .map((element) => `${element.tagName}.${element.className}: ${element.textContent?.trim()}`);
    });
    expect(clipped).toEqual([]);
    await expectNoHorizontalOverflow(page);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const overlap = await page.evaluate(() => {
      const main = document.querySelector('main')!.getBoundingClientRect();
      const nav = document.querySelector('.tabbar')!.getBoundingClientRect();
      return main.bottom > nav.top + 1;
    });
    expect(overlap).toBe(false);
  }
});
