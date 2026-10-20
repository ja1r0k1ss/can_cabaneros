import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered explicitly in src/main.tsx
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Can Cabañeros',
        short_name: 'Cabañeros',
        lang: 'es',
        theme_color: '#f7f6f0',
        background_color: '#f7f6f0',
        display: 'standalone',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    }),
  ],
})
