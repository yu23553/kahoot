import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { useUiLanguage } from '../context/UiLanguageContext'
import { api, type RemoteQuiz } from '../lib/api'

export default function HostDashboardPage() {
  const navigate = useNavigate()
  const { user, logout, loading: authLoading } = useAuth()
  const { createRoom } = useGame()
  const { t } = useUiLanguage()
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
      .catch((e) => setError(e instanceof Error ? e.message : t('common.loadFailed')))
  }, [user, authLoading, navigate, t])

  const startRoom = async (quizId: string) => {
    setBusyId(quizId)
    setError('')
    try {
      await createRoom(quizId)
      navigate('/host/lobby')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('dash.createRoomFailed'))
    } finally {
      setBusyId(null)
    }
  }

  const removeQuiz = async (quizId: string) => {
    if (!user || !confirm(t('dash.confirmDelete'))) return
    await api.deleteQuiz(user.token, quizId)
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId))
  }

  if (authLoading || !user) {
    return (
      <div className="bg-kahoot-gradient flex min-h-dvh items-center justify-center text-white">
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pr-28">
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
              {t('dash.logout')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black text-white">{t('dash.title')}</h1>
            <p className="text-white/70">{t('dash.subtitle')}</p>
          </div>
          <Link
            to="/host/create"
            className="rounded-xl bg-kahoot-magenta px-4 py-3 font-black text-white hover:brightness-110"
          >
            {t('dash.create')}
          </Link>
        </div>

        {error && <p className="font-bold text-red-200">{error}</p>}

        {quizzes.length === 0 ? (
          <div className="rounded-2xl bg-white/10 p-10 text-center text-white/70">
            {t('dash.empty')}
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
                  <div className="text-sm text-kahoot-purple/60">
                    {t('dash.questions', { n: q.questions.length })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/host/create?id=${q.id}`)}
                    className="rounded-lg bg-kahoot-purple/10 px-3 py-2 text-sm font-bold"
                  >
                    {t('dash.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuiz(q.id)}
                    className="rounded-lg bg-answer-red/10 px-3 py-2 text-sm font-bold text-answer-red"
                  >
                    {t('dash.delete')}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === q.id}
                    onClick={() => startRoom(q.id)}
                    className="rounded-lg bg-kahoot-purple px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {busyId === q.id ? t('dash.creating') : t('dash.openRoom')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link to="/" className="inline-block text-sm font-bold text-white/70 hover:text-white">
          {t('dash.backHome')}
        </Link>
      </div>
    </div>
  )
}
