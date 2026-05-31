import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ALLOWED_HOST = /^c\d+\.pcloud\.com$/

// Mirror the Vercel /api/pcloud-dl serverless function as a Vite dev middleware
// so that `npm run dev` can also load songs from pCloud without CORS errors.
function pcloudProxyPlugin() {
  return {
    name: 'pcloud-proxy',
    configureServer(server) {
      server.middlewares.use('/api/pcloud-dl', async (req, res) => {
        const qs = new URLSearchParams(req.url.replace(/^[^?]*/, ''))
        const url = qs.get('url')
        let valid = false
        try {
          const parsed = new URL(url)
          valid = parsed.protocol === 'https:' && ALLOWED_HOST.test(parsed.hostname)
        } catch {}
        if (!valid) {
          res.writeHead(403, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'url not allowed' }))
          return
        }
        try {
          const upstream = await fetch(url)
          const body = await upstream.text()
          res.writeHead(upstream.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          res.end(body)
        } catch (err) {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), pcloudProxyPlugin()],
})
