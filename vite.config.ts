import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'img/*.webp'],
      manifest: {
        name: 'האימונים של משה',
        short_name: 'אימונים',
        description: 'יומן אימוני כוח, אירובי קל ומעקב גוף. נתונים נשמרים במכשיר בלבד.',
        lang: 'he',
        dir: 'rtl',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f1b1c',
        theme_color: '#0f3d3e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,webp,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // עם injectRegister:false הפלאגין לא מוסיף את אלה לבד. בלעדיהם גרסה חדשה מחכה עד שכל החלונות נסגרים
        // (בטלפון עם אפליקציה מותקנת זה יכול לקחת ימים). כך היא נכנסת מיד והדף נטען מחדש (autoUpdate).
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
