import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const SCENES_DIR = resolve('public/models/scenes');
const EXPERIENCES_DIR = resolve('public/experiences');

/**
 * `virtual:scenes3d` lists the real 3D content the team has delivered, so the app can fall back to the
 * 2.5D renders for every moment that has none (see docs/3D-HANDOFF.md). It is read from disk at dev
 * start and at build, and the dev server reloads when a file appears or disappears.
 *  - glb:   public/models/scenes/<moment-id>.glb (made by `npm run assets:models`)
 *  - unity: public/experiences/<moment-id>/index.html (a Unity WebGL build)
 */
function scenes3d(): Plugin {
  const id = 'virtual:scenes3d';
  const resolved = `\0${id}`;
  const scan = () => ({
    glb: existsSync(SCENES_DIR) ? readdirSync(SCENES_DIR).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4)) : [],
    unity: existsSync(EXPERIENCES_DIR)
      ? readdirSync(EXPERIENCES_DIR, { withFileTypes: true })
          .filter((d) => d.isDirectory() && existsSync(resolve(EXPERIENCES_DIR, d.name, 'index.html')))
          .map((d) => d.name)
      : [],
  });
  return {
    name: 'wataniya-scenes3d',
    resolveId: (source) => (source === id ? resolved : null),
    load: (source) => {
      if (source !== resolved) return null;
      const { glb, unity } = scan();
      return `export const glb = ${JSON.stringify(glb.sort())};\nexport const unity = ${JSON.stringify(unity.sort())};`;
    },
    configureServer(server) {
      const refresh = (file: string) => {
        const path = file.replace(/\\/g, '/');
        if (!path.includes('/public/models/scenes/') && !path.includes('/public/experiences/')) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh).on('unlink', refresh);
    },
  };
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), scenes3d()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
