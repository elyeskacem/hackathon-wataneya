import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { asset } from '../data/moments';

let ktx2: KTX2Loader | null = null;

/** Loads a Meshopt + KTX2 (UASTC) GLB through R3F's cache, so Suspense and the loading % just work. */
export function useModel(url: string): GLTF {
  const gl = useThree((s) => s.gl);
  return useLoader(GLTFLoader, url, (loader) => {
    ktx2 ??= new KTX2Loader().setTranscoderPath(asset('basis/')).detectSupport(gl);
    loader.setKTX2Loader(ktx2);
    loader.setMeshoptDecoder(MeshoptDecoder);
  });
}

export const MODEL_URLS = { tv: asset('models/tv.glb'), cassette: asset('models/cassette.glb') };
