import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // The curriculum and the shared layer live outside web/, so they get
      // explicit aliases rather than a forest of ../../ imports.
      '@data': fileURLToPath(new URL('../data', import.meta.url)),
      '@shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
    },
  },

  server: {
    // Vite refuses to serve files above the project root unless told otherwise,
    // and both the curriculum data and the shared layer are above it.
    fs: { allow: [repoRoot] },
  },

  build: {
    outDir: 'dist',
    // Static Web Apps serves this directly; keep the output legible so a
    // sysadmin can see what actually shipped.
    sourcemap: true,
  },
});
