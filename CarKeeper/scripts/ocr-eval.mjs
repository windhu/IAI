// Evaluates the shipped OCR pipeline on local dashboard photos through the real UI.
// Usage: start a preview (`npm run build; npm run preview -- --port 4173`), put photos and
// ocr-samples/samples.json in place (see docs/usage.md), then run `node scripts/ocr-eval.mjs`.
// Photos never leave this machine; ocr-samples/ is git-ignored.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, devices } from '@playwright/test';

const base = process.env.EVAL_URL ?? 'http://localhost:4173/';
const dir = 'ocr-samples';
const samples = JSON.parse(await readFile(join(dir, 'samples.json'), 'utf8'));

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
const throttle = Number(process.env.CPU_THROTTLE ?? 1);
if (throttle > 1) {
  // Only slows the page's main thread, not the OCR worker; not a substitute for a real device.
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
}
await page.goto(base);
const status = page.getByTestId('ocr-status');
if ((await status.getAttribute('data-state')) !== 'ready') {
  await status.getByRole('button', { name: '下载' }).click();
  await page.waitForSelector('[data-testid="ocr-status"][data-state="ready"]', { timeout: 120_000 });
}

const results = [];
for (const s of samples) {
  await page.goto(`${base}#/fuel/new`);
  await page.getByRole('button', { name: '拍照识别' }).click();
  await page.getByTestId('album-input').setInputFiles(join(dir, s.file));
  const area = page.getByTestId('crop-area');
  await area.waitFor();
  const box = await area.boundingBox();
  const [x0, y0, x1, y1] = s.crop;
  await page.mouse.move(box.x + box.width * x0, box.y + box.height * y0);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * x1, box.y + box.height * y1, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('button', { name: '识别所选区域' }).click();
  await page.getByTestId('ocr-duration').waitFor({ timeout: 120_000 });
  const durationMs = Number(await page.getByTestId('ocr-duration').getAttribute('data-ms'));

  let kind;
  let value = null;
  let confidence = null;
  const message = (await page.locator('.ocr-result').innerText()).replace(/\s+/g, ' ');
  if (await page.getByTestId('ocr-candidate').count()) {
    kind = 'candidate';
    value = Number(await page.getByLabel('核对识别出的总里程').inputValue());
    confidence = Number(/可信度 (\d+)%/.exec(message)?.[1]);
  } else {
    const rejected = page.getByTestId('ocr-rejected');
    kind = await rejected.getAttribute('data-kind');
    if (kind === 'low-confidence') {
      value = Number(await rejected.getAttribute('data-value'));
      confidence = Number(await rejected.getAttribute('data-confidence'));
    }
  }
  const outcome = kind === 'candidate' ? (value === s.truth ? 'correct' : 'wrong') : 'rejected';
  results.push({ id: s.id, category: s.category, truth: s.truth, expect: s.expect, kind, value, confidence, outcome, durationMs, message });
  console.log(`${s.id.padEnd(24)} ${s.category.padEnd(14)} truth=${String(s.truth).padEnd(9)} -> ${kind.padEnd(14)} value=${String(value).padEnd(9)} conf=${String(confidence).padEnd(4)} ${outcome.padEnd(8)} ${durationMs}ms`);
}

await writeFile(join(dir, 'results.json'), JSON.stringify(results, null, 2));
await browser.close();
