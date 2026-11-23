// Generates the PWA icons (a white gauge on a blue background) without image dependencies.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Shape test in normalized coordinates (0..1); `scale` shrinks the glyph for maskable safe zones.
function isGlyph(x, y, scale) {
  const cx = 0.5, cy = 0.56;
  const dx = (x - cx) / scale, dy = (y - cy) / scale;
  const r = Math.hypot(dx, dy);
  const angle = Math.atan2(-dy, dx);
  const arc = r > 0.26 && r < 0.33 && angle > -0.6 && angle < Math.PI + 0.6;
  const hub = r < 0.055;
  const needleAngle = Math.PI / 4;
  const along = dx * Math.cos(needleAngle) - dy * Math.sin(needleAngle);
  const across = dx * Math.sin(needleAngle) + dy * Math.cos(needleAngle);
  const needle = along > 0 && along < 0.24 && Math.abs(across) < 0.028;
  return arc || hub || needle;
}

function render(size, { rounded, scale }) {
  const px = Buffer.alloc(size * size * 4);
  const samples = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0, fg = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const nx = (x + (sx + 0.5) / samples) / size;
          const ny = (y + (sy + 0.5) / samples) / size;
          const radius = 0.18;
          const qx = Math.max(radius - nx, 0, nx - (1 - radius));
          const qy = Math.max(radius - ny, 0, ny - (1 - radius));
          const inside = !rounded || Math.hypot(qx, qy) <= radius;
          if (!inside) continue;
          bg++;
          if (isGlyph(nx, ny, scale)) fg++;
        }
      }
      const total = samples * samples;
      const i = (y * size + x) * 4;
      const t = bg ? fg / bg : 0;
      px[i] = Math.round(0x1e + (255 - 0x1e) * t);
      px[i + 1] = Math.round(0x6f + (255 - 0x6f) * t);
      px[i + 2] = Math.round(0xd9 + (255 - 0xd9) * t);
      px[i + 3] = Math.round((255 * bg) / total);
    }
  }
  return encodePng(size, px);
}

writeFileSync(join(outDir, 'icon-192.png'), render(192, { rounded: true, scale: 1 }));
writeFileSync(join(outDir, 'icon-512.png'), render(512, { rounded: true, scale: 1 }));
writeFileSync(join(outDir, 'icon-maskable-512.png'), render(512, { rounded: false, scale: 0.75 }));
console.log(`Icons written to ${outDir}`);
