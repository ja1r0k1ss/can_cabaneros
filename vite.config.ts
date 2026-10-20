import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Serves api/*.ts (Vercel functions) under `npm run dev`, so the importer works locally without `vercel dev` */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      // GROQ_API_KEY / ANTHROPIC_API_KEY from .env.local (gitignored), like Vercel's project env vars in production
      for (const [k, v] of Object.entries(loadEnv(server.config.mode, process.cwd(), ''))) process.env[k] ??= v
      server.middlewares.use('/api/parse-video', async (req, res) => {
        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const mod = await server.ssrLoadModule('/api/parse-video.ts')
          const handler = mod[req.method ?? 'GET'] as ((r: Request) => Promise<Response>) | undefined
          if (!handler) {
            res.statusCode = 405
            res.end()
            return
          }
          const response = await handler(
            new Request(`http://localhost${req.originalUrl ?? req.url}`, {
              method: req.method,
              headers: req.headers as Record<string, string>,
              body: chunks.length ? Buffer.concat(chunks) : undefined,
            }),
          )
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          server.config.logger.error(String(error))
          res.statusCode = 500
          res.end()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    devApi(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered explicitly in src/main.tsx
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Can Cabañeros',
        short_name: 'Cabañeros',
        lang: 'es',
        theme_color: '#f7f6f0',
        background_color: '#556b2f', // olive splash behind the icon on launch
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          // full-bleed olive with the hat inside the safe zone, so it also works masked
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
