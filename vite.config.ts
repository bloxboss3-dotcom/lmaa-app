/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * GitHub Pages serves this project from a repository sub-path
 * (https://USER.github.io/REPO/) while a custom domain serves it from the root.
 * `VITE_BASE_PATH` lets both work from the same source:
 *   - GitHub Actions sets it to "/<repository-name>/"
 *   - a custom domain (or local dev) leaves it unset => "/"
 */
function normalizeBase(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (!value || value === '/') return '/'
  const withLeading = value.startsWith('/') ? value : `/${value}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = normalizeBase(env.VITE_BASE_PATH)

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // "prompt" => the app asks families before reloading to a new version.
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png', 'robots.txt'],
        manifest: {
          name: "Lee's Martial Arts Academy",
          short_name: 'LMAA',
          description:
            "Schedules, updates, events and learning resources for Lee's Martial Arts Academy families.",
          lang: 'en-US',
          dir: 'ltr',
          theme_color: '#f7f4ee',
          background_color: '#f7f4ee',
          display: 'standalone',
          orientation: 'portrait',
          categories: ['education', 'sports', 'lifestyle'],
          // Relative icon paths resolve against the manifest URL, so they keep
          // working under a GitHub Pages sub-path and under a custom domain.
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: 'icons/maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Hand-written push + notificationclick handlers, pulled into the
          // generated service worker. Kept as a separate readable file rather
          // than switching the whole SW to injectManifest for 60 lines.
          importScripts: ['push-sw.js'],
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          // Families never open the admin area and demo deployments never load
          // Supabase — precaching them would spend a parent's data on nothing.
          // They are still cached at runtime the first time staff use them.
          globIgnores: [
            '**/supabase-*.js',
            '**/supabaseRepository-*.js',
            '**/supabaseAuth-*.js',
            '**/Admin*-*.js',
            '**/collections-*.js',
          ],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          // We prompt before activating a new service worker, so never claim
          // clients behind the family's back.
          clientsClaim: false,
          skipWaiting: false,
          runtimeCaching: [
            {
              // Live content (announcements, schedule changes) must never be
              // served stale-first: always try the network, fall back to cache
              // only so the app still opens offline.
              urlPattern: ({ url }) => url.pathname.includes('/rest/v1/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'lmaa-content-v1',
                networkTimeoutSeconds: 6,
                expiration: { maxEntries: 64, maxAgeSeconds: 60 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Chunks that are deliberately not precached (admin, Supabase).
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && (request.destination === 'script' || request.destination === 'style'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'lmaa-lazy-chunks-v1',
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'lmaa-images-v1',
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Give the Supabase client a stable chunk name so the service
            // worker can recognise (and skip precaching) it.
            if (id.includes('@supabase')) return 'supabase'
            return undefined
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      include: ['src/**/*.test.{ts,tsx}'],
      alias: {
        // The PWA virtual module only exists inside a real Vite build.
        'virtual:pwa-register/react': fileURLToPath(
          new URL('./src/test/stubs/pwa-register-react.ts', import.meta.url),
        ),
      },
    },
  }
})
