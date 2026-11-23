import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { readStoredRecords } from './helpers';

const ROOT = 'http://localhost:4173/';

test('完整流程：识别确认 → 保存 → 断网重启 → 导出 → 修改 → 恢复，持久化数据与备份字段一致', async ({ page, context, browser }) => {
  const shot = await browser.newPage({ viewport: { width: 800, height: 500 } });
  await shot.setContent(`<body style="margin:0;background:#f2f2f2;font:bold 80px Consolas,monospace;color:#111">
    <div style="position:absolute;top:60px;left:80px">ODO 58320 km</div>
    <div style="position:absolute;top:320px;left:80px">TRIP 123.4 km</div></body>`);
  const photo = await shot.screenshot();
  await shot.close();

  await page.goto(ROOT);
  await expect(page.getByTestId('offline-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });

  // Recognize the odometer, confirm it, then save a maintenance record.
  await page.goto(`${ROOT}#/maintenance/new`);
  await page.getByLabel('日期').fill('2026-11-01');
  await page.getByRole('button', { name: '拍照识别' }).click();
  await page.getByTestId('album-input').setInputFiles({ name: 'dash.png', mimeType: 'image/png', buffer: photo });
  const area = page.getByTestId('crop-area');
  const box = (await area.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.04, box.y + box.height * 0.04);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.97, box.y + box.height * 0.42, { steps: 4 });
  await page.mouse.up();
  await page.getByRole('button', { name: '识别所选区域' }).click();
  await expect(page.getByTestId('ocr-candidate')).toContainText('58320', { timeout: 60_000 });
  expect(await readStoredRecords(page)).toEqual([]);
  await page.getByTestId('ocr-candidate').getByRole('button', { name: '采用' }).click();
  await page.locator('.chip', { hasText: '更换机油' }).click();
  await page.locator('.chip', { hasText: '更换刹车片' }).click();
  await page.getByLabel('费用（元，可选）').fill('680.5');
  await page.getByLabel('备注（可选）').fill('识别后确认');
  await page.getByRole('button', { name: '保存保养记录' }).click();
  await expect(page.getByText('已保存记录')).toBeVisible();

  const [saved] = (await readStoredRecords(page)) as Record<string, unknown>[];
  expect(saved).toMatchObject({
    type: 'maintenance',
    date: '2026-11-01',
    odometerKm: 58320,
    items: ['更换机油', '更换刹车片'],
    amountFen: 68050,
    notes: '识别后确认',
  });

  // Restart offline and add a fuel record.
  await context.setOffline(true);
  await page.goto(ROOT);
  await page.reload();
  await expect(page.locator('.link-card', { hasText: '历史记录' })).toContainText('1 条');
  await page.goto(`${ROOT}#/fuel/new`);
  await page.getByLabel('日期').fill('2026-11-15');
  await page.getByLabel('总里程（公里）').fill('58900');
  await page.getByLabel('金额（元）').fill('320.25');
  await page.getByLabel('加油量（升，可选）').fill('41.5');
  await page.getByRole('button', { name: '保存加油记录' }).click();
  await expect(page.getByText('已保存记录')).toBeVisible();
  const beforeExport = await readStoredRecords(page);
  expect(beforeExport).toHaveLength(2);

  // Export while offline and check every field in the file.
  await page.goto(`${ROOT}#/backup`);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '导出备份文件' }).click()]);
  const text = await readFile(await download.path(), 'utf8');
  const backup = JSON.parse(text);
  expect(backup).toMatchObject({ format: 'carkeeper-backup', version: 1, units: { distance: 'km', currency: 'CNY', volume: 'L' } });
  const byId = (list: { id: string }[]) => Object.fromEntries(list.map((r) => [r.id, r]));
  expect(byId(backup.records)).toEqual(byId(beforeExport as { id: string }[]));
  expect(backup.records.find((r: { type: string }) => r.type === 'fuel')).toMatchObject({ amountFen: 32025, volumeMl: 41500, odometerKm: 58900 });

  // Change history, then restore the exported state.
  await page.goto(`${ROOT}#/history`);
  await page.locator('.record-item', { hasText: '加油' }).click();
  await page.getByRole('button', { name: '删除' }).click();
  await page.getByRole('button', { name: '确认删除' }).click();
  await expect(page.getByText('已删除记录')).toBeVisible();
  expect(await readStoredRecords(page)).toHaveLength(1);

  await page.goto(`${ROOT}#/backup`);
  await page.getByTestId('restore-input').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('button', { name: '确认恢复' }).click();
  await expect(page.getByText('恢复完成，本机现有 2 条记录。')).toBeVisible();

  await page.reload();
  expect(byId((await readStoredRecords(page)) as { id: string }[])).toEqual(byId(beforeExport as { id: string }[]));
  await context.setOffline(false);
});
