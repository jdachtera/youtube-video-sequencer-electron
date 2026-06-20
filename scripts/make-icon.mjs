// Generates the MegaRack app icon (buildResources/icon.png) procedurally — no
// native deps. Draws a dark rounded "squircle" tile with three orange fader
// rails (a mixer/rack motif), supersampled for smooth edges, and writes a
// straight-alpha 1024x1024 RGBA PNG. electron-builder derives .icns/.ico from it.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const N = 1024; // output size
const SS = 4; // supersampling factor per axis

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Rounded-rect signed distance (<= 0 inside), corner radius rc.
const roundedRectDist = (x, y, x0, y0, x1, y1, rc) => {
  const nx = clamp(x, x0 + rc, x1 - rc);
  const ny = clamp(y, y0 + rc, y1 - rc);
  return Math.hypot(x - nx, y - ny) - rc;
};

// Tile geometry (in 1024 space).
const margin = 80;
const x0 = margin;
const y0 = margin;
const x1 = N - margin;
const y1 = N - margin;
const tileR = (x1 - x0) * 0.2237; // Big Sur-ish corner radius

const bgTop = [44, 44, 48];
const bgBottom = [15, 15, 17];
const railGray = [74, 74, 80];
const orange = [255, 145, 0];
const outlineDark = [18, 18, 20];
const sheen = [255, 190, 110];

// Three fader rails: [centerY, knobX]; fill is orange up to the knob.
const railLeft = 250;
const railRight = N - 250;
const railHalf = 22;
const knobR = 60;
const outlineW = 8;
const rails = [
  { cy: 372, knobX: 372 },
  { cy: 512, knobX: 636 },
  { cy: 652, knobX: 470 },
];

// Color (opaque) at a sub-sample point, or null if outside the tile.
const sampleColor = (x, y) => {
  if (roundedRectDist(x, y, x0, y0, x1, y1, tileR) > 0) return null;

  // Base: vertical gradient.
  const t = clamp((y - y0) / (y1 - y0), 0, 1);
  let r = lerp(bgTop[0], bgBottom[0], t);
  let g = lerp(bgTop[1], bgBottom[1], t);
  let b = lerp(bgTop[2], bgBottom[2], t);

  for (const { cy, knobX } of rails) {
    // Rail capsule.
    if (roundedRectDist(x, y, railLeft, cy - railHalf, railRight, cy + railHalf, railHalf) <= 0) {
      const filled = x <= knobX;
      [r, g, b] = filled ? orange : railGray;
    }
    // Knob (outline ring + orange fill + sheen) drawn on top.
    const d = Math.hypot(x - knobX, y - cy);
    if (d <= knobR + outlineW) {
      if (d > knobR) {
        [r, g, b] = outlineDark;
      } else {
        [r, g, b] = orange;
        const hd = Math.hypot(x - (knobX - 0.22 * knobR), y - (cy - 0.22 * knobR));
        if (hd < 0.55 * knobR) {
          const k = (1 - hd / (0.55 * knobR)) * 0.5;
          r = lerp(r, sheen[0], k);
          g = lerp(g, sheen[1], k);
          b = lerp(b, sheen[2], k);
        }
      }
    }
  }
  return [r, g, b];
};

// Render with supersampling → straight-alpha RGBA.
const data = Buffer.alloc(N * N * 4);
const inv = 1 / (SS * SS);
for (let py = 0; py < N; py++) {
  for (let px = 0; px < N; px++) {
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let sa = 0; // sum of 255 over opaque sub-samples
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const c = sampleColor(px + (sx + 0.5) / SS, py + (sy + 0.5) / SS);
        if (c) {
          sr += c[0];
          sg += c[1];
          sb += c[2];
          sa += 255;
        }
      }
    }
    const o = (py * N + px) * 4;
    const a = sa * inv;
    if (sa > 0) {
      // Un-premultiply (sum is over opaque samples only).
      data[o] = clamp(Math.round((sr * 255) / sa), 0, 255);
      data[o + 1] = clamp(Math.round((sg * 255) / sa), 0, 255);
      data[o + 2] = clamp(Math.round((sb * 255) / sa), 0, 255);
    }
    data[o + 3] = Math.round(a);
  }
}

// --- Minimal PNG encoder (RGBA, 8-bit) ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, body) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, body])), 0);
  return Buffer.concat([len, typeBuf, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(N, 0);
ihdr.writeUInt32BE(N, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
// 10..12 = 0 (compression/filter/interlace)

// Raw scanlines, each prefixed with filter byte 0.
const raw = Buffer.alloc(N * (N * 4 + 1));
for (let y = 0; y < N; y++) {
  raw[y * (N * 4 + 1)] = 0;
  data.copy(raw, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'buildResources', 'icon.png');
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes, ${N}x${N})`);
