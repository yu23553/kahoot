import { Container, getContainer } from '@cloudflare/containers'

export interface Env {
  KAHOOT: DurableObjectNamespace
  JWT_SECRET: string
}

/**
 * Proxy Express + Socket.IO Node app via Cloudflare Containers.
 * One singleton container keeps in-memory rooms (Socket.IO) coherent.
 */
export class KahootContainer extends Container<Env> {
  defaultPort = 8080
  /** Readiness probe used while the container boots. */
  pingEndpoint = '/api/health'
  // Keep the quiz process warm between rounds; rooms are in-memory.
  sleepAfter = '60m'
  enableInternet = false

  envVars: Record<string, string> = {}

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.envVars = {
      NODE_ENV: 'production',
      PORT: '8080',
      CLOUD_HOSTED: 'true',
      JWT_SECRET: env.JWT_SECRET || 'kahoot-dev-secret-change-me',
    }
  }

  override onStart(): void {
    console.log('[kahoot-container] started')
  }

  override onStop(): void {
    console.log('[kahoot-container] stopped')
  }

  override onError(error: unknown): void {
    console.error('[kahoot-container] error', error)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Cheap liveness for uptime probes without waking the container.
    if (url.pathname === '/__worker/health') {
      return Response.json({
        ok: true,
        service: 'kahoot-worker',
        platform: 'cloudflare-containers',
      })
    }

    const container = getContainer(env.KAHOOT, 'kahoot-singleton')
    return container.fetch(request)
  },
}
