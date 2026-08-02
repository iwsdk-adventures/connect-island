import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { iwsdkDev } from '@iwsdk/vite-plugin-dev';
import { build as esbuild } from 'esbuild';
import { defineConfig, type Plugin } from 'vite';

const require = createRequire(import.meta.url);

/**
 * Makes the MSDF font-atlas worker survive a production build.
 *
 * IWSDK builds the worker's URL separately from the `new Worker(url, { type:
 * 'module' })` that consumes it. Vite only bundles a worker when it can see
 * both halves in one expression, so instead it treats the URL as a plain asset
 * reference and copies `@zappar/msdf-generator/dist/worker.js` through
 * verbatim - bare `import { expose, transfer } from "comlink"` and all. No
 * browser can resolve a bare specifier in a module worker, so the worker fails
 * to load about 3ms after construction.
 *
 * That failure is silent in a way that is worth spelling out: the `error` event
 * on a Worker whose module graph failed to resolve carries an empty message, no
 * filename and no line, and nothing reaches the console. Downstream, the font
 * atlas never arrives, the UIKitML panels never finish loading, and the
 * `World.create()` promise simply never settles - the canvas stays empty and
 * the landing page never gets its buttons.
 *
 * Dev never showed it because Vite's dev server rewrites bare specifiers on the
 * fly; the worker there pulls `comlink.mjs` over HTTP and runs fine.
 *
 * The fix is to bundle the worker ourselves, and to emit the Emscripten wasm
 * alongside it. The wasm is a second, latent instance of the same class of
 * problem: it is named by a runtime string through Emscripten's `locateFile`,
 * so Rollup cannot see that dependency either and never emits the file. It is
 * resolved against the worker's own script directory, which is why it has to
 * land next to the worker in `assets/`.
 */
function msdfWorker(): Plugin {
  const entry = require.resolve('@zappar/msdf-generator/worker.js');
  const wasm = require.resolve('@zappar/msdf-generator/msdfgen_wasm.wasm');

  return {
    name: 'connect-island:msdf-worker',
    apply: 'build',
    async generateBundle(_options, bundle) {
      let patched = 0;
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset') {
          continue;
        }
        const source =
          typeof file.source === 'string'
            ? file.source
            : Buffer.from(file.source).toString('utf8');
        // The copied-through worker, identified by content rather than by its
        // hashed filename.
        if (!source.includes('msdfgen_wasm') || !source.includes('comlink')) {
          continue;
        }
        const bundled = await esbuild({
          entryPoints: [entry],
          bundle: true,
          format: 'esm',
          target: 'esnext',
          write: false,
        });
        file.source = bundled.outputFiles[0].text;
        patched += 1;
      }
      if (patched === 0) {
        this.warn(
          'MSDF worker asset not found - IWSDK may now bundle it itself, in ' +
            'which case connect-island:msdf-worker can be removed.',
        );
      }
      this.emitFile({
        type: 'asset',
        fileName: 'assets/msdfgen_wasm.wasm',
        source: readFileSync(wasm),
      });
    },
  };
}

export default defineConfig({
  plugins: [iwsdkDev(), msdfWorker()],
  server: { host: '0.0.0.0', port: 8081, open: false },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'esnext',
    rollupOptions: { input: './index.html' },
  },
  esbuild: { target: 'esnext' },
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
    esbuildOptions: { target: 'esnext' },
  },
  publicDir: 'public',
  base: './',
});
