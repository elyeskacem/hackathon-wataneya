// Optimises the team's GLBs: bakes the Sketchfab node transforms (cm units, odd scales), centres each
// model on x/z with its base on y = 0, normalises it to 1 unit wide, keeps one cassette, converts
// textures (the sources are 1024 px, so nothing is upscaled) to KTX2 UASTC (mipmapped, Zstd + RDO) and compresses geometry with Meshopt.
// Originals in assets-src/ are only read.
import { getPixels } from 'ndarray-pixels';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { flatten, clearNodeTransform, getBounds, transformMesh, prune, dedup, meshopt, reorder, quantize } from '@gltf-transform/functions';
import { ktx2 } from 'ktx2-encoder/gltf-transform';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { statSync } from 'node:fs';

// The encoder needs raw RGBA. gltf-transform ships its own sharp, and a second native copy of
// sharp in the same process breaks both, so decoding goes through its ndarray-pixels.
const imageDecoder = async (buffer) => {
  const px = await getPixels(buffer, 'image/png');
  const [width, height] = px.shape;
  return { data: new Uint8Array(px.data), width, height };
};

async function bake(file, { keep }) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(file);
  await doc.transform(flatten());
  const root = doc.getRoot();
  for (const n of root.listNodes()) if (n.getMesh()) clearNodeTransform(n);
  if (keep) for (const n of root.listNodes()) if (n.getMesh() && !keep(n.getName())) n.dispose();
  await doc.transform(prune());
  const { min, max } = getBounds(root.listScenes()[0]);
  const s = 1 / (max[0] - min[0]);
  const m = [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, -((min[0] + max[0]) / 2) * s, -min[1] * s, -((min[2] + max[2]) / 2) * s, 1];
  for (const mesh of root.listMeshes()) transformMesh(mesh, m);
  await doc.transform(dedup());
  return { doc, io };
}

async function build(name, src, opts) {
  const { doc, io } = await bake(src, opts);
  await MeshoptEncoder.ready;
  await doc.transform(
    reorder({ encoder: MeshoptEncoder }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
    ktx2({ isUASTC: true, generateMipmap: true, needSupercompression: true, enableRDO: true, rdoQualityLevel: 1.5, enableDebug: false, imageDecoder }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  const out = `public/models/${name}.glb`;
  await io.registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder }).write(out, doc);
  console.log(name, (statSync(src).size / 1e6).toFixed(2), 'MB ->', (statSync(out).size / 1e6).toFixed(2), 'MB');
}

await build('tv', 'assets-src/models/tv.glb', {});
// The cassette file holds four copies of three tapes; the scene instances one of them.
await build('cassette', 'assets-src/models/cassette.glb', { keep: (n) => n.startsWith('Casette_1') });
