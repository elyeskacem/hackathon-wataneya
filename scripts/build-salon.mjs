// Lobby backdrop: AVIF + WebP at 1376 (the original width, never upscaled) and 1280, plus a tiny blur.
import sharp from 'sharp';
import { statSync } from 'node:fs';
const src = 'assets-src/renders/salon.jpg';
const { width } = await sharp(src).metadata();
for (const w of [1376, 1280].filter((w) => w <= width)) {
  const img = () => sharp(src).resize({ width: w, withoutEnlargement: true });
  await img().webp({ quality: 92, effort: 6 }).toFile(`public/renders/lobby-salon-${w}.webp`);
  await img().avif({ quality: 72, effort: 6, chromaSubsampling: '4:4:4' }).toFile(`public/renders/lobby-salon-${w}.avif`);
  for (const ext of ['webp', 'avif']) console.log(`lobby-salon-${w}.${ext}`, (statSync(`public/renders/lobby-salon-${w}.${ext}`).size / 1024).toFixed(0), 'KB');
}
await sharp(src).resize({ width: 96 }).blur(1.2).webp({ quality: 70 }).toFile('public/renders/lobby-salon-blur.webp');
console.log('source', (statSync(src).size / 1024).toFixed(0), 'KB', width, 'px');
