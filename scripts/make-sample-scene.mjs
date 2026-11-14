// Writes a placeholder scene GLB that uses every marker of docs/3D-HANDOFF.md, so the 3D team can open it in
// Blender to see the naming, and so the pipeline can be tried before the real scenes exist.
//   node scripts/make-sample-scene.mjs [moment-id]      -> assets-src/models/scenes/_sample-<moment-id>.glb
// The leading "_" keeps `npm run assets:scenes` from building it. To see it in the app, copy it to
// assets-src/models/scenes/<moment-id>.glb and run `npm run assets:scenes`.
import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const momentId = process.argv[2] ?? 'choufli-hal';
const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('Scene');

// A 1024 px checker so the KTX2 step has something to encode.
const squares = Array.from({ length: 64 }, (_, i) => ((i % 8) + Math.floor(i / 8)) % 2 === 0 ? `<rect x="${(i % 8) * 128}" y="${Math.floor(i / 8) * 128}" width="128" height="128" fill="#6d5a40"/>` : '').join('');
const checker = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#b79b72"/>${squares}</svg>`)).png().toBuffer();
const texture = doc.createTexture('checker').setImage(new Uint8Array(checker)).setMimeType('image/png');
const wallMat = doc.createMaterial('walls').setBaseColorTexture(texture).setRoughnessFactor(0.9).setMetallicFactor(0);
const propMat = doc.createMaterial('props').setBaseColorFactor([0.2, 0.25, 0.3, 1]).setRoughnessFactor(0.6).setMetallicFactor(0);

/** An axis-aligned box from (x0,y0,z0) to (x1,y1,z1), faces pointing inwards when `inside` (a room). */
function box(name, material, [x0, y0, z0], [x1, y1, z1], inside) {
  const v = [];
  const idx = [];
  const faces = [
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
    [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
    [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]],
    [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
    [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]],
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
  ];
  faces.forEach((f, i) => {
    v.push(...f.flat());
    const o = i * 4;
    idx.push(...(inside ? [o, o + 2, o + 1, o, o + 3, o + 2] : [o, o + 1, o + 2, o, o + 2, o + 3]));
  });
  const uv = faces.flatMap(() => [0, 0, 4, 0, 4, 4, 0, 4]);
  const normals = new Float32Array(v.length); // flat shading is not worth the code here; the app lights by material only
  for (let i = 0; i < v.length; i += 3) normals.set([0, 1, 0], i);
  const prim = doc
    .createPrimitive()
    .setMaterial(material)
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(buffer))
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(v)).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer));
  const node = doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim));
  scene.addChild(node);
  return node;
}

/** An empty at a position; `turn` is the heading in degrees (0 looks along -Z, like a Blender camera with its default export). */
function empty(name, position, { turn = 0, extras = {}, camera = null } = {}) {
  const half = (turn * Math.PI) / 360;
  const node = doc.createNode(name).setTranslation(position).setRotation([0, Math.sin(half), 0, Math.cos(half)]);
  node.setExtras(extras);
  if (camera) node.setCamera(doc.createCamera(name).setType('perspective').setYFov(camera).setZNear(0.05).setZFar(100));
  scene.addChild(node);
  return node;
}

// Main room 6 x 3 x 5 m (x -3..3, z -5..0), a corridor next to it (x 10..13).
box('main_room', wallMat, [-3, 0, -5], [3, 3, 0], true);
box('main_tv', propMat, [-0.6, 0.6, -4.8], [0.6, 1.4, -4.4], false);
box('corridor_room', wallMat, [10, 0, -5], [13, 3, 0], true);

// Camera starts. A Camera object also sets the field of view (vertical, radians); an empty uses the default.
empty('cam_start', [0, 1.6, -0.3], { camera: 0.9 });
empty('cam_closeup', [0, 1.2, -3], { camera: 0.7 });
empty('cam_start@corridor', [11.5, 1.6, -0.3], { camera: 0.9 });

// Characters: the empty is at their feet; "height" (metres) places the talk ring above the head.
const sliman = empty('char_sliman', [-1.5, 0, -3.5], { extras: { height: 1.75 } });
sliman.addChild(doc.createNode('sliman_placeholder').setMesh(doc.createMesh('sliman_placeholder').addPrimitive(doc.getRoot().listMeshes()[1].listPrimitives()[0])).setTranslation([0, 0.9, 0]).setScale([0.5, 2.25, 0.4]));
empty('char_sbou3i@corridor', [11.5, 0, -3], { extras: { height: 1.55 } });

// Doors and hotspots. Labels are optional; "entry" is a guide knowledge id.
empty('door_corridor', [1.8, 1.1, -4]);
empty('door_main@corridor', [10.5, 1.1, -4]);
empty('hotspot_tv', [0, 1.5, -4.4], { extras: { entry: 'how-tv-works', label_ar: 'التلفزة', label_fr: 'La télé' } });
empty('hotspot_closeup', [0, 1.1, -1.5]);

mkdirSync('assets-src/models/scenes', { recursive: true });
const out = `assets-src/models/scenes/_sample-${momentId}.glb`;
await new NodeIO().write(out, doc);
console.log(`wrote ${out}`);
