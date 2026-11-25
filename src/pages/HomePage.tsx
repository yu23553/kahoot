import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { useUiLanguage } from '../context/UiLanguageContext'
import { isLanOrLocalHost } from '../lib/config'
import type { QuizLanguage } from '../types'

export default function HomePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { joinGame, previewRoom, connected, error: gameError } = useGame()
  const { t } = useUiLanguage()
  const [pin, setPin] = useState(() => (params.get('pin') || '').replace(/\D/g, '').slice(0, 6))
  const [nickname, setNickname] = useState('')
  const [languages, setLanguages] = useState<QuizLanguage[]>([])
  const [language, setLanguage] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [roomLocked, setRoomLocked] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const lanHint = (() => {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') return t('home.lanHintLocal')
    if (!isLanOrLocalHost(host)) return t('home.lanHintTunnel')
    return t('home.lanHintCurrent', { origin: window.location.origin })
  })()

  useEffect(() => {
    if (!/^\d{6}$/.test(pin) || !connected) {
      setLanguages([])
      setQuizTitle('')
      setRoomLocked(false)
      return
    }
    let alive = true
    setPreviewing(true)
    void previewRoom(pin)
      .then((info) => {
        if (!alive) return
        setLanguages(info.languages)
        setQuizTitle(info.title)
        setRoomLocked(Boolean(info.locked))
        setLanguage((prev) =>
          info.languages.some((l) => l.code === prev) ? prev : info.defaultLanguage,
        )
        setError(info.locked ? t('home.roomLocked') : '')
      })
      .catch((err) => {
        if (!alive) return
        setLanguages([])
        setQuizTitle('')
        setRoomLocked(false)
        setError(err instanceof Error ? err.message : t('home.roomReadFailed'))
      })
      .finally(() => {
        if (alive) setPreviewing(false)
      })
    return () => {
      alive = false
    }
  }, [pin, connected, previewRoom, t])

  const onJoin = async (e: FormEvent) => {
    e.preventDefault()
    if (roomLocked) {
      setError(t('home.roomLocked'))
      return
    }
    if (languages.length > 1 && !language) {
      setError(t('home.needQuizLang'))
      return
    }
    setLoading(true)
    setError('')
    try {
      await joinGame(pin, nickname, language || languages[0]?.code)
      navigate('/play')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('home.joinFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8">
        <Logo size="lg" />
        <p className="text-center text-white/80">{t('home.hint')}</p>
        <p className={`text-xs font-bold ${connected ? 'text-green-300' : 'text-yellow-200'}`}>
          {connected ? t('home.connected') : t('home.connecting')}
        </p>
        {!connected && (
          <p className="rounded-xl bg-black/25 px-3 py-2 text-center text-xs leading-relaxed text-white/80">
            {lanHint}
            <br />
            {t('home.firewall')}
          </p>
        )}

        <form
          onSubmit={onJoin}
          className="animate-pop-in w-full space-y-3 rounded-2xl bg-white p-5 text-kahoot-purple shadow-xl"
        >
          <h2 className="text-center text-lg font-black">{t('home.joinTitle')}</h2>
          <input
            inputMode="numeric"
            maxLength={6}
            placeholder={t('home.pinPlaceholder')}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-xl border-2 border-kahoot-purple/20 px-4 py-3 text-center text-2xl font-black tracking-[0.35em] outline-none focus:border-kahoot-purple"
          />
          {quizTitle && (
            <p className="text-center text-sm font-bold text-kahoot-purple/70">{quizTitle}</p>
          )}
          <input
            placeholder={t('home.nicknamePlaceholder')}
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 16))}
            className="w-full rounded-xl border-2 border-kahoot-purple/20 px-4 py-3 text-center font-bold outline-none focus:border-kahoot-purple"
          />
          {languages.length > 0 && (
            <div className="space-y-2">
              <p className="text-center text-xs font-bold text-kahoot-purple/60">
                {previewing ? t('home.loadingLang') : t('home.selectQuizLang')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-black transition ${
                      language === lang.code
                        ? 'border-kahoot-purple bg-kahoot-purple text-white'
                        : 'border-kahoot-purple/20 bg-white text-kahoot-purple hover:border-kahoot-purple/50'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(error || gameError) && (
            <p className="text-center text-sm font-bold text-answer-red">
              {error || gameError}
            </p>
          )}
          <button
            type="submit"
            disabled={
              loading || !connected || roomLocked || (languages.length > 1 && !language)
            }
            className="w-full rounded-xl bg-kahoot-purple py-3 font-black text-white transition hover:bg-kahoot-purple-light active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? t('home.joining') : t('home.join')}
          </button>
        </form>

        <div className="w-full space-y-3">
          <Link
            to={user ? '/host' : '/host/login'}
            className="block w-full rounded-xl border-2 border-white/40 bg-white/10 py-3 text-center font-black text-white backdrop-blur transition hover:bg-white/20"
          >
            {user ? t('home.hostWorkbench', { name: user.username }) : t('home.hostLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}
