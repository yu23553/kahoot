import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { api, type RemoteQuiz } from '../lib/api'

export default function HostDashboardPage() {
  const navigate = useNavigate()
  const { user, logout, loading: authLoading } = useAuth()
  const { createRoom } = useGame()
  const [quizzes, setQuizzes] = useState<RemoteQuiz[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/host/login', { replace: true })
      return
    }
    api
      .listQuizzes(user.token)
      .then(setQuizzes)
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
  }, [user, authLoading, navigate])

  const startRoom = async (quizId: string) => {
    setBusyId(quizId)
    setError('')
    try {
      await createRoom(quizId)
      navigate('/host/lobby')
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建房间失败')
    } finally {
      setBusyId(null)
    }
  }

  const removeQuiz = async (quizId: string) => {
    if (!user || !confirm('确定删除该测验？')) return
    await api.deleteQuiz(user.token, quizId)
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId))
  }

  if (authLoading || !user) {
    return (
      <div className="bg-kahoot-gradient flex min-h-dvh items-center justify-center text-white">
        加载中…
      </div>
    )
  }

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white/80">{user.username}</span>
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
            >
              退出登录
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black text-white">我的测验</h1>
            <p className="text-white/70">创建题库后，开房间邀请玩家用 PIN 加入</p>
          </div>
          <Link
            to="/host/create"
            className="rounded-xl bg-kahoot-magenta px-4 py-3 font-black text-white hover:brightness-110"
          >
            + 创建测验
          </Link>
        </div>

        {error && <p className="font-bold text-red-200">{error}</p>}

        {quizzes.length === 0 ? (
          <div className="rounded-2xl bg-white/10 p-10 text-center text-white/70">
            还没有测验，先创建一个吧
          </div>
        ) : (
          <ul className="space-y-3">
            {quizzes.map((q) => (
              <li
                key={q.id}
                className="flex flex-col gap-3 rounded-2xl bg-white p-4 text-kahoot-purple sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-lg font-black">{q.title}</div>
                  <div className="text-sm text-kahoot-purple/60">{q.questions.length} 题</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/host/create?id=${q.id}`)}
                    className="rounded-lg bg-kahoot-purple/10 px-3 py-2 text-sm font-bold"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuiz(q.id)}
                    className="rounded-lg bg-answer-red/10 px-3 py-2 text-sm font-bold text-answer-red"
                  >
                    删除
                  </button>
                  <button
                    type="button"
                    disabled={busyId === q.id}
                    onClick={() => startRoom(q.id)}
                    className="rounded-lg bg-kahoot-purple px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {busyId === q.id ? '创建中…' : '开房间'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link to="/" className="inline-block text-sm font-bold text-white/70 hover:text-white">
          ← 返回首页
        </Link>
      </div>
    </div>
  )
}
