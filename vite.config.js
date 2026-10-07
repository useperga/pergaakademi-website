import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (f) => fileURLToPath(new URL(f, import.meta.url));

// Multi-page build: the landing page plus the three legal pages.
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700, // the 3D otter is lazy-loaded on purpose
    rollupOptions: {
      input: {
        main: page('./index.html'),
        kvkk: page('./kvkk.html'),
        gizlilik: page('./gizlilik.html'),
        cerez: page('./cerez-politikasi.html'),
      },
    },
  },
});
