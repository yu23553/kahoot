import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, type AuthSession } from '../lib/api'

type AuthContextValue = {
  user: AuthSession | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 'kahoot_auth_v1'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as AuthSession) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(!!user)

  useEffect(() => {
    if (!user?.token) {
      setLoading(false)
      return
    }
    api
      .me(user.token)
      .then((me) => {
        const next = { ...user, id: me.id, username: me.username }
        setUser(next)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
        setUser(null)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = (session: AuthSession | null) => {
    setUser(session)
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  }

  const login = useCallback(async (username: string, password: string) => {
    const session = await api.login(username, password)
    persist(session)
  }, [])

  const register = useCallback(async (username: string, password: string) => {
    const session = await api.register(username, password)
    persist(session)
  }, [])

  const logout = useCallback(() => persist(null), [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
