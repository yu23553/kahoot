/**
 * 公网隧道（长期运行 + 断线自动重连）
 *
 * 优先级：
 * 1) tools/cloudflared.exe（若已放入）
 * 2) SSH localhost.run（国内流量通常比 loca.lt 更可用）
 * 3) localtunnel（容易被墙/超时，仅兜底）
 *
 * 用法：先 npm run dev，再：
 *   npm run tunnel
 */
import { execSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import localtunnel from 'localtunnel'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PORT = Number(process.env.TUNNEL_PORT || 3001)
const API = process.env.TUNNEL_API || 'http://127.0.0.1:3001'
const CF_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi
// 只匹配真实隧道域名，避免误抓欢迎页里的 https://admin.localhost.run
// 兼容 xxx.lhr.life 与新格式 xxx.app.lhr.life
const LHR_URL_RE = /https:\/\/[a-z0-9-]+(?:\.app)?\.lhr\.life/gi
const RETRY_MS = Number(process.env.TUNNEL_RETRY_MS || 4000)

let stopping = false
let activeChild = null
let activeTunnel = null

async function register(url) {
  const res = await fetch(`${API}/api/tunnel/public-origin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(`注册失败: ${await res.text()}`)
}

async function unregister() {
  try {
    await fetch(`${API}/api/tunnel/public-origin`, { method: 'DELETE' })
  } catch {
    // ignore
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** 清理残留的 localhost.run SSH，避免同时存在 5173/3001 两条隧道导致只有字无样式 */
function killStaleLocalhostRunSsh() {
  try {
    if (process.platform === 'win32') {
      execSync(
        `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='ssh.exe'\\" | Where-Object { $_.CommandLine -match 'localhost\\.run' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
        { stdio: 'ignore' },
      )
    } else {
      execSync("pkill -f 'ssh.*localhost.run' || true", { stdio: 'ignore', shell: true })
    }
    console.log('[tunnel] 已清理残留 localhost.run SSH')
  } catch {
    // ignore
  }
}

function findCloudflared() {
  if (process.env.CLOUDFLARED_PATH && existsSync(process.env.CLOUDFLARED_PATH)) {
    return process.env.CLOUDFLARED_PATH
  }
  const local = join(ROOT, 'tools', process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared')
  return existsSync(local) ? local : null
}

function findSsh() {
  return process.platform === 'win32' ? 'ssh.exe' : 'ssh'
}

async function waitForApi() {
  for (;;) {
    if (stopping) return
    try {
      const res = await fetch(`${API}/api/health`)
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        if (!data.staticFrontend) {
          console.warn('[tunnel] 未检测到 dist/ 静态前端，页面可能白屏。请先运行: npm run build')
        }
        return
      }
    } catch {
      // retry
    }
    console.log('[tunnel] 等待后端启动…（请保持 npm run dev）')
    await sleep(RETRY_MS)
  }
}

function printReady(url, provider) {
  console.log('\n========================================')
  console.log(`  公网隧道已就绪（${provider}）`)
  console.log(`  ${url}`)
  console.log('  刷新大厅后扫「蜂窝」二维码')
  console.log('  断线会自动重连（地址可能变化）')
  console.log('  按 Ctrl+C 结束')
  console.log('========================================\n')
}

function spawnLogged(command, args, urlRegex, provider) {
  return new Promise((resolve, reject) => {
    console.log(`[tunnel] ${provider} 连接中…`)
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: false,
    })
    activeChild = child
    let registered = false

    const onChunk = (buf) => {
      const text = buf.toString()
      process.stdout.write(text)
      if (registered || stopping) return
      urlRegex.lastIndex = 0
      const match = urlRegex.exec(text)
      if (!match) return
      // 忽略管理站/文档站误匹配
      if (/admin\.|docs\.|www\./i.test(match[0])) return
      registered = true
      void register(match[0])
        .then(() => printReady(match[0], provider))
        .catch((e) => console.error('[tunnel]', e.message))
    }

    child.stdout.on('data', onChunk)
    child.stderr.on('data', onChunk)
    child.on('error', (err) => {
      activeChild = null
      reject(err)
    })
    child.on('exit', (code) => {
      activeChild = null
      void unregister().finally(() => {
        if (!registered) reject(new Error(`${provider} 退出且未拿到地址 (code=${code})`))
        else resolve(code)
      })
    })
  })
}

async function runCloudflaredOnce(bin) {
  return spawnLogged(
    bin,
    ['tunnel', '--url', `http://127.0.0.1:${PORT}`, '--no-autoupdate'],
    CF_URL_RE,
    'Cloudflare',
  )
}

async function runSshOnce() {
  // localhost.run：HTTPS 公网域名，手机流量一般可打开
  return spawnLogged(
    findSsh(),
    [
      '-o',
      'StrictHostKeyChecking=accept-new',
      '-o',
      'ServerAliveInterval=30',
      '-o',
      'ServerAliveCountMax=3',
      '-o',
      'ExitOnForwardFailure=yes',
      '-R',
      `80:127.0.0.1:${PORT}`,
      'nokey@localhost.run',
    ],
    LHR_URL_RE,
    'localhost.run',
  )
}

function runLocaltunnelOnce() {
  return new Promise((resolve, reject) => {
    console.log('[tunnel] localtunnel 连接中（国内流量常不可用，仅兜底）…')
    void localtunnel({ port: PORT })
      .then((tunnel) => {
        activeTunnel = tunnel
        return register(tunnel.url).then(() => {
          printReady(tunnel.url, 'localtunnel')
          tunnel.on('error', (err) => {
            console.error('[tunnel] localtunnel error:', err.message)
            try {
              tunnel.close()
            } catch {
              // ignore
            }
          })
          tunnel.on('close', () => {
            activeTunnel = null
            void unregister().finally(() => resolve('closed'))
          })
        })
      })
      .catch(reject)
  })
}

async function loop(name, runner) {
  while (!stopping) {
    try {
      await runner()
      if (stopping) break
      console.warn(`[tunnel] ${name} 已断开，${RETRY_MS / 1000}s 后重连…`)
    } catch (e) {
      if (stopping) break
      console.warn(`[tunnel] ${name} 失败:`, e instanceof Error ? e.message : e)
      console.warn(`[tunnel] ${RETRY_MS / 1000}s 后重试…`)
    }
    await sleep(RETRY_MS)
  }
}

async function shutdown() {
  if (stopping) return
  stopping = true
  console.log('\n[tunnel] 正在关闭…')
  await unregister()
  if (activeChild) {
    try {
      activeChild.kill()
    } catch {
      // ignore
    }
  }
  if (activeTunnel) {
    try {
      activeTunnel.close()
    } catch {
      // ignore
    }
  }
  process.exit(0)
}

async function main() {
  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())

  console.log('[tunnel] 检查后端…')
  await waitForApi()
  if (stopping) return

  killStaleLocalhostRunSsh()
  await unregister()

  console.log(`[tunnel] 长期运行：暴露 http://127.0.0.1:${PORT}（后端+静态前端同源）`)
  console.log('[tunnel] WiFi 仍可用局域网 :5173；蜂窝请扫大厅「蜂窝」码\n')

  const cf = findCloudflared()
  if (cf) {
    console.log(`[tunnel] 检测到 cloudflared: ${cf}`)
    await loop('Cloudflare', () => runCloudflaredOnce(cf))
    return
  }

  // 默认走 SSH 隧道（对手机流量更友好）
  await loop('localhost.run', () => runSshOnce())

  // 理论上 loop 不会返回；若 SSH 持续失败可手动改脚本切 localtunnel
  if (!stopping) {
    console.warn('[tunnel] SSH 隧道不可用，尝试 localtunnel 兜底（可能仍无法用流量访问）')
    await loop('localtunnel', () => runLocaltunnelOnce())
  }
}

main().catch((e) => {
  console.error('[tunnel]', e instanceof Error ? e.message : e)
  process.exit(1)
})
