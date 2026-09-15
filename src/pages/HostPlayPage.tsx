import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QuestionIntro } from '../components/QuestionIntro'
import { RoundStatsPanel } from '../components/RoundStatsPanel'
import { AnswerShape, CountdownRing, Logo } from '../components/ui'
import { useGame } from '../context/GameContext'
import { ANSWER_COLORS } from '../data/mock'
import { QUESTION_TYPE_LABELS } from '../types'

export default function HostPlayPage() {
  const navigate = useNavigate()
  const {
    role,
    phase,
    pin,
    questionCount,
    currentQuestion,
    currentQuestionIndex,
    timeLeft,
    players,
    answeredCount,
    introProgress,
    introType,
    roundStats,
    nextQuestion,
    reconnecting,
    connected,
  } = useGame()

  useEffect(() => {
    if (role !== 'host' || !pin) navigate('/', { replace: true })
  }, [pin, role, navigate])

  useEffect(() => {
    if (phase === 'finished') navigate('/game-over')
    if (phase === 'lobby' || phase === 'idle') navigate('/host/lobby')
  }, [phase, navigate])

  if (phase === 'intro' && introType) {
    return (
      <QuestionIntro
        type={introType}
        index={currentQuestionIndex}
        total={questionCount}
        progress={introProgress}
      />
    )
  }

  if (phase === 'stats' && roundStats) {
    return (
      <div className="bg-kahoot-gradient min-h-dvh px-4 py-6">
        <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between">
          <Logo size="sm" />
          <span className="rounded-lg bg-white/15 px-3 py-1 text-sm font-bold text-white">
            PIN {pin}
          </span>
        </div>
        <RoundStatsPanel
          stats={roundStats}
          players={players}
          isHost
          options={currentQuestion?.options}
          onNext={() => void nextQuestion().catch(() => undefined)}
        />
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="bg-kahoot-gradient flex min-h-dvh flex-col items-center justify-center gap-3 text-white">
        <p>{reconnecting || !connected ? '重连中…' : '等待题目…'}</p>
      </div>
    )
  }

  const type = currentQuestion.type || 'choice'

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-4 sm:py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Logo size="sm" />
          <div className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold text-white">
            PIN {pin} · {QUESTION_TYPE_LABELS[type]} · 第 {currentQuestionIndex + 1}/
            {questionCount} 题
          </div>
        </header>

        {(!connected || reconnecting) && (
          <p className="rounded-xl bg-amber-500/90 px-3 py-2 text-center text-sm font-bold text-white">
            网络重连中，请稍候…
          </p>
        )}

        {phase === 'question' && (
          <>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-1000 linear"
                style={{
                  width: `${
                    currentQuestion.timeLimit > 0
                      ? (timeLeft / currentQuestion.timeLimit) * 100
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="max-w-3xl flex-1 font-display text-2xl font-black leading-snug text-white sm:text-4xl">
                {currentQuestion.text}
              </h1>
              <CountdownRing timeLeft={timeLeft} total={currentQuestion.timeLimit} size={96} />
            </div>

            <p className="text-sm font-bold text-white/70">
              已作答 {answeredCount}/{players.length}
            </p>

            {(type === 'choice' || type === 'truefalse') && (
              <div className={`grid gap-3 ${type === 'truefalse' ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
                {(currentQuestion.options ?? []).map((opt, i) => {
                  const color =
                    type === 'truefalse'
                      ? i === 0
                        ? 'bg-answer-green'
                        : 'bg-answer-red'
                      : ANSWER_COLORS[i].bg
                  return (
                    <div
                      key={i}
                      className={`animate-pop-in flex min-h-24 items-center gap-3 rounded-2xl px-4 py-4 text-white shadow-lg ${color}`}
                    >
                      {type === 'choice' && <AnswerShape index={i} className="h-10 w-10 shrink-0" />}
                      <span className="flex-1 text-left text-lg font-black sm:text-xl">{opt}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {type === 'fill' && (
              <div className="rounded-2xl bg-white/10 p-5 text-white">
                <p className="font-bold text-white/80">玩家正在输入答案（支持模糊匹配计分）…</p>
              </div>
            )}

            {type === 'order' && (
              <div className="rounded-2xl bg-white/10 p-5 text-white">
                <p className="font-bold text-white/80">玩家正在调整排序…</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
