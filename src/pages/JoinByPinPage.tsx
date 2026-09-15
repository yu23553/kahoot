import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Logo } from '../components/ui'
import { useGame } from '../context/GameContext'

export default function JoinByPinPage() {
  const { pin: pinParam } = useParams()
  const pin = (pinParam || '').replace(/\D/g, '').slice(0, 6)
  const navigate = useNavigate()
  const { joinGame, connected } = useGame()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onJoin = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(pin)) {
      setError('无效的房间 PIN')
      return
    }
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
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        <Logo />
        <div className="w-full rounded-2xl bg-white p-5 text-kahoot-purple shadow-xl">
          <p className="text-center text-sm font-bold text-kahoot-purple/60">扫码加入房间</p>
          <div className="my-3 text-center font-display text-4xl font-black tracking-[0.2em]">
            {pin || '------'}
          </div>
          <form onSubmit={onJoin} className="space-y-3">
            <input
              placeholder="输入你的昵称"
              value={nickname}
              autoFocus
              onChange={(e) => setNickname(e.target.value.slice(0, 16))}
              className="w-full rounded-xl border-2 border-kahoot-purple/20 px-4 py-3 text-center font-bold outline-none focus:border-kahoot-purple"
            />
            {error && <p className="text-center text-sm font-bold text-answer-red">{error}</p>}
            <button
              type="submit"
              disabled={loading || !connected || !/^\d{6}$/.test(pin)}
              className="w-full rounded-xl bg-[#07c160] py-3 font-black text-white disabled:opacity-60"
            >
              {loading ? '加入中…' : '进入游戏'}
            </button>
          </form>
        </div>
        <p className={`text-xs font-bold ${connected ? 'text-green-300' : 'text-yellow-200'}`}>
          {connected ? '● 已连接服务器' : '○ 正在连接服务器…'}
        </p>
        <Link to="/" className="text-sm font-bold text-white/70 hover:text-white">
          返回首页手动输入 PIN
        </Link>
      </div>
    </div>
  )
}
