#!/usr/bin/env node
/**
 * Generates minimal PNG icons for PWA install prompts (Android requires PNG).
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createGradientPng(size) {
  const width = size;
  const height = size;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  const radius = size * 0.22;

  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const i = rowStart + 1 + x * 4;
      const cx = Math.min(x, width - 1 - x);
      const cy = Math.min(y, height - 1 - y);
      const inRect = cx >= radius && cy >= radius;
      const cornerX = cx < radius ? radius - cx : 0;
      const cornerY = cy < radius ? radius - cy : 0;
      const inCorner = cornerX > 0 && cornerY > 0;
      const dist = Math.hypot(cornerX, cornerY);
      const alpha = inRect || (!inCorner || dist <= radius) ? 255 : 0;

      const t = (x + y) / (width + height);
      raw[i] = Math.round(124 * (1 - t) + 47 * t);
      raw[i + 1] = Math.round(92 * (1 - t) + 212 * t);
      raw[i + 2] = Math.round(255 * (1 - t) + 255 * t);
      raw[i + 3] = alpha;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const path = join(outDir, `icon-${size}.png`);
  writeFileSync(path, createGradientPng(size));
  console.log(`Wrote ${path}`);
}
