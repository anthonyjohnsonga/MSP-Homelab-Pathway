import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Only the curriculum data needs an alias. @pathway/shared is a real
      // workspace dependency, so Node and Vite both resolve it the same way —
      // which is what lets code in web/ be unit tested outside a browser.
      '@data': fileURLToPath(new URL('../data', import.meta.url)),
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
