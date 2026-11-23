import { useLayoutEffect, useRef, type PointerEvent } from 'react';
import { clampCrop, type CropRect } from '../ocr/image';

const MIN_SIZE = 0.03;

/** Drag on the photo to draw the odometer area; tiny drags keep the previous selection. */
export function CropSelector({
  image,
  rect,
  onChange,
  onReady,
  onError,
}: {
  image: ImageBitmap;
  rect: CropRect;
  onChange: (r: CropRect) => void;
  onReady: (image: ImageBitmap) => void;
  onError: (image: ImageBitmap) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; previous: CropRect } | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current!;
    try {
      if (!image.width || !image.height) throw new Error('Empty image');
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      onReady(image);
    } catch {
      onError(image);
    }
    return () => {
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [image, onReady, onError]);

  const point = (e: PointerEvent) => {
    const box = ref.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1),
      y: Math.min(Math.max((e.clientY - box.top) / box.height, 0), 1),
    };
  };

  const fromPoints = (a: { x: number; y: number }, b: { x: number; y: number }): CropRect =>
    clampCrop({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) });

  return (
    <div
      ref={ref}
      className="crop"
      data-testid="crop-area"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { ...point(e), previous: rect };
      }}
      onPointerMove={(e) => {
        if (drag.current) onChange(fromPoints(drag.current, point(e)));
      }}
      onPointerUp={(e) => {
        if (!drag.current) return;
        const next = fromPoints(drag.current, point(e));
        onChange(next.width < MIN_SIZE || next.height < MIN_SIZE ? drag.current.previous : next);
        drag.current = null;
      }}
      onPointerCancel={() => {
        if (drag.current) onChange(drag.current.previous);
        drag.current = null;
      }}
    >
      <canvas ref={canvasRef} role="img" aria-label="仪表盘照片" data-testid="crop-preview" />
      <div
        className="crop-box"
        data-testid="crop-box"
        style={{
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.width * 100}%`,
          height: `${rect.height * 100}%`,
        }}
      />
    </div>
  );
}
