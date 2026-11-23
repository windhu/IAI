import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { addFuel, addMaintenance, readStoredRecords } from './helpers';

const ROOT = 'http://localhost:4173/';
const SUB = 'http://localhost:4174/carkeeper/';

async function waitOfflineReady(page: Page) {
  await expect(page.getByTestId('offline-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  // If activation raced with a navigation, clients.claim() can miss this page; reopening fixes it,
  // exactly as for a user. Later steps need a controlled page.
  if (!(await page.evaluate(() => navigator.serviceWorker.controller !== null))) await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

for (const [label, base, dir] of [
  ['根路径', ROOT, 'dist'],
  ['子目录', SUB, 'dist-sub'],
] as const) {
  test(`${label}：manifest、图标、service worker 与识别资源均可加载`, async ({ page, request }) => {
    for (const file of ['index.html', 'manifest.webmanifest', 'sw.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'ocr/worker.min.js', 'ocr/lang/eng.traineddata.gz']) {
      expect(existsSync(`${dir}/${file}`), file).toBe(true);
    }

    await page.goto(base);
    await expect(page.getByRole('heading', { name: '爱车记录' })).toBeVisible();
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifestUrl = new URL(manifestHref!, base).href;
    expect(manifestUrl).toBe(`${base}manifest.webmanifest`);
    const manifest = await (await request.get(manifestUrl)).json();
    expect(manifest).toMatchObject({ name: '爱车记录', display: 'standalone', lang: 'zh-CN' });
    expect(new URL(manifest.start_url, manifestUrl).href).toBe(base);
    expect(new URL(manifest.scope, manifestUrl).href).toBe(base);
    for (const icon of manifest.icons) {
      const res = await request.get(new URL(icon.src, manifestUrl).href);
      expect(res.status(), icon.src).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
    }
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));

    await waitOfflineReady(page);
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope);
    expect(scope).toBe(base);
    for (const asset of ['ocr/worker.min.js', 'ocr/lang/eng.traineddata.gz']) {
      expect((await request.get(`${base}${asset}`)).status(), asset).toBe(200);
    }
  });
}

test('离线就绪后断网重启：查看、增删改、导出与恢复均可用', async ({ page, context }) => {
  await page.goto(ROOT);
  await addFuel(page, { date: '2026-10-01', odometer: '56000', amount: '300' });
  await page.goto(ROOT);
  await waitOfflineReady(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: '爱车记录' })).toBeVisible();
  await expect(page.locator('.link-card', { hasText: '历史记录' })).toContainText('1 条');

  await addMaintenance(page, { date: '2026-11-01', odometer: '57000', items: ['更换机油'] });
  await expect(page.getByText('已保存记录')).toBeVisible();
  await page.locator('.record-item', { hasText: '保养' }).click();
  await page.getByRole('link', { name: '编辑' }).click();
  await page.getByLabel('备注（可选）').fill('断网编辑');
  await page.getByRole('button', { name: '保存修改' }).click();
  await expect(page.locator('.detail')).toContainText('断网编辑');

  await page.goto(`${ROOT}#/backup`);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '导出备份文件' }).click()]);
  const backup = await readFile(await download.path(), 'utf8');
  expect(JSON.parse(backup).records).toHaveLength(2);

  await page.goto(`${ROOT}#/history`);
  await page.locator('.record-item', { hasText: '加油' }).click();
  await page.getByRole('button', { name: '删除' }).click();
  await page.getByRole('button', { name: '确认删除' }).click();
  await expect(page.getByText('已删除记录')).toBeVisible();
  expect(await readStoredRecords(page)).toHaveLength(1);

  await page.goto(`${ROOT}#/backup`);
  await page.getByTestId('restore-input').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await page.getByRole('button', { name: '确认恢复' }).click();
  await expect(page.getByText('恢复完成，本机现有 2 条记录。')).toBeVisible();

  await page.reload();
  await page.goto(`${ROOT}#/history`);
  await expect(page.locator('.record-item')).toHaveCount(2);
  await context.setOffline(false);
});

test('没有安装提示时显示菜单操作说明；浏览器提供安装事件时显示安装按钮', async ({ page }) => {
  await page.goto(ROOT);
  const guide = page.getByTestId('install-guide');
  await expect(guide).toContainText('右上角 ⋮ 菜单');
  await expect(guide).toContainText('添加到主屏幕');
  await expect(guide).toContainText('没有该选项也可以直接用链接继续使用');

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = async () => {
      (window as unknown as { __prompted: boolean }).__prompted = true;
    };
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  });
  await guide.getByRole('button', { name: '安装到桌面' }).click();
  expect(await page.evaluate(() => (window as unknown as { __prompted?: boolean }).__prompted)).toBe(true);
  await expect(guide).toContainText('右上角 ⋮ 菜单');
});

test('安装过程中重新打开页面，离线状态仍能更新为就绪', async ({ page, context }) => {
  await context.route('**/icons/icon-512.png*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });
  await page.goto(ROOT);
  await expect(page.getByTestId('offline-status')).toHaveAttribute('data-state', 'installing', { timeout: 10_000 });
  await page.reload();
  await expect(page.getByTestId('offline-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
});

test('首次缓存失败时不显示离线就绪，并可重试', async ({ page, context }) => {
  let failing = true;
  await context.route('**/icons/icon-512.png*', (route) => (failing ? route.abort() : route.continue()));
  await page.goto(ROOT);
  await expect(page.getByTestId('offline-status')).toHaveAttribute('data-state', 'failed', { timeout: 30_000 });
  await expect(page.getByTestId('offline-status')).toContainText('联网时仍可正常使用');
  // The app itself keeps working online.
  await addFuel(page, { date: '2026-10-01', odometer: '56000', amount: '300' });
  await expect(page.getByText('已保存记录')).toBeVisible();

  failing = false;
  // Same-document navigation back to the status card; a full reload would re-register by itself.
  await page.goto(`${ROOT}#/`);
  await page.getByTestId('offline-status').getByRole('button', { name: '重试' }).click();
  await expect(page.getByTestId('offline-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
});

test('新版本下载后只提示，不自动刷新正在填写的表单', async ({ page }) => {
  const swPath = 'dist/sw.js';
  const original = await readFile(swPath, 'utf8');
  try {
    await page.goto(ROOT);
    await addFuel(page, { date: '2026-10-01', odometer: '56000', amount: '300' });
    await page.goto(ROOT);
    await waitOfflineReady(page);

    await page.goto(`${ROOT}#/maintenance/new`);
    await page.getByLabel('总里程（公里）').fill('57000');
    await page.locator('.chip', { hasText: '更换机油' }).click();
    await page.getByLabel('备注（可选）').fill('正在填写');
    await page.evaluate(() => {
      (window as unknown as { __marker: string }).__marker = 'same-document';
    });

    await appendFile(swPath, `\n// test update ${Date.now()}\n`);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());

    await expect(page.getByText('有新版本可用。请先保存正在填写的内容，再点击更新。')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => (window as unknown as { __marker?: string }).__marker)).toBe('same-document');
    await expect(page.getByLabel('总里程（公里）')).toHaveValue('57000');
    await expect(page.getByLabel('备注（可选）')).toHaveValue('正在填写');
    await expect(page.locator('.chip', { hasText: '更换机油' })).toHaveClass(/chip-on/);

    await page.getByRole('button', { name: '保存保养记录' }).click();
    await expect(page.getByText('已保存记录')).toBeVisible();
    await page.getByRole('button', { name: '立即更新' }).click();
    await expect(page.getByText('有新版本可用')).toHaveCount(0, { timeout: 30_000 });
    await page.goto(`${ROOT}#/history`);
    await expect(page.locator('.record-item')).toHaveCount(2);
  } finally {
    await writeFile(swPath, original);
  }
});
