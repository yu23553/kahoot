import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useUiLanguage } from '../context/UiLanguageContext'

export default function HostLoginPage() {
  const navigate = useNavigate()
  const { login, register, user, loading: authLoading } = useAuth()
  const { t } = useUiLanguage()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) navigate('/host', { replace: true })
  }, [user, authLoading, navigate])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') await login(username, password)
      else await register(username, password)
      navigate('/host')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-between pr-28">
          <Logo size="sm" />
          <Link to="/" className="text-sm font-bold text-white/80 hover:text-white">
            {t('common.backHome')}
          </Link>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-2xl bg-white p-5 text-kahoot-purple shadow-xl"
        >
          <h1 className="text-center text-2xl font-black">
            {mode === 'login' ? t('login.title') : t('login.registerTitle')}
          </h1>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('login.username')}
            className="w-full rounded-xl border-2 border-kahoot-purple/20 px-4 py-3 font-bold outline-none focus:border-kahoot-purple"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('login.password')}
            className="w-full rounded-xl border-2 border-kahoot-purple/20 px-4 py-3 font-bold outline-none focus:border-kahoot-purple"
          />
          {error && <p className="text-sm font-bold text-answer-red">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-kahoot-purple py-3 font-black text-white disabled:opacity-60"
          >
            {loading
              ? t('common.pleaseWait')
              : mode === 'login'
                ? t('login.submit')
                : t('login.registerSubmit')}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="w-full text-sm font-bold text-kahoot-purple/70 hover:text-kahoot-purple"
          >
            {mode === 'login' ? t('login.toRegister') : t('login.toLogin')}
          </button>
        </form>
      </div>
    </div>
  )
}
