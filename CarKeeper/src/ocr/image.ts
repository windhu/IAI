/** Normalized crop rectangle; all values are fractions (0..1) of the displayed image. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_CROP: CropRect = { x: 0.15, y: 0.4, width: 0.7, height: 0.2 };

export class ImageDecodeError extends Error {
  constructor() {
    super('无法读取这张图片，请换一张照片或手动输入总里程。');
    this.name = 'ImageDecodeError';
  }
}

/** Decodes the photo with its EXIF orientation applied so crops match what the user sees. */
export async function decodeImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageDecodeError();
  }
}

export function clampCrop(rect: CropRect): CropRect {
  const x = Math.min(Math.max(rect.x, 0), 1);
  const y = Math.min(Math.max(rect.y, 0), 1);
  return { x, y, width: Math.min(Math.max(rect.width, 0), 1 - x), height: Math.min(Math.max(rect.height, 0), 1 - y) };
}

/** Pixel area of the source image covered by the crop. */
export function cropToPixels(rect: CropRect, width: number, height: number) {
  const r = clampCrop(rect);
  const sx = Math.round(r.x * width);
  const sy = Math.round(r.y * height);
  return {
    sx,
    sy,
    sw: Math.max(1, Math.min(width - sx, Math.round(r.width * width))),
    sh: Math.max(1, Math.min(height - sy, Math.round(r.height * height))),
  };
}

/** Crops, scales to an OCR-friendly size and converts to grayscale PNG. */
export async function cropForOcr(bitmap: ImageBitmap, rect: CropRect): Promise<Blob> {
  const { sx, sy, sw, sh } = cropToPixels(rect, bitmap.width, bitmap.height);
  const scale = Math.min(1600 / sw, Math.max(1, 120 / sh), 4);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageDecodeError();
  ctx.filter = 'grayscale(1)';
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new ImageDecodeError();
  return blob;
}
