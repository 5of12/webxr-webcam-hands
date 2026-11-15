import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'lib',
    emptyOutDir: true,
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    rollupOptions: {
      external: ['three', 'iwer', '@mediapipe/tasks-vision', /^iwer\//],
    },
  },
});
