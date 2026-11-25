import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Logo } from '../components/ui'
import { useGame } from '../context/GameContext'
import { useUiLanguage } from '../context/UiLanguageContext'
import type { QuizLanguage } from '../types'

export default function JoinByPinPage() {
  const { pin: pinParam } = useParams()
  const pin = (pinParam || '').replace(/\D/g, '').slice(0, 6)
  const navigate = useNavigate()
  const { joinGame, previewRoom, connected } = useGame()
  const { t } = useUiLanguage()
  const [nickname, setNickname] = useState('')
  const [languages, setLanguages] = useState<QuizLanguage[]>([])
  const [language, setLanguage] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [roomLocked, setRoomLocked] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!/^\d{6}$/.test(pin) || !connected) return
    let alive = true
    void previewRoom(pin)
      .then((info) => {
        if (!alive) return
        setLanguages(info.languages)
        setQuizTitle(info.title)
        setLanguage(info.defaultLanguage)
        setRoomLocked(Boolean(info.locked))
        setError(info.locked ? t('home.roomLocked') : '')
      })
      .catch((err) => {
        if (!alive) return
        setRoomLocked(false)
        setError(err instanceof Error ? err.message : t('home.roomReadFailed'))
      })
    return () => {
      alive = false
    }
  }, [pin, connected, previewRoom, t])

  const onJoin = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(pin)) {
      setError(t('join.invalidPin'))
      return
    }
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
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        <Logo />
        <div className="w-full rounded-2xl bg-white p-5 text-kahoot-purple shadow-xl">
          <p className="text-center text-sm font-bold text-kahoot-purple/60">{t('join.scanTitle')}</p>
          <div className="my-3 text-center font-display text-4xl font-black tracking-[0.2em]">
            {pin || '------'}
          </div>
          {quizTitle && (
            <p className="mb-3 text-center text-sm font-bold text-kahoot-purple/70">{quizTitle}</p>
          )}
          <form onSubmit={onJoin} className="space-y-3">
            <input
              placeholder={t('join.nicknamePlaceholder')}
              value={nickname}
              autoFocus
              onChange={(e) => setNickname(e.target.value.slice(0, 16))}
              className="w-full rounded-xl border-2 border-kahoot-purple/20 px-4 py-3 text-center font-bold outline-none focus:border-kahoot-purple"
            />
            {languages.length > 0 && (
              <div className="space-y-2">
                <p className="text-center text-xs font-bold text-kahoot-purple/60">
                  {t('home.selectQuizLang')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-sm font-black ${
                        language === lang.code
                          ? 'border-kahoot-purple bg-kahoot-purple text-white'
                          : 'border-kahoot-purple/20 text-kahoot-purple'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-center text-sm font-bold text-answer-red">{error}</p>}
            <button
              type="submit"
              disabled={
                loading ||
                !connected ||
                roomLocked ||
                !/^\d{6}$/.test(pin) ||
                (languages.length > 1 && !language)
              }
              className="w-full rounded-xl bg-[#07c160] py-3 font-black text-white disabled:opacity-60"
            >
              {loading ? t('home.joining') : t('join.enter')}
            </button>
          </form>
        </div>
        <p className={`text-xs font-bold ${connected ? 'text-green-300' : 'text-yellow-200'}`}>
          {connected ? t('home.connected') : t('home.connecting')}
        </p>
        <Link to="/" className="text-sm font-bold text-white/70 hover:text-white">
          {t('join.backManual')}
        </Link>
      </div>
    </div>
  )
}
