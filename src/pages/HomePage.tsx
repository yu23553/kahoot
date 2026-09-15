import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { getLanHint } from '../lib/config'

export default function HomePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { joinGame, connected } = useGame()
  const [pin, setPin] = useState(() => (params.get('pin') || '').replace(/\D/g, '').slice(0, 6))
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onJoin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await joinGame(pin, nickname)
      navigate('/play')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8">
        <Logo size="lg" />
        <p className="text-center text-white/80">输入 PIN 加入，或让主持人出示微信二维码扫码进入</p>
        <p className={`text-xs font-bold ${connected ? 'text-green-300' : 'text-yellow-200'}`}>
          {connected ? '● 已连接服务器' : '○ 正在连接服务器…'}
        </p>
        {!connected && (
          <p className="rounded-xl bg-black/25 px-3 py-2 text-center text-xs leading-relaxed text-white/80">
            {getLanHint()}
            <br />
            需与电脑同一 WiFi，并放行端口 5173、3001
          </p>
        )}

        <form
          onSubmit={onJoin}
          className="animate-pop-in w-full space-y-3 rounded-2xl bg-white p-5 text-kahoot-purple shadow-xl"
        >
          <h2 className="text-center text-lg font-black">加入游戏</h2>
          <input
            inputMode="numeric"
            maxLength={6}
            placeholder="游戏 PIN 码"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-xl border-2 border-kahoot-purple/20 px-4 py-3 text-center text-2xl font-black tracking-[0.35em] outline-none focus:border-kahoot-purple"
          />
          <input
            placeholder="你的昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 16))}
            className="w-full rounded-xl border-2 border-kahoot-purple/20 px-4 py-3 text-center font-bold outline-none focus:border-kahoot-purple"
          />
          {error && <p className="text-center text-sm font-bold text-answer-red">{error}</p>}
          <button
            type="submit"
            disabled={loading || !connected}
            className="w-full rounded-xl bg-kahoot-purple py-3 font-black text-white transition hover:bg-kahoot-purple-light active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? '加入中…' : '进入'}
          </button>
        </form>

        <div className="w-full space-y-3">
          <Link
            to={user ? '/host' : '/host/login'}
            className="block w-full rounded-xl border-2 border-white/40 bg-white/10 py-3 text-center font-black text-white backdrop-blur transition hover:bg-white/20"
          >
            {user ? `主持人工作台（${user.username}）` : '主持人登录 / 注册'}
          </Link>
        </div>
      </div>
    </div>
  )
}
