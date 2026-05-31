import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ALLOWED_API_HOSTS = new Set(['api.pcloud.com', 'eapi.pcloud.com'])
const ALLOWED_PARAMS = new Set(['auth', 'access_token'])

// Mirror the Vercel /api/pcloud-load serverless function as a Vite dev
// middleware so `npm run dev` can load pCloud files without CORS issues.
// Both getfilelink and the CDN fetch happen here (Node.js), so they share
// one IP and pCloud's CDN link-referer check passes.
function pcloudProxyPlugin() {
  return {
    name: 'pcloud-proxy',
    configureServer(server) {
      server.middlewares.use('/api/pcloud-load', async (req, res) => {
        const qs = new URLSearchParams(req.url.replace(/^[^?]*/, ''))
        const token = req.headers['authorization']
        const path = qs.get('path')
        const host = qs.get('host')
        const param = qs.get('param')

        if (!token || !path || !ALLOWED_API_HOSTS.has(host) || !ALLOWED_PARAMS.has(param)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'invalid request' }))
          return
        }
        try {
          const linkQs = new URLSearchParams({ [param]: token, path })
          const linkRes = await fetch(`https://${host}/getfilelink?${linkQs}`)
          const link = await linkRes.json()
          if (link.result !== 0) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: link.error || `pCloud error ${link.result}` }))
            return
          }
          const cdnHost = link.hosts?.[0]
          if (!cdnHost) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'no CDN host' }))
            return
          }
          const fileRes = await fetch(`https://${cdnHost}${link.path}`)
          const body = await fileRes.text()
          res.writeHead(fileRes.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
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
