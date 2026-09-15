import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import { listLanIPv4 } from './lan.js'
import { clearPublicOrigin, getPublicOrigin, setPublicOrigin } from './publicOrigin.js'
import { RoomManager } from './RoomManager.js'
import { authRouter, quizRouter } from './routes.js'
import { registerSocketHandlers } from './socket.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3001)
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 5173)
const DIST_DIR = join(__dirname, '..', '..', 'dist')

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'kahoot-server',
    staticFrontend: existsSync(DIST_DIR),
  })
})

app.get('/api/join-info', async (req, res) => {
  const ips = listLanIPv4()
  const preferred = ips[0]?.address
  let publicOrigin = getPublicOrigin()

  const xfHost = req.get('x-forwarded-host') || req.get('host')
  const xfProto = req.get('x-forwarded-proto') || req.protocol || 'https'
  const selfOrigin =
    xfHost && !/^localhost(:\d+)?$/i.test(xfHost) && !/^127\.0\.0\.1(:\d+)?$/.test(xfHost)
      ? `${xfProto}://${xfHost}`
      : null

  // 云端部署时：站点自身就是公网地址，无需本机隧道
  const cloudHosted = process.env.RENDER === 'true' || process.env.CLOUD_HOSTED === 'true'
  if (cloudHosted && selfOrigin) {
    publicOrigin = selfOrigin
  }

  if (publicOrigin && !cloudHosted) {
    try {
      const probe = await fetch(publicOrigin, {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
        redirect: 'follow',
      })
      const text = (await probe.text()).slice(0, 2000).toLowerCase()
      if (
        text.includes('no tunnel here') ||
        text.includes('tunnel not found') ||
        text.includes('failed to connect to localhost')
      ) {
        clearPublicOrigin()
        publicOrigin = null
      }
    } catch {
      // 网络抖动时先保留地址
    }
  }

  res.json({
    frontendPort: FRONTEND_PORT,
    ips: cloudHosted ? [] : ips,
    preferredOrigin: cloudHosted
      ? selfOrigin
      : preferred
        ? `http://${preferred}:${FRONTEND_PORT}`
        : null,
    publicOrigin: publicOrigin || selfOrigin,
    tunnelActive: Boolean(publicOrigin || (cloudHosted && selfOrigin)),
    tunnelTargetPort: PORT,
    staticFrontend: existsSync(DIST_DIR),
    cloudHosted,
  })
})

app.post('/api/tunnel/public-origin', (req, res) => {
  if (process.env.RENDER === 'true' || process.env.CLOUD_HOSTED === 'true') {
    res.status(403).json({ error: '云端部署无需注册本机隧道' })
    return
  }
  const url = String(req.body?.url ?? '').trim()
  if (!/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: '无效的公网地址' })
    return
  }
  const saved = setPublicOrigin(url)
  console.log(`[tunnel] public origin => ${saved.url}`)
  res.json({ ok: true, ...saved })
})

app.delete('/api/tunnel/public-origin', (_req, res) => {
  if (process.env.RENDER === 'true' || process.env.CLOUD_HOSTED === 'true') {
    res.status(403).json({ error: '云端部署无需注册本机隧道' })
    return
  }
  clearPublicOrigin()
  console.log('[tunnel] public origin cleared')
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/quizzes', quizRouter)

// 公网隧道走构建后的静态前端（避免 Vite 开发资源在手机流量下白屏）
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }))
  // 缺失的 /assets/* 不要回退成 index.html（否则手机拿到 HTML 当 CSS → 只有字无样式）
  app.use('/assets', (_req, res) => {
    res.status(404).type('text/plain').send('Not found')
  })
  app.get(/^(?!\/api(?:\/|$))(?!\/socket\.io(?:\/|$))(?!\/assets(?:\/|$)).*/, (_req, res) => {
    res.sendFile(join(DIST_DIR, 'index.html'))
  })
  console.log(`[static] serving frontend from ${DIST_DIR}`)
} else {
  console.warn('[static] dist/ 不存在。蜂窝隧道前请先执行: npm run build')
}

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
})

const rooms = new RoomManager(io)
registerSocketHandlers(io, rooms)

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Kahoot server listening on http://0.0.0.0:${PORT}`)
})
