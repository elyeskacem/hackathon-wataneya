// Step 1 of build-models: bake the Sketchfab node transforms into the mesh, set the TV on y = 0,
// centre it on x/z and normalise the width to 1 unit (the scene scales it to the cabinet).
import { NodeIO } from '@gltf-transform/core';
import { flatten, clearNodeTransform, getBounds, transformMesh } from '@gltf-transform/functions';
export async function bakeTv(file) {
  const doc = await new NodeIO().read(file);
  await doc.transform(flatten());
  for (const n of doc.getRoot().listNodes()) if (n.getMesh()) clearNodeTransform(n);
  const { min, max } = getBounds(doc.getRoot().listScenes()[0]);
  const s = 1 / (max[0] - min[0]);
  const m = [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, -((min[0] + max[0]) / 2) * s, -min[1] * s, -((min[2] + max[2]) / 2) * s, 1];
  for (const mesh of doc.getRoot().listMeshes()) transformMesh(mesh, m);
  return doc;
}
if (process.argv[1].endsWith('bake-tv.mjs')) {
  const doc = await bakeTv('assets-src/models/tv.glb');
  await new NodeIO().write('public/models/_tv-debug.glb', doc);
}
