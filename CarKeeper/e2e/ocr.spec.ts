import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { readStoredRecords } from './helpers';

const ROOT = 'http://localhost:4173/';
const SUB = 'http://localhost:4174/carkeeper/';

/** Renders a synthetic two-line dashboard: odometer integer on top, trip decimal below. */
async function renderDashboard(browser: Browser, top = 'ODO 58320 km', bottom = 'TRIP 123.4 km'): Promise<Buffer> {
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  await page.setContent(`
    <body style="margin:0;background:#f2f2f2;font:bold 80px 'Consolas','Courier New',monospace;color:#111">
      <div style="position:absolute;top:60px;left:80px">${top}</div>
      <div style="position:absolute;top:320px;left:80px">${bottom}</div>
    </body>`);
  const png = await page.screenshot();
  await page.close();
  return png;
}

async function trackResources(page: Page) {
  await page.addInitScript(() => {
    const stats = { workersCreated: 0, workersTerminated: 0, liveUrls: new Set<string>() };
    (window as unknown as { __res: typeof stats }).__res = stats;
    const Original = window.Worker;
    window.Worker = class extends Original {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        super(...args);
        stats.workersCreated++;
      }
      terminate() {
        stats.workersTerminated++;
        super.terminate();
      }
    };
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (obj: Blob | MediaSource) => {
      const url = create(obj);
      stats.liveUrls.add(url);
      return url;
    };
    URL.revokeObjectURL = (url: string) => {
      stats.liveUrls.delete(url);
      revoke(url);
    };
  });
}

const resourceStats = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as { __res: { workersCreated: number; workersTerminated: number; liveUrls: Set<string> } }).__res;
    return { created: s.workersCreated, terminated: s.workersTerminated, liveUrls: s.liveUrls.size };
  });

function recordRequests(context: BrowserContext) {
  const urls: string[] = [];
  context.on('request', (r) => urls.push(r.url()));
  return urls;
}

async function openCapture(page: Page, base: string, image: Buffer) {
  await page.goto(`${base}#/fuel/new`);
  await page.getByRole('button', { name: '拍照识别' }).click();
  await page.getByTestId('album-input').setInputFiles({ name: 'dash.png', mimeType: 'image/png', buffer: image });
  await expect(page.getByTestId('crop-area')).toBeVisible();
}

/** Drags a crop box over the given fraction of the photo. */
async function dragCrop(page: Page, from: [number, number], to: [number, number]) {
  const box = (await page.getByTestId('crop-area').boundingBox())!;
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1]);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * ((from[0] + to[0]) / 2), box.y + box.height * ((from[1] + to[1]) / 2));
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1]);
  await page.mouse.up();
}

const cropTop = (page: Page) => dragCrop(page, [0.04, 0.04], [0.97, 0.42]);
const cropBottom = (page: Page) => dragCrop(page, [0.04, 0.56], [0.97, 0.94]);

async function prepareOcrFromHome(page: Page, base: string) {
  await page.goto(base);
  const status = page.getByTestId('ocr-status');
  await expect(status).toHaveAttribute('data-state', 'missing');
  await status.getByRole('button', { name: '下载' }).click();
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
}

for (const [label, base] of [
  ['根路径', ROOT],
  ['子目录', SUB],
] as const) {
  test(`${label}：自托管资源初始化识别，只请求同站静态资源，确认后才填入`, async ({ page, context, browser }) => {
    const requests = recordRequests(context);
    const image = await renderDashboard(browser);
    await openCapture(page, base, image);
    await page.getByLabel('总里程（公里）').fill('11111');
    await cropTop(page);
    await page.getByRole('button', { name: '识别所选区域' }).click();

    const candidate = page.getByTestId('ocr-candidate');
    await expect(candidate).toBeVisible({ timeout: 60_000 });
    await expect(candidate).toContainText('58320');
    await expect(candidate).toContainText('总里程（ODO）');
    // Nothing is applied or saved before the user confirms.
    await expect(page.getByLabel('总里程（公里）')).toHaveValue('11111');
    expect(await readStoredRecords(page)).toEqual([]);

    await candidate.getByRole('button', { name: '采用' }).click();
    await expect(page.getByLabel('总里程（公里）')).toHaveValue('58320');
    await expect(page.getByRole('region', { name: '拍照识别总里程' })).toHaveCount(0);
    expect(await readStoredRecords(page)).toEqual([]);

    const origin = new URL(base).origin;
    const foreign = requests.filter((u) => !u.startsWith(origin) && !u.startsWith('blob:') && !u.startsWith('data:'));
    expect(foreign).toEqual([]);
    expect(requests.some((u) => u.startsWith(`${base}ocr/lang/eng.traineddata.gz`))).toBe(true);
    expect(requests.some((u) => /ocr\/core\/tesseract-core-.*lstm\.wasm\.js/.test(u))).toBe(true);
  });
}

test('裁剪只识别所选区域：上方整数可采用，下方小计小数被拒绝', async ({ page, browser }) => {
  await prepareOcrFromHome(page, ROOT);
  await openCapture(page, ROOT, await renderDashboard(browser));

  await cropBottom(page);
  await page.getByRole('button', { name: '识别所选区域' }).click();
  const rejected = page.getByTestId('ocr-rejected');
  await expect(rejected).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('ocr-candidate')).toHaveCount(0);
  await expect(page.getByLabel('总里程（公里）')).toHaveValue('');

  await cropTop(page);
  await rejected.getByRole('button', { name: '重新识别' }).click();
  await expect(page.getByTestId('ocr-candidate')).toContainText('58320', { timeout: 60_000 });
});

test('多个数字时提示缩小范围，不自动选取', async ({ page, browser }) => {
  await prepareOcrFromHome(page, ROOT);
  await openCapture(page, ROOT, await renderDashboard(browser));
  await dragCrop(page, [0.02, 0.02], [0.98, 0.98]);
  await page.getByRole('button', { name: '识别所选区域' }).click();
  const rejected = page.getByTestId('ocr-rejected');
  await expect(rejected).toBeVisible({ timeout: 60_000 });
  await expect(rejected).toContainText(/多个数字|缩小/);
  await expect(page.getByLabel('总里程（公里）')).toHaveValue('');
});

test('可修正候选值；取消识别保留原表单', async ({ page, browser }) => {
  await prepareOcrFromHome(page, ROOT);
  const image = await renderDashboard(browser);
  await openCapture(page, ROOT, image);
  await page.getByLabel('总里程（公里）').fill('11111');
  await page.getByLabel('金额（元）').fill('300');
  await cropTop(page);
  await page.getByRole('button', { name: '识别所选区域' }).click();
  await expect(page.getByTestId('ocr-candidate')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: '关闭' }).click();
  await expect(page.getByLabel('总里程（公里）')).toHaveValue('11111');
  await expect(page.getByLabel('金额（元）')).toHaveValue('300');

  await page.getByRole('button', { name: '拍照识别' }).click();
  await page.getByTestId('album-input').setInputFiles({ name: 'dash.png', mimeType: 'image/png', buffer: image });
  await cropTop(page);
  await page.getByRole('button', { name: '识别所选区域' }).click();
  const candidate = page.getByTestId('ocr-candidate');
  await expect(candidate).toBeVisible({ timeout: 60_000 });
  await candidate.getByLabel('核对识别出的总里程').fill('58321.5');
  await candidate.getByRole('button', { name: '采用' }).click();
  await expect(candidate.getByText('请输入不含小数的非负整数公里数')).toBeVisible();
  await candidate.getByLabel('核对识别出的总里程').fill('58321');
  await candidate.getByRole('button', { name: '采用' }).click();
  await expect(page.getByLabel('总里程（公里）')).toHaveValue('58321');

  await page.getByRole('button', { name: '保存加油记录' }).click();
  await expect(page.getByText('已保存记录')).toBeVisible();
  expect((await readStoredRecords(page))[0]).toMatchObject({ odometerKm: 58321, amountFen: 30000 });
});

test('无法读取的图片明确报错，手输仍可保存', async ({ page }) => {
  await page.goto(`${ROOT}#/fuel/new`);
  await page.getByRole('button', { name: '拍照识别' }).click();
  await expect(page.getByText('如果无法打开相机（未授权或浏览器不支持），请从相册选择照片，或直接手动输入。')).toBeVisible();
  await page.getByTestId('album-input').setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') });
  await expect(page.getByText('无法读取这张图片')).toBeVisible();
  await page.getByRole('button', { name: '改为手动输入' }).click();
  await page.getByLabel('总里程（公里）').fill('60000');
  await page.getByLabel('金额（元）').fill('100');
  await page.getByRole('button', { name: '保存加油记录' }).click();
  await expect(page.getByText('已保存记录')).toBeVisible();
});

test('无数字的模糊图片提示识别失败而不是零', async ({ page, browser }) => {
  await prepareOcrFromHome(page, ROOT);
  const blank = await (async () => {
    const p = await browser.newPage({ viewport: { width: 800, height: 500 } });
    await p.setContent('<body style="margin:0;background:linear-gradient(#ddd,#999)"></body>');
    const png = await p.screenshot();
    await p.close();
    return png;
  })();
  await openCapture(page, ROOT, blank);
  await page.getByRole('button', { name: '识别所选区域' }).click();
  await expect(page.getByTestId('ocr-rejected')).toContainText('未能识别出数字', { timeout: 60_000 });
  await expect(page.getByLabel('总里程（公里）')).toHaveValue('');
});

test('识别中取消、更换图片和离开表单后旧结果无效，worker 与临时图片被清理', async ({ page, browser }) => {
  await trackResources(page);
  await prepareOcrFromHome(page, ROOT);
  const first = await renderDashboard(browser, 'ODO 11111 km');
  const second = await renderDashboard(browser, 'ODO 58320 km');

  // Cancel while recognizing.
  await openCapture(page, ROOT, first);
  await cropTop(page);
  await page.getByRole('button', { name: '识别所选区域' }).click();
  await page.getByRole('button', { name: '取消识别' }).click();
  await expect(page.getByRole('button', { name: '识别所选区域' })).toBeVisible();
  await page.waitForTimeout(4000);
  await expect(page.getByTestId('ocr-candidate')).toHaveCount(0);
  await expect(page.getByLabel('总里程（公里）')).toHaveValue('');

  // Replace the photo while the first recognition is still running.
  await page.getByRole('button', { name: '识别所选区域' }).click();
  await expect(page.getByText(/正在本机识别/)).toBeVisible();
  await page.getByTestId('album-input').setInputFiles({ name: 'second.png', mimeType: 'image/png', buffer: second });
  await page.waitForTimeout(4000);
  await expect(page.getByTestId('ocr-candidate')).toHaveCount(0);
  await cropTop(page);
  await page.getByRole('button', { name: '识别所选区域' }).click();
  await expect(page.getByTestId('ocr-candidate')).toContainText('58320', { timeout: 60_000 });
  await page.getByTestId('ocr-candidate').getByRole('button', { name: '采用' }).click();
  await expect(page.getByLabel('总里程（公里）')).toHaveValue('58320');

  // Leave the form while recognizing.
  await page.getByRole('button', { name: '拍照识别' }).click();
  await page.getByTestId('album-input').setInputFiles({ name: 'first.png', mimeType: 'image/png', buffer: first });
  await cropTop(page);
  await page.getByRole('button', { name: '识别所选区域' }).click();
  await page.goto(`${ROOT}#/history`);
  await page.waitForTimeout(4000);
  await page.goto(`${ROOT}#/fuel/new`);
  await expect(page.getByLabel('总里程（公里）')).toHaveValue('');

  await expect
    .poll(async () => {
      const s = await resourceStats(page);
      return { active: s.created - s.terminated, liveUrls: s.liveUrls };
    })
    .toEqual({ active: 0, liveUrls: 0 });
  expect((await resourceStats(page)).created).toBeGreaterThanOrEqual(4);
});

test('资源完整缓存后断网仍能识别；资源被清除且离线时提示并可手输保存', async ({ page, context, browser }) => {
  const image = await renderDashboard(browser);
  await page.goto(ROOT);
  await expect(page.getByTestId('offline-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await prepareOcrFromHome(page, ROOT);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('ocr-status')).toHaveAttribute('data-state', 'ready');
  await openCapture(page, ROOT, image);
  await cropTop(page);
  await page.getByRole('button', { name: '识别所选区域' }).click();
  await expect(page.getByTestId('ocr-candidate')).toContainText('58320', { timeout: 60_000 });

  // Simulate the browser evicting the OCR cache.
  await page.evaluate(async () => {
    for (const key of await caches.keys()) if (key.startsWith('carkeeper-ocr-')) await caches.delete(key);
  });
  await page.goto(ROOT);
  await expect(page.getByTestId('ocr-status')).toHaveAttribute('data-state', 'missing');

  await openCapture(page, ROOT, image);
  await cropTop(page);
  await page.getByRole('button', { name: '识别所选区域' }).click();
  await expect(page.getByText('识别资源尚未下载，且当前处于离线状态')).toBeVisible();
  await expect(page.getByTestId('ocr-candidate')).toHaveCount(0);
  await page.getByRole('button', { name: '改为手动输入' }).click();
  await page.getByLabel('总里程（公里）').fill('58320');
  await page.getByLabel('金额（元）').fill('200');
  await page.getByRole('button', { name: '保存加油记录' }).click();
  await expect(page.getByText('已保存记录')).toBeVisible();
  expect(await readStoredRecords(page)).toHaveLength(1);
  await context.setOffline(false);
});
