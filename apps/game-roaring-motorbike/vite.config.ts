import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/roaring-motorbike/',
  server: {
    port: 5174,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          tfjs: [
            '@tensorflow/tfjs-core',
            '@tensorflow/tfjs-converter',
            '@tensorflow/tfjs-backend-webgl',
            '@tensorflow-models/face-landmarks-detection',
          ],
          pixi: ['pixi.js', '@pixi/react'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
