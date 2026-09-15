/** 是否为局域网 / 本机地址 */
export function isLanOrLocalHost(hostname: string) {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
    return true
  }
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) return true
  return false
}

/**
 * - 局域网 IP：直连 :3001（手机 WiFi 更稳）
 * - localhost / 公网隧道域名：走当前页面同源（Vite 代理 / 反代）
 *   隧道场景必须同源，不能拼 :3001
 */
export function getServerOrigin() {
  const { protocol, hostname, origin } = window.location

  if (import.meta.env.DEV) {
    const isPureLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    const isLanIp = isLanOrLocalHost(hostname) && !isPureLocal
    if (isLanIp) {
      return `${protocol}//${hostname}:3001`
    }
    // localhost：API 直连后端；页面仍是 5173
    if (isPureLocal) {
      return `${protocol}//${hostname}:3001`
    }
    // trycloudflare.com / ngrok 等公网域名 → 同源走代理
    return origin
  }

  return origin
}

export function getApiBase() {
  return `${getServerOrigin()}/api`
}

export function getSocketUrl() {
  return getServerOrigin()
}

export function getLanHint() {
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return '同一 WiFi 请用电脑局域网 IP；蜂窝网络请先运行 npm run tunnel'
  }
  if (!isLanOrLocalHost(host)) {
    return '当前为公网隧道地址，手机用流量也可访问'
  }
  return `当前访问地址：${window.location.origin}`
}
