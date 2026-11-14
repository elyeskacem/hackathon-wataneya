// Optimises the team's GLBs: bakes the Sketchfab node transforms (cm units, odd scales), centres each
// model on x/z with its base on y = 0, normalises it to 1 unit wide, keeps one cassette, converts
// textures (the sources are 1024 px, so nothing is upscaled) to KTX2 UASTC (mipmapped, Zstd + RDO) and compresses geometry with Meshopt.
// Originals in assets-src/ are only read.
//
// Also builds the team's real scenes: assets-src/models/scenes/<moment-id>.glb -> public/models/scenes/<moment-id>.glb.
// A scene keeps its real size and position (1 unit = 1 m) and its named empties, and is checked against the
// budgets below (docs/3D-HANDOFF.md). Usage: node scripts/build-models.mjs [props|scenes]   (default: both)
import { getPixels } from 'ndarray-pixels';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { flatten, clearNodeTransform, getBounds, transformMesh, prune, dedup, meshopt, reorder, quantize } from '@gltf-transform/functions';
import { ktx2 } from 'ktx2-encoder/gltf-transform';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

// Blender exports PNG or JPEG textures; the encoder only gets bytes, so the type is read from them.
const mimeOf = (buffer) => {
  const u = new Uint8Array(buffer);
  if (u[0] === 0xff && u[1] === 0xd8) return 'image/jpeg';
  if (u[0] === 0x52 && u[1] === 0x49 && u[8] === 0x57) return 'image/webp';
  return 'image/png';
};

// The encoder needs raw RGBA. gltf-transform ships its own sharp, and a second native copy of
// sharp in the same process breaks both, so decoding goes through its ndarray-pixels.
const imageDecoder = async (buffer) => {
  const px = await getPixels(buffer, mimeOf(buffer));
  const [width, height] = px.shape;
  return { data: new Uint8Array(px.data), width, height };
};

const compress = (doc) =>
  doc.transform(
    reorder({ encoder: MeshoptEncoder }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
    ktx2({ isUASTC: true, generateMipmap: true, needSupercompression: true, enableRDO: true, rdoQualityLevel: 1.5, enableDebug: false, imageDecoder }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );

const writer = (io) => io.registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

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
  await compress(doc);
  const out = `public/models/${name}.glb`;
  await writer(io).write(out, doc);
  console.log(name, (statSync(src).size / 1e6).toFixed(2), 'MB ->', (statSync(out).size / 1e6).toFixed(2), 'MB');
}

// ---- Real scenes ----------------------------------------------------------------------------------

const SCENES_SRC = 'assets-src/models/scenes';
const SCENES_OUT = 'public/models/scenes';

/** Budgets per scene. Over "target" is a warning, over "max" fails the run (docs/3D-HANDOFF.md, section 5). */
const BUDGET = {
  triangles: { target: 120_000, max: 250_000 },
  drawCalls: { target: 120, max: 250 },
  materials: { target: 30, max: 60 },
  textures: { target: 20, max: 40 },
  textureSize: { target: 2048, max: 4096 },
  fileMB: { target: 15, max: 30 },
  sizeMetres: { min: 1.5, max: 150 },
};
const MARKER = /^(cam|char|door|hotspot)_([a-z0-9-]+)(?:@([a-z0-9]+))?$/i;
const MARKER_LIKE = /^(cam|char|door|hotspot)[_\s]/i;
const momentIds = JSON.parse(readFileSync('data/moments.json', 'utf8')).map((m) => m.id);

function inspect(doc) {
  const root = doc.getRoot();
  let triangles = 0;
  let drawCalls = 0;
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    for (const prim of mesh.listPrimitives()) {
      drawCalls++;
      const idx = prim.getIndices();
      triangles += (idx ? idx.getCount() : (prim.getAttribute('POSITION')?.getCount() ?? 0)) / 3;
    }
  }
  const textures = root.listTextures().map((t) => t.getSize() ?? [0, 0]);
  const { min, max } = getBounds(root.listScenes()[0]);
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  // Blender's duplicate suffix (.001) is ignored, like in the app.
  const markers = [];
  const bad = [];
  for (const node of root.listNodes()) {
    const raw = node.getName().replace(/\.\d{3}$/, '').replace(/\s+/g, '_');
    const m = MARKER.exec(raw);
    if (m) markers.push({ kind: m[1].toLowerCase(), name: m[2].toLowerCase(), room: (m[3] ?? 'main').toLowerCase() });
    else if (MARKER_LIKE.test(node.getName())) bad.push(node.getName());
  }
  return { triangles, drawCalls, materials: root.listMaterials().length, textures, size, markers, bad };
}

function report(id, info, fileMB) {
  const errors = [];
  const warns = [];
  const check = (label, value, b, unit = '') => {
    if (value > b.max) errors.push(`${label} ${Math.round(value)}${unit} is over the hard limit (${b.max}${unit})`);
    else if (value > b.target) warns.push(`${label} ${Math.round(value)}${unit} is over the target (${b.target}${unit})`);
  };
  check('triangles', info.triangles, BUDGET.triangles);
  check('draw calls', info.drawCalls, BUDGET.drawCalls);
  check('materials', info.materials, BUDGET.materials);
  check('textures', info.textures.length, BUDGET.textures);
  check('largest texture', Math.max(0, ...info.textures.flat()), BUDGET.textureSize, ' px');
  check('file size', fileMB, BUDGET.fileMB, ' MB');
  const longest = Math.max(...info.size);
  if (longest < BUDGET.sizeMetres.min || longest > BUDGET.sizeMetres.max) warns.push(`scene is ${longest.toFixed(2)} m across: is 1 unit = 1 m?`);
  if (!momentIds.includes(id)) warns.push(`"${id}" is not a moment id (data/moments.json), so nothing will load it`);

  const rooms = new Map();
  for (const m of info.markers) {
    const r = rooms.get(m.room) ?? { cam: [], char: [], door: [], hotspot: [] };
    rooms.set(m.room, r);
    r[m.kind].push(m.name);
  }
  if (!rooms.get('main')?.cam.includes('start')) errors.push('no cam_start in the default room (an empty or camera named exactly "cam_start")');
  for (const [room, r] of rooms) {
    if (room !== 'main' && !r.cam.includes('start')) errors.push(`room "${room}" has no cam_start@${room}`);
    for (const c of r.cam) if (!['start', 'closeup'].includes(c)) warns.push(`cam_${c}@${room}: only cam_start and cam_closeup exist`);
    for (const d of r.door) if (!rooms.get(d)?.cam.includes('start')) warns.push(`door_${d}@${room} leads to a room that has no cam_start@${d}`);
  }
  for (const b of info.bad) warns.push(`"${b}" looks like a marker but does not match kind_name[@room] (lowercase letters, digits, "-")`);

  const dims = info.size.map((v) => v.toFixed(1)).join(' x ');
  console.log(`${id}: ${Math.round(info.triangles).toLocaleString()} tris, ${info.drawCalls} draw calls, ${info.materials} materials, ${info.textures.length} textures, ${fileMB.toFixed(1)} MB, ${dims} m`);
  for (const [room, r] of rooms) console.log(`  room ${room}: cameras [${r.cam}] characters [${r.char}] doors [${r.door}] hotspots [${r.hotspot}]`);
  for (const w of warns) console.log(`  WARN  ${w}`);
  for (const e of errors) console.log(`  ERROR ${e}`);
  return errors.length === 0;
}

async function buildScene(src) {
  const id = basename(src, '.glb');
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(src);
  // Sizes and markers are read before compression, while the numbers are still the artists' own.
  const info = inspect(doc);
  // Markers are empty nodes, so prune must keep leaf nodes. Nothing is flattened, scaled or recentred.
  await doc.transform(prune({ keepLeaves: true }), dedup());
  await MeshoptEncoder.ready;
  await compress(doc);
  mkdirSync(SCENES_OUT, { recursive: true });
  const out = `${SCENES_OUT}/${id}.glb`;
  await writer(io).write(out, doc);
  const mb = statSync(out).size / 1e6;
  console.log(`\n${id}: ${(statSync(src).size / 1e6).toFixed(2)} MB -> ${mb.toFixed(2)} MB`);
  return report(id, info, mb);
}

const mode = process.argv[2] ?? 'all';
if (mode === 'all' || mode === 'props') {
  await build('tv', 'assets-src/models/tv.glb', {});
  // The cassette file holds four copies of three tapes; the scene instances one of them.
  await build('cassette', 'assets-src/models/cassette.glb', { keep: (n) => n.startsWith('Casette_1') });
}
if (mode === 'all' || mode === 'scenes') {
  // Files starting with "_" are ignored, so work in progress can sit next to the real ones.
  const sources = existsSync(SCENES_SRC) ? readdirSync(SCENES_SRC).filter((f) => f.endsWith('.glb') && !f.startsWith('_')) : [];
  if (!sources.length) console.log(`No scene GLBs in ${SCENES_SRC}/ yet: every moment keeps its 2.5D render.`);
  let ok = true;
  for (const f of sources) ok = (await buildScene(`${SCENES_SRC}/${f}`)) && ok;
  if (!ok) {
    console.error('\nAt least one scene is over a hard limit or has no cam_start; fix it before delivering.');
    process.exitCode = 1;
  }
}
