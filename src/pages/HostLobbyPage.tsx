import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JoinInvite } from '../components/JoinInvite'
import { Logo } from '../components/ui'
import { useGame } from '../context/GameContext'

export default function HostLobbyPage() {
  const navigate = useNavigate()
  const { pin, quizTitle, questionCount, players, startGame, phase, role, goHome } = useGame()
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (role !== 'host' || !pin) navigate('/host', { replace: true })
  }, [role, pin, navigate])

  useEffect(() => {
    if (phase === 'intro' || phase === 'question' || phase === 'stats') navigate('/host/play')
    if (phase === 'finished') navigate('/game-over')
  }, [phase, navigate])

  const onStart = async () => {
    setStarting(true)
    setError('')
    try {
      await startGame()
      navigate('/host/play')
    } catch (e) {
      setError(e instanceof Error ? e.message : '开始失败')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Logo size="sm" />
          <button
            type="button"
            onClick={() => {
              goHome()
              navigate('/host')
            }}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
          >
            关闭房间
          </button>
        </div>

        <section className="space-y-4 text-center">
          <h1 className="font-display text-2xl font-black text-white sm:text-3xl">{quizTitle}</h1>
          <p className="text-white/70">共 {questionCount} 题 · 邀请玩家加入</p>
          <JoinInvite pin={pin} />
        </section>

        <section className="rounded-2xl bg-white/10 p-4 backdrop-blur sm:p-6">
          <h2 className="mb-4 text-lg font-black text-white">
            玩家列表（{players.length}/80）
          </h2>
          {players.length === 0 ? (
            <p className="py-10 text-center text-white/60">
              还没有人加入。可让玩家输入 PIN，或用微信扫描上方二维码。
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="animate-pop-in flex items-center gap-2 rounded-xl bg-white/15 px-3 py-3"
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white"
                    style={{ background: p.avatarColor }}
                  >
                    {p.nickname.slice(0, 1)}
                  </span>
                  <div className="truncate font-bold text-white">{p.nickname}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && <p className="text-center font-bold text-red-200">{error}</p>}

        <button
          type="button"
          onClick={onStart}
          disabled={starting || players.length === 0}
          className="mx-auto w-full max-w-md rounded-2xl bg-kahoot-magenta py-4 text-xl font-black text-white shadow-xl transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {starting ? '开始中…' : '开始游戏'}
        </button>
      </div>
    </div>
  )
}
