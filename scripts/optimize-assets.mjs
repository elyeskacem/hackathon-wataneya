// Converts the raw renders in assets/renders into web-ready WebP files in public/renders.
// Crops the Blender viewport gizmo baked into some renders and cuts the TV out of its studio background.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'assets/renders';
const OUT = 'public/renders';

// crop values are fractions of the source image to remove from each side.
const JOBS = [
// The lobby backdrop and the TV are no longer renders: see build-salon.mjs and build-models.mjs.
  { src: 'chofli hal3 1.png', out: 'choufli-office', width: 1920, crop: { left: 0.02, right: 0.05, bottom: 0.015 } },
  { src: 'chof li hal 4 1.png', out: 'choufli-corridor', width: 1920, crop: { right: 0.05, bottom: 0.015 } },
  { src: 'CHOF LI HAL7 1.png', out: 'choufli-kitchen', width: 1920, crop: { right: 0.05, bottom: 0.015 } },
  { src: 'chofli hal 9.png', out: 'choufli-salon', width: 1920 },
  { src: 'stage kalthom 1.png', out: 'kalthoum-hall', width: 2048 },
  { src: 'sliman  _he is charecter from chofli hal_.png', out: 'char-sliman', height: 1200, trim: true },
  { src: 'sbou3i 1.png', out: 'char-sbou3i', height: 1000, trim: true },
  { src: 'om_kalthoum 1.png', out: 'char-om-kalthoum', height: 800, trim: true },
];

async function cropped(file, crop = {}) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const left = Math.round((crop.left ?? 0) * width);
  const top = Math.round((crop.top ?? 0) * height);
  const w = width - left - Math.round((crop.right ?? 0) * width);
  const h = height - top - Math.round((crop.bottom ?? 0) * height);
  return img.extract({ left, top, width: w, height: h });
}

// The studio background is too close in tone to the TV body for a colour key, so the silhouette
// is traced by hand (source pixels, 1280x960) and applied as a feathered mask.
const TV_SILHOUETTE = [
  [[357, 220], [845, 244], [845, 615], [835, 680], [815, 692], [732, 720], [732, 765], [695, 772],
    [600, 740], [397, 688], [394, 665], [402, 638], [356, 630], [353, 612], [353, 230]],
  [[714, 805], [800, 780], [896, 818], [898, 842], [822, 880], [714, 842]],
];

async function cutout(file) {
  const { width, height } = await sharp(file).metadata();
  const paths = TV_SILHOUETTE.map((poly) => `<polygon points="${poly.map((p) => p.join(',')).join(' ')}"/>`).join('');
  const mask = await sharp(Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g fill="#fff">${paths}</g></svg>`))
    // Erode ~3 px (blur + high threshold) so no studio floor survives at the edges, then feather.
    .blur(3).threshold(235).blur(1.2).extractChannel(0).toBuffer();
  const rgb = await sharp(file).removeAlpha().toBuffer();
  return sharp(rgb).joinChannel(mask);
}

await fs.mkdir(OUT, { recursive: true });
let total = 0;
for (const job of JOBS) {
  const file = path.join(SRC, job.src);
  let img = job.cutout ? await cutout(file) : await cropped(file, job.crop);
  if (job.trim) img = sharp(await img.png().toBuffer()).trim();
  const resized = await img
    .resize({ width: job.width, height: job.height, withoutEnlargement: true })
    .webp({ quality: job.cutout || job.trim ? 86 : 80, alphaQuality: 90 })
    .toBuffer({ resolveWithObject: true });
  await fs.writeFile(path.join(OUT, `${job.out}.webp`), resized.data);
  total += resized.data.length;
  console.log(`${job.out}.webp  ${resized.info.width}x${resized.info.height}  ${(resized.data.length / 1024).toFixed(0)} KB`);
  if (job.blur) {
    const blurred = await sharp(resized.data).resize({ width: 1024 }).blur(14).modulate({ brightness: 0.55 }).webp({ quality: 70 }).toBuffer();
    await fs.writeFile(path.join(OUT, `${job.out}-blur.webp`), blurred);
    total += blurred.length;
    console.log(`${job.out}-blur.webp  ${(blurred.length / 1024).toFixed(0)} KB`);
  }
}
console.log(`total ${(total / 1024 / 1024).toFixed(2)} MB`);
