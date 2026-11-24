// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { OdometerCapture } from '../src/ui/OdometerCapture';

vi.mock('../src/ocr/engine', () => ({
  checkOcrResources: vi.fn().mockResolvedValue({ ready: true }),
  startRecognition: vi.fn(() => ({
    result: Promise.resolve({
      words: [
        { text: '58,320', confidence: 40 },
        { text: '123.4', confidence: 95 },
        { text: '9007199254740992', confidence: 95 },
      ],
      durationMs: 1,
    }),
    cancel: vi.fn(),
  })),
  OcrError: class extends Error {},
}));

vi.mock('../src/ocr/image', () => ({
  DEFAULT_CROP: { x: 0, y: 0, width: 1, height: 1 },
  decodeImage: vi.fn().mockResolvedValue({ close: vi.fn() }),
  cropForOcr: vi.fn().mockResolvedValue(new Blob()),
}));

vi.mock('../src/ui/CropSelector', async () => {
  const { useEffect } = await import('react');
  return {
    CropSelector: ({ image, onReady }: { image: ImageBitmap; onReady: (image: ImageBitmap) => void }) => {
      useEffect(() => onReady(image), [image, onReady]);
      return null;
    },
  };
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  document.body.replaceChildren();
});

it('allows an explicitly selected low-confidence integer but not decimal or unsafe readings', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const onAccept = vi.fn();
  await act(async () => root.render(createElement(OdometerCapture, { onAccept, onClose: vi.fn() })));

  const fileInput = container.querySelector<HTMLInputElement>('[data-testid="album-input"]')!;
  Object.defineProperty(fileInput, 'files', { value: [new File(['photo'], 'dash.jpg', { type: 'image/jpeg' })] });
  await act(async () => fileInput.dispatchEvent(new Event('change', { bubbles: true })));
  const button = (text: string) => Array.from(container.querySelectorAll('button')).find((element) => element.textContent?.includes(text))!;
  await act(async () => button('识别所选区域').click());

  const choices = container.querySelector('[data-testid="ocr-choices"]')!;
  expect(choices.textContent).toContain('123.4（小数或无效数字，不能直接采用）');
  expect(choices.textContent).toContain('9007199254740992（小数或无效数字，不能直接采用）');
  expect(choices.querySelectorAll('.ocr-choice')).toHaveLength(1);
  expect(container.querySelector('[aria-label="核对识别出的总里程"]')).toBeNull();
  const low = button('58,320');
  expect(low.textContent).toContain('可信度低');
  await act(async () => low.click());
  expect(container.querySelector<HTMLInputElement>('[aria-label="核对识别出的总里程"]')?.value).toBe('58320');
  expect(onAccept).not.toHaveBeenCalled();
  await act(async () => button('采用').click());
  expect(onAccept).toHaveBeenCalledWith(58320);
  await act(async () => root.unmount());
});
