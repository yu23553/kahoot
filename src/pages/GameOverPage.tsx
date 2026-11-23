import { useNavigate } from 'react-router-dom'
import { LeaderboardList, Logo } from '../components/ui'
import { Podium } from '../components/Podium'
import { useGame } from '../context/GameContext'
import { useUiLanguage } from '../context/UiLanguageContext'

export default function GameOverPage() {
  const navigate = useNavigate()
  const { sortedPlayers, quizTitle, currentPlayerId, goHome, backToLobby, role } = useGame()
  const { t } = useUiLanguage()

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 text-center">
        <Logo />
        <div className="animate-pop-in space-y-2">
          <p className="text-sm font-bold uppercase tracking-widest text-white/60">Game Over</p>
          <h1 className="font-display text-4xl font-black text-white">{t('over.podium')}</h1>
          <p className="text-white/70">{quizTitle}</p>
        </div>

        <Podium players={sortedPlayers} highlightId={currentPlayerId} />

        <div className="w-full animate-pop-in" style={{ animationDelay: '1.6s' }}>
          <p className="mb-3 text-sm font-bold text-white/60">{t('over.fullRank')}</p>
          <LeaderboardList players={sortedPlayers} highlightId={currentPlayerId} />
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row">
          {role === 'host' && (
            <button
              type="button"
              onClick={() => {
                void backToLobby().then(() => navigate('/host/lobby'))
              }}
              className="flex-1 rounded-xl bg-white/15 py-3 font-black text-white hover:bg-white/25"
            >
              {t('over.again')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              goHome()
              navigate(role === 'host' ? '/host' : '/')
            }}
            className="flex-1 rounded-xl bg-kahoot-magenta py-3 font-black text-white hover:brightness-110"
          >
            {role === 'host' ? t('over.toWorkbench') : t('over.toHome')}
          </button>
        </div>
      </div>
    </div>
  )
}
