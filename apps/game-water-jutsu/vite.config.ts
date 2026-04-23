import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/water-jutsu/',
  server: {
    port: 5178,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          tfjs: [
            '@tensorflow/tfjs-core',
            '@tensorflow/tfjs-converter',
            '@tensorflow/tfjs-backend-webgl',
            '@tensorflow-models/hand-pose-detection',
          ],
          three: ['three'],
          pixi: ['pixi.js', '@pixi/react'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
