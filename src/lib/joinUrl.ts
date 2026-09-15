import { getApiBase } from './config'

export type JoinInfo = {
  frontendPort: number
  ips: { name: string; address: string }[]
  preferredOrigin: string | null
  publicOrigin: string | null
  tunnelActive: boolean
  cloudHosted?: boolean
}

export async function fetchJoinInfo(): Promise<JoinInfo | null> {
  try {
    const res = await fetch(`${getApiBase()}/join-info`)
    if (!res.ok) return null
    return (await res.json()) as JoinInfo
  } catch {
    return null
  }
}

export function buildJoinUrl(origin: string, pin: string) {
  const base = origin.replace(/\/$/, '')
  return `${base}/join/${pin}`
}

/**
 * 自动模式：优先局域网（同一 WiFi 最稳）；
 * 公网隧道需手动选「公网隧道」，避免隧道挂掉后二维码仍指向失效地址。
 */
export function resolveJoinOrigin(
  currentOrigin: string,
  joinInfo: JoinInfo | null,
  selectedIp?: string,
  preferMode: 'auto' | 'tunnel' | 'lan' = 'auto',
) {
  if (preferMode === 'tunnel' && joinInfo?.publicOrigin) {
    return joinInfo.publicOrigin
  }

  if (preferMode === 'lan' || preferMode === 'auto') {
    if (selectedIp) {
      const port = joinInfo?.frontendPort || 5173
      return `http://${selectedIp}:${port}`
    }
    if (joinInfo?.preferredOrigin) return joinInfo.preferredOrigin
  }

  const host = window.location.hostname
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return currentOrigin
  }
  return joinInfo?.preferredOrigin || currentOrigin
}
