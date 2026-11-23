import { useRef, type PointerEvent } from 'react';
import { clampCrop, type CropRect } from '../ocr/image';

const MIN_SIZE = 0.03;

/** Drag on the photo to draw the odometer area; tiny drags keep the previous selection. */
export function CropSelector({ src, rect, onChange }: { src: string; rect: CropRect; onChange: (r: CropRect) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; previous: CropRect } | null>(null);

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
      <img src={src} alt="仪表盘照片" draggable={false} />
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
