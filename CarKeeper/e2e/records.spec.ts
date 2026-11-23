import { expect, test } from '@playwright/test';
import {
  addFuel,
  addMaintenance,
  historyItems,
  installWriteFailureSwitch,
  readStoredRecords,
  setWriteFailure,
} from './helpers';

test.describe('保养记录', () => {
  test('保存多项目保养，费用与备注可留空', async ({ page }) => {
    await page.goto('/');
    await addMaintenance(page, { date: '2026-11-01', odometer: '58320', items: ['更换机油', '更换刹车片', '四轮定位'] });
    await expect(page.getByText('已保存记录')).toBeVisible();
    await expect(page.getByRole('heading', { name: '历史记录' })).toBeVisible();
    await expect(historyItems(page)).toHaveCount(1);
    await expect(historyItems(page).first()).toContainText('更换机油、更换刹车片、四轮定位');

    const stored = await readStoredRecords(page);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      type: 'maintenance',
      date: '2026-11-01',
      odometerKm: 58320,
      items: ['更换机油', '更换刹车片', '四轮定位'],
    });
    expect(stored[0]).not.toHaveProperty('amountFen');
    expect(stored[0]).not.toHaveProperty('notes');
  });

  test('字段错误逐项提示且保留已填内容', async ({ page }) => {
    await page.goto('#/maintenance/new');
    await page.getByLabel('总里程（公里）').fill('58320.5');
    await page.getByLabel('费用（元，可选）').fill('12.345');
    await page.getByLabel('备注（可选）').fill('保留我');
    await page.getByRole('button', { name: '保存保养记录' }).click();

    await expect(page.getByText('总里程须为不含小数的非负整数（公里）')).toBeVisible();
    await expect(page.getByText('请至少选择或填写一个保养项目')).toBeVisible();
    await expect(page.getByText('金额最多两位小数')).toBeVisible();
    await expect(page.getByLabel('总里程（公里）')).toHaveValue('58320.5');
    await expect(page.getByLabel('备注（可选）')).toHaveValue('保留我');
    expect(await readStoredRecords(page)).toEqual([]);
  });

  test('存储写入失败时提示未保存并保留输入', async ({ page }) => {
    await installWriteFailureSwitch(page);
    await page.goto('#/maintenance/new');
    await setWriteFailure(page, true);
    await page.getByLabel('总里程（公里）').fill('60000');
    await page.locator('.chip', { hasText: '更换机油' }).click();
    await page.getByLabel('备注（可选）').fill('写入会失败');
    await page.getByRole('button', { name: '保存保养记录' }).click();

    await expect(page.getByText(/存储空间不足.*记录未保存/)).toBeVisible();
    await expect(page.getByText('已保存记录')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '记保养' })).toBeVisible();
    await expect(page.getByLabel('总里程（公里）')).toHaveValue('60000');
    await expect(page.getByLabel('备注（可选）')).toHaveValue('写入会失败');
    expect(await readStoredRecords(page)).toEqual([]);

    await setWriteFailure(page, false);
    await page.getByRole('button', { name: '保存保养记录' }).click();
    await expect(page.getByText('已保存记录')).toBeVisible();
    expect(await readStoredRecords(page)).toHaveLength(1);
  });
});

test.describe('加油记录', () => {
  test('不填升数也能保存，重开应用后仍在', async ({ page }) => {
    await page.goto('/');
    await addFuel(page, { date: '2026-11-20', odometer: '58800', amount: '300' });
    await expect(page.getByText('已保存记录')).toBeVisible();
    await expect(historyItems(page).first()).toContainText('未填写升数');
    await expect(historyItems(page).first()).toContainText('¥300.00');
    await expect(page.getByText(/油耗/)).toHaveCount(0);

    await page.goto('about:blank');
    await page.goto('#/history');
    await expect(historyItems(page)).toHaveCount(1);
    await expect(historyItems(page).first()).toContainText('58,800 公里');
    const [stored] = await readStoredRecords(page);
    expect(stored).toMatchObject({ type: 'fuel', amountFen: 30000, odometerKm: 58800 });
    expect(stored).not.toHaveProperty('volumeMl');
  });

  test('非法金额和升数被拒绝', async ({ page }) => {
    await page.goto('#/fuel/new');
    await page.getByLabel('总里程（公里）').fill('100');
    for (const [amount, message] of [
      ['', '请填写金额'],
      ['0', '金额须大于 0'],
      ['-5', '金额格式无效，请输入数字'],
      ['10.999', '金额最多两位小数'],
    ]) {
      await page.getByLabel('金额（元）').fill(amount);
      await page.getByRole('button', { name: '保存加油记录' }).click();
      await expect(page.getByText(message, { exact: true })).toBeVisible();
    }
    await page.getByLabel('金额（元）').fill('300');
    await page.getByLabel('加油量（升，可选）').fill('0');
    await page.getByRole('button', { name: '保存加油记录' }).click();
    await expect(page.getByText('升数须大于 0')).toBeVisible();
    expect(await readStoredRecords(page)).toEqual([]);

    await page.getByLabel('加油量（升，可选）').fill('42.125');
    await page.getByRole('button', { name: '保存加油记录' }).click();
    await expect(page.getByText('已保存记录')).toBeVisible();
    expect((await readStoredRecords(page))[0]).toMatchObject({ amountFen: 30000, volumeMl: 42125 });
  });
});

test.describe('历史记录', () => {
  test('按日期倒序、同日稳定，可补录旧记录', async ({ page }) => {
    await page.goto('/');
    await addFuel(page, { date: '2026-11-20', odometer: '60000', amount: '200' });
    await addFuel(page, { date: '2026-11-20', odometer: '60100', amount: '100' });
    await addMaintenance(page, { date: '2026-01-10', odometer: '50000', items: ['更换机油'] });
    // Backfilled older record with a lower reading saves without a warning.
    await expect(page.getByText('已保存记录')).toBeVisible();

    const order = async () => historyItems(page).evaluateAll((els) => els.map((e) => e.textContent ?? ''));
    const first = await order();
    expect(first[0]).toContain('60,100');
    expect(first[1]).toContain('60,000');
    expect(first[2]).toContain('2026-01-10');
    await page.reload();
    expect(await order()).toEqual(first);
  });

  test('里程走势矛盾时提示核对，确认后仍可保存', async ({ page }) => {
    await page.goto('/');
    await addFuel(page, { date: '2026-10-01', odometer: '60000', amount: '200' });
    await page.goto('#/fuel/new');
    await page.getByLabel('日期').fill('2026-11-01');
    await page.getByLabel('总里程（公里）').fill('59000');
    await page.getByLabel('金额（元）').fill('100');
    await page.getByRole('button', { name: '保存加油记录' }).click();
    await expect(page.getByText(/低于更早的 2026-10-01 记录/)).toBeVisible();
    expect(await readStoredRecords(page)).toHaveLength(1);
    await page.getByRole('button', { name: '仍然保存' }).click();
    await expect(page.getByText('已保存记录')).toBeVisible();
    expect(await readStoredRecords(page)).toHaveLength(2);
  });

  test('编辑后显示新内容；取消删除不修改；确认删除只删目标', async ({ page }) => {
    await page.goto('/');
    await addMaintenance(page, { date: '2026-09-01', odometer: '55000', items: ['更换机油'], amount: '400' });
    await addFuel(page, { date: '2026-10-01', odometer: '56000', amount: '250' });

    await historyItems(page).filter({ hasText: '保养' }).click();
    await expect(page.getByRole('heading', { name: '保养记录' })).toBeVisible();
    await page.getByRole('link', { name: '编辑' }).click();
    await expect(page.getByLabel('费用（元，可选）')).toHaveValue('400');
    await page.locator('.chip', { hasText: '更换机滤' }).click();
    await page.getByLabel('费用（元，可选）').fill('480.5');
    await page.getByRole('button', { name: '保存修改' }).click();
    await expect(page.getByText('已保存修改')).toBeVisible();
    await expect(page.locator('.detail')).toContainText('更换机油、更换机滤');
    await expect(page.locator('.detail')).toContainText('¥480.50');

    await page.getByRole('button', { name: '删除' }).click();
    await expect(page.getByText('确定删除这条记录吗？')).toBeVisible();
    await page.getByRole('button', { name: '取消' }).click();
    expect(await readStoredRecords(page)).toHaveLength(2);

    await page.getByRole('button', { name: '删除' }).click();
    await page.getByRole('button', { name: '确认删除' }).click();
    await expect(page.getByText('已删除记录')).toBeVisible();
    await expect(historyItems(page)).toHaveCount(1);
    const remaining = await readStoredRecords(page);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ type: 'fuel', odometerKm: 56000 });

    const stored = remaining[0] as { createdAt: string };
    expect(stored.createdAt).toBeTruthy();
  });

  test('删除失败时提示且记录仍在', async ({ page }) => {
    await installWriteFailureSwitch(page);
    await page.goto('/');
    await addFuel(page, { date: '2026-10-01', odometer: '56000', amount: '250' });
    await historyItems(page).first().click();
    await setWriteFailure(page, true);
    await page.getByRole('button', { name: '删除' }).click();
    await page.getByRole('button', { name: '确认删除' }).click();
    await expect(page.getByText(/记录未删除/)).toBeVisible();
    expect(await readStoredRecords(page)).toHaveLength(1);
  });
});
