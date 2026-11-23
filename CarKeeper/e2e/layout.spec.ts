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
