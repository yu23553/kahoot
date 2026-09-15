import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QuestionIntro } from '../components/QuestionIntro'
import { RoundStatsPanel } from '../components/RoundStatsPanel'
import { AnswerShape, CountdownRing, Logo } from '../components/ui'
import { useGame } from '../context/GameContext'
import { ANSWER_COLORS } from '../data/mock'
import { QUESTION_TYPE_LABELS } from '../types'

export default function PlayerPlayPage() {
  const navigate = useNavigate()
  const {
    role,
    phase,
    pin,
    questionCount,
    currentQuestion,
    currentQuestionIndex,
    timeLeft,
    myAnswer,
    submitAnswer,
    currentPlayerId,
    players,
    answeredCount,
    introProgress,
    introType,
    roundStats,
    connected,
    reconnecting,
  } = useGame()

  const [fillText, setFillText] = useState('')
  const [orderItems, setOrderItems] = useState<string[]>([])

  useEffect(() => {
    if (role !== 'player' || !pin) navigate('/', { replace: true })
  }, [role, pin, navigate])

  useEffect(() => {
    if (phase === 'finished') navigate('/game-over')
  }, [phase, navigate])

  useEffect(() => {
    setFillText('')
    if (currentQuestion?.type === 'order') {
      setOrderItems([...(currentQuestion.items ?? [])])
    } else {
      setOrderItems([])
    }
  }, [currentQuestion?.id, currentQuestion?.type, currentQuestion?.items])

  const me = players.find((p) => p.id === currentPlayerId)
  const waitingLobby = phase === 'lobby' || phase === 'idle'

  if (waitingLobby) {
    return (
      <div className="bg-kahoot-gradient flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <Logo />
        <div className="rounded-2xl bg-white px-6 py-5 text-kahoot-purple shadow-xl">
          <p className="text-sm font-bold text-kahoot-purple/60">已加入房间</p>
          <p className="font-display text-4xl font-black tracking-widest">{pin}</p>
          <p className="mt-2 font-black">{me?.nickname}</p>
        </div>
        <p className="max-w-xs text-white/80">等待主持人开始游戏…</p>
        <p className="text-sm text-white/50">当前房间人数：{players.length}/80</p>
        {(reconnecting || !connected) && (
          <p className="text-sm font-bold text-amber-300">网络重连中…</p>
        )}
      </div>
    )
  }

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
        <RoundStatsPanel
          stats={roundStats}
          players={players}
          currentPlayerId={currentPlayerId}
          options={currentQuestion?.options}
        />
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="bg-kahoot-gradient flex min-h-dvh items-center justify-center text-white">
        {reconnecting || !connected ? '重连中…' : '加载中…'}
      </div>
    )
  }

  if (myAnswer !== null && phase === 'question') {
    return (
      <div className="bg-kahoot-gradient flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-1000 linear"
            style={{
              width: `${
                currentQuestion.timeLimit > 0 ? (timeLeft / currentQuestion.timeLimit) * 100 : 0
              }%`,
            }}
          />
        </div>
        <CountdownRing timeLeft={timeLeft} total={currentQuestion.timeLimit} />
        <p className="px-4 font-display text-xl font-black text-white">{currentQuestion.text}</p>
        <p className="font-bold text-white/80">已提交答案</p>
        <p className="text-white/70">
          等待其他玩家… ({answeredCount}/{players.length})
        </p>
      </div>
    )
  }

  const type = currentQuestion.type || 'choice'

  const moveItem = (from: number, to: number) => {
    setOrderItems((prev) => {
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#1b0a3a]">
      <header className="flex items-center justify-between gap-2 bg-kahoot-purple px-4 py-3">
        <div className="text-sm font-bold text-white/80">
          {currentQuestionIndex + 1}/{questionCount} · {QUESTION_TYPE_LABELS[type]}
        </div>
        <div className="truncate text-xs font-bold text-white/70">{me?.nickname}</div>
        <CountdownRing timeLeft={timeLeft} total={currentQuestion.timeLimit} size={56} />
      </header>

      <div className="h-1.5 bg-white/10">
        <div
          className="h-full bg-white transition-[width] duration-1000 linear"
          style={{
            width: `${
              currentQuestion.timeLimit > 0 ? (timeLeft / currentQuestion.timeLimit) * 100 : 0
            }%`,
          }}
        />
      </div>

      <div className="bg-kahoot-purple/80 px-4 py-4">
        <h1 className="text-center font-display text-xl font-black leading-snug text-white sm:text-2xl">
          {currentQuestion.text}
        </h1>
      </div>

      {type === 'choice' && (
        <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-2 p-2 sm:gap-3 sm:p-3">
          {(currentQuestion.options ?? []).map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => void submitAnswer({ optionIndex: i }).catch(() => undefined)}
              className={`animate-pop-in flex flex-col items-center justify-center gap-2 rounded-2xl p-3 text-white shadow-lg transition active:scale-[0.97] ${ANSWER_COLORS[i].bg}`}
            >
              <AnswerShape index={i} className="h-10 w-10 sm:h-12 sm:w-12" />
              <span className="line-clamp-3 text-center text-base font-black sm:text-xl">{opt}</span>
            </button>
          ))}
        </div>
      )}

      {type === 'truefalse' && (
        <div className="grid flex-1 grid-cols-1 gap-3 p-3 sm:grid-cols-2">
          {['正确', '错误'].map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => void submitAnswer({ optionIndex: i }).catch(() => undefined)}
              className={`flex items-center justify-center rounded-2xl text-3xl font-black text-white shadow-lg active:scale-[0.98] ${
                i === 0 ? 'bg-answer-green' : 'bg-answer-red'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {type === 'fill' && (
        <div className="flex flex-1 flex-col justify-center gap-4 px-4 pb-8">
          <p className="text-center text-xs font-bold text-white/55">
            支持模糊匹配：越接近标准答案、提交越快，分数越高
          </p>
          <input
            value={fillText}
            onChange={(e) => setFillText(e.target.value.slice(0, 64))}
            placeholder="输入答案…"
            className="w-full rounded-2xl border-0 px-4 py-4 text-center text-xl font-black text-kahoot-purple outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && fillText.trim()) {
                void submitAnswer({ text: fillText }).catch(() => undefined)
              }
            }}
          />
          <button
            type="button"
            disabled={!fillText.trim()}
            onClick={() => void submitAnswer({ text: fillText }).catch(() => undefined)}
            className="rounded-2xl bg-kahoot-magenta py-4 text-xl font-black text-white disabled:opacity-50"
          >
            提交答案
          </button>
        </div>
      )}

      {type === 'order' && (
        <div className="flex flex-1 flex-col gap-3 px-3 pb-6 pt-2">
          <p className="text-center text-xs font-bold text-white/60">拖动上下按钮调整顺序</p>
          <ul className="space-y-2">
            {orderItems.map((item, i) => (
              <li
                key={`${item}-${i}`}
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-kahoot-purple"
              >
                <span className="w-6 font-black text-kahoot-purple/40">{i + 1}</span>
                <span className="flex-1 font-bold">{item}</span>
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => moveItem(i, i - 1)}
                  className="rounded-lg bg-kahoot-purple/10 px-2 py-1 text-sm font-black disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={i === orderItems.length - 1}
                  onClick={() => moveItem(i, i + 1)}
                  className="rounded-lg bg-kahoot-purple/10 px-2 py-1 text-sm font-black disabled:opacity-30"
                >
                  ↓
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void submitAnswer({ order: orderItems }).catch(() => undefined)}
            className="mt-auto rounded-2xl bg-kahoot-magenta py-4 text-xl font-black text-white"
          >
            提交排序
          </button>
        </div>
      )}
    </div>
  )
}
