import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { addFuel, addMaintenance, installWriteFailureSwitch, readStoredRecords, setWriteFailure } from './helpers';

async function exportBackup(page: Page) {
  await page.goto('#/backup');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出备份文件' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^carkeeper-backup-\d{8}-\d{4}\.json$/);
  return readFile(await download.path(), 'utf8');
}

async function chooseBackup(page: Page, text: string) {
  await page.goto('#/backup');
  await page.getByTestId('restore-input').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(text) });
}

const sortById = (list: unknown[]) => [...list].sort((a, b) => ((a as { id: string }).id < (b as { id: string }).id ? -1 : 1));

test('备份页显示本地存储风险与操作入口', async ({ page }) => {
  await page.goto('#/backup');
  await expect(page.getByText('所有记录只保存在这台手机的浏览器中')).toBeVisible();
  await expect(page.getByText(/清除浏览器数据.*可能导致记录丢失/)).toBeVisible();
  await expect(page.getByText('备份文件未加密')).toBeVisible();
  await expect(page.getByText('建议恢复前先导出当前数据')).toBeVisible();
  await expect(page.getByRole('button', { name: '导出备份文件' })).toBeVisible();
  await expect(page.getByText('选择备份文件')).toBeVisible();
});

test('导出后修改历史，再恢复回导出时的状态', async ({ page }) => {
  await page.goto('/');
  await addMaintenance(page, { date: '2026-09-01', odometer: '55000', items: ['更换机油', '更换刹车片'], amount: '580', notes: '4S 店\n第二行' });
  await addFuel(page, { date: '2026-10-01', odometer: '56000', amount: '300.5', volume: '42.125' });
  const before = await readStoredRecords(page);

  const text = await exportBackup(page);
  await expect(page.getByText('已导出 2 条记录（保养 1 条，加油 1 条）')).toBeVisible();
  const file = JSON.parse(text);
  expect(file).toMatchObject({ format: 'carkeeper-backup', version: 1, units: { distance: 'km', currency: 'CNY', volume: 'L' } });
  expect(sortById(file.records)).toEqual(sortById(before));

  await addFuel(page, { date: '2026-11-01', odometer: '57000', amount: '100' });
  expect(await readStoredRecords(page)).toHaveLength(3);

  await chooseBackup(page, text);
  await expect(page.getByText(/包含保养 1 条、加油 1 条/)).toBeVisible();
  await expect(page.getByText('本机当前有 3 条记录（保养 1 条，加油 2 条）。')).toBeVisible();
  await expect(page.getByText(/现有的 3 条记录将被备份内容整体替换/)).toBeVisible();
  await page.getByRole('button', { name: '确认恢复' }).click();
  await expect(page.getByText('恢复完成，本机现有 2 条记录。')).toBeVisible();

  expect(sortById(await readStoredRecords(page))).toEqual(sortById(before));
  await page.goto('#/history');
  await expect(page.locator('.record-item')).toHaveCount(2);
});

test('取消恢复不修改记录', async ({ page }) => {
  await page.goto('/');
  await addFuel(page, { date: '2026-10-01', odometer: '56000', amount: '300' });
  const text = await exportBackup(page);
  await addFuel(page, { date: '2026-11-01', odometer: '57000', amount: '100' });
  const before = await readStoredRecords(page);
  await chooseBackup(page, text);
  await page.getByRole('button', { name: '取消' }).click();
  await expect(page.getByRole('button', { name: '确认恢复' })).toHaveCount(0);
  expect(sortById(await readStoredRecords(page))).toEqual(sortById(before));
});

test('零记录备份明确提示会清空，确认后才执行', async ({ page }) => {
  await page.goto('/');
  const empty = await exportBackup(page);
  await expect(page.getByText('已导出 0 条记录（保养 0 条，加油 0 条）')).toBeVisible();
  await addFuel(page, { date: '2026-10-01', odometer: '56000', amount: '300' });

  await chooseBackup(page, empty);
  await expect(page.getByText('这个备份没有任何记录，恢复后本机所有记录将被清空。')).toBeVisible();
  expect(await readStoredRecords(page)).toHaveLength(1);
  await page.getByRole('button', { name: '确认恢复' }).click();
  await expect(page.getByText('恢复完成，本机现有 0 条记录。')).toBeVisible();
  expect(await readStoredRecords(page)).toEqual([]);
});

test('无效或不支持的文件被拒绝，原记录不变', async ({ page }) => {
  await page.goto('/');
  await addFuel(page, { date: '2026-10-01', odometer: '56000', amount: '300' });
  const valid = JSON.parse(await exportBackup(page));
  const before = await readStoredRecords(page);

  const cases: [string, string][] = [
    ['{ not json', '不是有效的 JSON'],
    [JSON.stringify({ ...valid, version: 99 }), '不支持的备份版本'],
    [JSON.stringify({ ...valid, units: { ...valid.units, currency: 'USD' } }), '单位不受支持'],
    [JSON.stringify({ ...valid, records: [valid.records[0], valid.records[0]] }), '标识重复'],
    [JSON.stringify({ ...valid, records: [{ ...valid.records[0], amountFen: -1 }] }), '第 1 条记录无效'],
  ];
  for (const [text, message] of cases) {
    await chooseBackup(page, text);
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByText('本机记录未作任何修改')).toBeVisible();
    await expect(page.getByRole('button', { name: '确认恢复' })).toHaveCount(0);
  }
  expect(await readStoredRecords(page)).toEqual(before);
});

test('恢复写入失败时整体回滚，不显示成功', async ({ page }) => {
  await installWriteFailureSwitch(page);
  await page.goto('/');
  await addFuel(page, { date: '2026-09-01', odometer: '50000', amount: '300' });
  await addFuel(page, { date: '2026-09-15', odometer: '50500', amount: '200' });
  const backupText = await exportBackup(page);
  await addMaintenance(page, { date: '2026-10-01', odometer: '51000', items: ['更换机油'] });
  const before = await readStoredRecords(page);

  await chooseBackup(page, backupText);
  await setWriteFailure(page, true);
  await page.getByRole('button', { name: '确认恢复' }).click();
  await expect(page.getByText(/恢复失败：.*本机原有记录保持不变/)).toBeVisible();
  await expect(page.getByText(/恢复完成/)).toHaveCount(0);
  await setWriteFailure(page, false);
  expect(sortById(await readStoredRecords(page))).toEqual(sortById(before));
});
