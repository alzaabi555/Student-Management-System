import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/icon.png'],
      manifest: {
        name: "مدرستي - النظام الإداري",
        short_name: "مدرستي",
        description: "نظام إدارة الغياب والتسرب المدرسي",
        theme_color: "#4f46e5",
        background_color: "#f8fafc",
        display: "standalone",
        orientation: "any",
        icons: [
          {
            src: "assets/icon.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "assets/icon.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  base: './', // Important for Electron and Capacitor to load assets correctly
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});