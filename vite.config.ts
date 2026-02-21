import { defineConfig } from 'vite';
import { resolve } from 'path';
import { tmpdir } from 'os';

export default defineConfig({
  base: './',
  cacheDir: resolve(tmpdir(), 'vite-zulugrid'),
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
