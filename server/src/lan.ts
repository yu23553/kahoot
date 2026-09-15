import { networkInterfaces } from 'node:os'

/** 返回本机可用于手机访问的局域网 IPv4 */
export function listLanIPv4() {
  const nets = networkInterfaces()
  const result: { name: string; address: string }[] = []
  for (const [name, entries] of Object.entries(nets)) {
    if (!entries) continue
    // 跳过虚拟网卡优先真实 WiFi/以太网，但仍全部返回供选择
    for (const entry of entries) {
      if (entry.family !== 'IPv4' || entry.internal) continue
      result.push({ name, address: entry.address })
    }
  }
  // WLAN / 以太网优先，VMware 靠后
  result.sort((a, b) => score(b.name) - score(a.name))
  return result
}

function score(name: string) {
  const n = name.toLowerCase()
  if (n.includes('wlan') || n.includes('wi-fi') || n.includes('wifi')) return 100
  if (n.includes('ethernet') || n.includes('本地') || n.includes('eth')) return 80
  if (n.includes('vmware') || n.includes('virtual') || n.includes('vethernet')) return 0
  return 40
}
