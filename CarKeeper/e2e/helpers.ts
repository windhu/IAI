import { expect, type Page } from '@playwright/test';

/** Makes IndexedDB writes throw QuotaExceededError while window.__failWrites is true. */
export async function installWriteFailureSwitch(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __failWrites: boolean };
    w.__failWrites = false;
    const fail = () => {
      if (w.__failWrites) throw new DOMException('simulated quota exceeded', 'QuotaExceededError');
    };
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
      fail();
      return put.apply(this, args);
    };
    const del = IDBObjectStore.prototype.delete;
    IDBObjectStore.prototype.delete = function (...args: Parameters<typeof del>) {
      fail();
      return del.apply(this, args);
    };
  });
}

export const setWriteFailure = (page: Page, on: boolean) =>
  page.evaluate((value) => {
    (window as unknown as { __failWrites: boolean }).__failWrites = value;
  }, on);

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Waits until a save either finished (app navigates to history) or stopped at the mileage check. */
async function waitForSaveOutcome(page: Page) {
  await expect
    .poll(async () => page.url().endsWith('#/history') || (await page.getByText('请核对里程').count()) > 0, { timeout: 15_000 })
    .toBe(true);
}

export async function addMaintenance(
  page: Page,
  data: { date: string; odometer: string; items: string[]; amount?: string; notes?: string },
) {
  await page.goto('#/maintenance/new');
  await page.getByLabel('日期').fill(data.date);
  await page.getByLabel('总里程（公里）').fill(data.odometer);
  for (const item of data.items) {
    const preset = page.locator('.chip', { hasText: item });
    if (await preset.count()) await preset.first().click();
    else {
      await page.getByLabel('自定义保养项目').fill(item);
      await page.getByRole('button', { name: '添加' }).click();
    }
  }
  if (data.amount) await page.getByLabel('费用（元，可选）').fill(data.amount);
  if (data.notes) await page.getByLabel('备注（可选）').fill(data.notes);
  await page.getByRole('button', { name: /保存保养记录|仍然保存/ }).click();
  await waitForSaveOutcome(page);
}

export async function addFuel(page: Page, data: { date: string; odometer: string; amount: string; volume?: string; notes?: string }) {
  await page.goto('#/fuel/new');
  await page.getByLabel('日期').fill(data.date);
  await page.getByLabel('总里程（公里）').fill(data.odometer);
  await page.getByLabel('金额（元）').fill(data.amount);
  if (data.volume) await page.getByLabel('加油量（升，可选）').fill(data.volume);
  if (data.notes) await page.getByLabel('备注（可选）').fill(data.notes);
  await page.getByRole('button', { name: /保存加油记录|仍然保存/ }).click();
  await waitForSaveOutcome(page);
}

/** Reads raw records straight from IndexedDB, bypassing the UI. */
export const readStoredRecords = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open('carkeeper');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('records')) {
            db.close();
            resolve([]);
            return;
          }
          const req = db.transaction('records').objectStore('records').getAll();
          req.onsuccess = () => {
            db.close();
            resolve(req.result);
          };
          req.onerror = () => reject(req.error);
        };
      }),
  );

export const historyItems = (page: Page) => page.locator('.record-item');
