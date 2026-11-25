import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JoinInvite } from '../components/JoinInvite'
import { Logo } from '../components/ui'
import { useGame } from '../context/GameContext'
import { useUiLanguage } from '../context/UiLanguageContext'

export default function HostLobbyPage() {
  const navigate = useNavigate()
  const {
    pin,
    quizTitle,
    questionCount,
    players,
    startGame,
    phase,
    role,
    goHome,
    locked,
    kickPlayer,
    setRoomLocked,
  } = useGame()
  const { t } = useUiLanguage()
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [locking, setLocking] = useState(false)

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
      setError(e instanceof Error ? e.message : t('lobby.startFailed'))
    } finally {
      setStarting(false)
    }
  }

  const onToggleLock = async () => {
    setLocking(true)
    setError('')
    try {
      await setRoomLocked(!locked)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('lobby.lockFailed'))
    } finally {
      setLocking(false)
    }
  }

  const onKick = async (playerId: string) => {
    setBusyId(playerId)
    setError('')
    try {
      await kickPlayer(playerId)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('lobby.kickFailed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3 pr-28">
          <Logo size="sm" />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void onToggleLock()}
              disabled={locking}
              className={`rounded-lg px-3 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60 ${
                locked ? 'bg-kahoot-magenta' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {locking
                ? t('lobby.lockBusy')
                : locked
                  ? t('lobby.unlock')
                  : t('lobby.lock')}
            </button>
            <button
              type="button"
              onClick={() => {
                goHome()
                navigate('/host')
              }}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
            >
              {t('lobby.closeRoom')}
            </button>
          </div>
        </div>

        <section className="space-y-4 text-center">
          <h1 className="font-display text-2xl font-black text-white sm:text-3xl">{quizTitle}</h1>
          <p className="text-white/70">{t('lobby.invite', { n: questionCount })}</p>
          {locked && (
            <p className="inline-block rounded-full bg-kahoot-magenta/90 px-4 py-1.5 text-sm font-bold text-white">
              {t('lobby.lockedBadge')}
            </p>
          )}
          <JoinInvite pin={pin} />
        </section>

        <section className="rounded-2xl bg-white/10 p-4 backdrop-blur sm:p-6">
          <h2 className="mb-4 text-lg font-black text-white">
            {t('lobby.players', { n: players.length })}
          </h2>
          {players.length === 0 ? (
            <p className="py-10 text-center text-white/60">{t('lobby.empty')}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="animate-pop-in flex items-center gap-2 rounded-xl bg-white/15 px-3 py-3"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                    style={{ background: p.avatarColor }}
                  >
                    {p.nickname.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1 truncate font-bold text-white">{p.nickname}</div>
                  <button
                    type="button"
                    onClick={() => void onKick(p.id)}
                    disabled={busyId === p.id}
                    className="shrink-0 rounded-lg bg-answer-red/90 px-2 py-1 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    {busyId === p.id ? '…' : t('lobby.kick')}
                  </button>
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
          {starting ? t('lobby.starting') : t('lobby.start')}
        </button>
      </div>
    </div>
  )
}
