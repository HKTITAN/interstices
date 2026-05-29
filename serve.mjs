// Static server for the downloaded page. Adds the two Next.js behaviours a
// plain file server can't:
//   • /_next/image?url=…  → 302 to the real source image (the optimizer endpoint)
//   • *?_rsc=… and /api/… → 204 (route prefetch + analytics; harmless no-op)
//   • /gallery/moments     → gallery/moments/index.html
//
// No dependencies. Run:  node serve.mjs   (or: npm start)

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 8123

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
}

async function resolve(p) {
  try {
    const s = await stat(p)
    if (s.isFile()) return p
    if (s.isDirectory()) {
      const idx = join(p, 'index.html')
      if ((await stat(idx)).isFile()) return idx
    }
  } catch {}
  return null
}

createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = decodeURIComponent(u.pathname)

  if (pathname === '/_next/image') {
    const target = u.searchParams.get('url')
    if (target) {
      res.writeHead(302, { Location: target })
      return res.end()
    }
  }
  if (u.searchParams.has('_rsc') || pathname.startsWith('/api/')) {
    res.writeHead(204)
    return res.end()
  }

  let file =
    (await resolve(join(ROOT, pathname))) ||
    (await resolve(join(ROOT, pathname, 'index.html')))
  if (!file && (pathname === '/' || !extname(pathname))) {
    file = await resolve(join(ROOT, 'gallery', 'moments', 'index.html'))
  }
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('404')
  }

  try {
    const body = await readFile(file)
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    })
    res.end(body)
  } catch {
    res.writeHead(500)
    res.end('500')
  }
}).listen(PORT, () =>
  console.log(`→ http://localhost:${PORT}/gallery/moments`),
)
