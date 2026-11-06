import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Phone Pong',
        short_name: 'Phone Pong',
        description: 'Description',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#317EFB',
        icons: [
          {
            src: 'icons/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'apple-icon.png',
            sizes: 'any',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
      }
    })
  ],
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@mantine/core', '@mantine/hooks'],
          three: ['three', 'three/examples/jsm/loaders/OBJLoader'],
          monaco: ['@monaco-editor/react', 'monaco-editor']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@services': resolve(__dirname, 'src/services'),
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    host: true
  },
  define: {
    'process.env': {}
  }
});