import { io, type Socket } from 'socket.io-client'
import { getSocketUrl } from './config'

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    socket = io(getSocketUrl(), {
      path: '/socket.io',
      autoConnect: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 20,
      timeout: 12000,
    })
  }
  return socket
}

export function emitAck<T = unknown>(
  event: string,
  payload?: unknown,
  timeoutMs = 10000,
): Promise<T> {
  const s = getSocket()
  const run = () =>
    new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('服务器无响应')), timeoutMs)
      s.emit(event, payload ?? {}, (res: T) => {
        window.clearTimeout(timer)
        resolve(res)
      })
    })

  if (s.connected) return run()

  return new Promise<T>((resolve, reject) => {
    const waitMs = Math.min(8000, timeoutMs)
    const timer = window.setTimeout(() => {
      s.off('connect', onConnect)
      reject(
        new Error(
          '无法连接服务器。WiFi 请确认同一局域网；蜂窝网络请先在电脑运行 npm run tunnel',
        ),
      )
    }, waitMs)
    const onConnect = () => {
      window.clearTimeout(timer)
      s.off('connect', onConnect)
      void run().then(resolve, reject)
    }
    s.once('connect', onConnect)
    if (!s.active) s.connect()
  })
}
