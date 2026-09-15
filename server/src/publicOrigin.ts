import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const PUBLIC_ORIGIN_FILE = join(DATA_DIR, 'public-origin.json')

type PublicOriginFile = {
  url: string
  updatedAt: number
}

export function setPublicOrigin(url: string) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  const data: PublicOriginFile = { url: url.replace(/\/$/, ''), updatedAt: Date.now() }
  writeFileSync(PUBLIC_ORIGIN_FILE, JSON.stringify(data, null, 2))
  return data
}

export function clearPublicOrigin() {
  if (existsSync(PUBLIC_ORIGIN_FILE)) unlinkSync(PUBLIC_ORIGIN_FILE)
}

export function getPublicOrigin(): string | null {
  try {
    if (!existsSync(PUBLIC_ORIGIN_FILE)) return null
    const data = JSON.parse(readFileSync(PUBLIC_ORIGIN_FILE, 'utf-8')) as PublicOriginFile
    // 超过 12 小时视为过期
    if (!data.url || Date.now() - data.updatedAt > 12 * 60 * 60 * 1000) return null
    return data.url
  } catch {
    return null
  }
}
