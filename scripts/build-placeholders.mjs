// Draws the placeholder backdrops (assets-src/renders/placeholder-*.svg) into web-ready WebP files in
// public/renders. They stand in for 2.5D scenes that do not exist yet and carry a "PLACEHOLDER" label
// in the picture itself; delete the SVG and its entry here when the real render arrives.
import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const JOBS = [
  { src: 'assets-src/renders/placeholder-sports-studio.svg', out: 'public/renders/placeholder-sports-studio.webp' },
  { src: 'assets-src/renders/placeholder-stadium-night.svg', out: 'public/renders/placeholder-stadium-night.webp' },
];

await mkdir('public/renders', { recursive: true });
for (const { src, out } of JOBS) {
  const info = await sharp(await readFile(src), { density: 96 }).resize({ width: 1600 }).webp({ quality: 82 }).toFile(out);
  console.log(out, `${info.width}x${info.height}`, `${(info.size / 1024).toFixed(0)} KB`);
}
