import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// @ts-expect-error plain ESM helper without type declarations
import { getOcrAssetInfo } from './scripts/ocr-assets.mjs';

const base = process.env.BASE_PATH ?? '/';
const ocrAssets = getOcrAssetInfo();
const ocrCacheName = `carkeeper-ocr-${ocrAssets.version}`;

export default defineConfig({
  base,
  define: {
    __OCR_ASSETS__: JSON.stringify(ocrAssets),
    __OCR_CACHE_NAME__: JSON.stringify(ocrCacheName),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png'],
      manifest: {
        name: '爱车记录',
        short_name: '爱车记录',
        description: '记录汽车保养与加油信息，数据仅保存在本机',
        lang: 'zh-CN',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f6f9',
        theme_color: '#1e6fd9',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        globIgnores: ['ocr/**'],
        cleanupOutdatedCaches: true,
        // Control the first visit immediately; updates still wait for the user (no skipWaiting).
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /\/ocr\//,
            handler: 'CacheFirst',
            options: {
              cacheName: ocrCacheName,
              matchOptions: { ignoreVary: true },
            },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
