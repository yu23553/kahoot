import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function HostLoginPage() {
  const navigate = useNavigate()
  const { login, register, user, loading: authLoading } = useAuth()
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
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <Link to="/" className="text-sm font-bold text-white/80 hover:text-white">
            返回首页
          </Link>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-2xl bg-white p-5 text-kahoot-purple shadow-xl"
        >
          <h1 className="text-center text-2xl font-black">
            {mode === 'login' ? '主持人登录' : '注册主持人账号'}
          </h1>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名"
            className="w-full rounded-xl border-2 border-kahoot-purple/20 px-4 py-3 font-bold outline-none focus:border-kahoot-purple"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            className="w-full rounded-xl border-2 border-kahoot-purple/20 px-4 py-3 font-bold outline-none focus:border-kahoot-purple"
          />
          {error && <p className="text-sm font-bold text-answer-red">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-kahoot-purple py-3 font-black text-white disabled:opacity-60"
          >
            {loading ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录'}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="w-full text-sm font-bold text-kahoot-purple/70 hover:text-kahoot-purple"
          >
            {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
