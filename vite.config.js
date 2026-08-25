import { defineConfig } from 'vite';

export default defineConfig({
  // Vite's default publicDir is "public"; build output is also "public",
  // so static copy-as-is assets live in "static" instead.
  publicDir: 'static',
  build: {
    outDir: 'public',
    emptyOutDir: true,
    // Keep stable filenames so the service worker precache list stays valid.
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});
