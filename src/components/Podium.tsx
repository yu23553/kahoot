import { useEffect, useState } from 'react'
import type { Player } from '../types'

export function Podium({
  players,
  highlightId,
}: {
  players: Player[]
  highlightId?: string | null
}) {
  const [step, setStep] = useState(0)
  const top3 = players.slice(0, 3)
  const first = top3[0]
  const second = top3[1]
  const third = top3[2]

  useEffect(() => {
    setStep(0)
    const t1 = window.setTimeout(() => setStep(1), 200)
    const t2 = window.setTimeout(() => setStep(2), 700)
    const t3 = window.setTimeout(() => setStep(3), 1200)
    const t4 = window.setTimeout(() => setStep(4), 1800)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
    }
  }, [players])

  return (
    <div className="w-full max-w-xl">
      <div className="flex items-end justify-center gap-3 sm:gap-5" style={{ minHeight: 280 }}>
        <PodiumColumn
          player={second}
          place={2}
          height={140}
          visible={step >= 1}
          highlight={highlightId === second?.id}
          delay={0}
        />
        <PodiumColumn
          player={first}
          place={1}
          height={200}
          visible={step >= 2}
          highlight={highlightId === first?.id}
          delay={80}
          crown={step >= 4}
        />
        <PodiumColumn
          player={third}
          place={3}
          height={110}
          visible={step >= 3}
          highlight={highlightId === third?.id}
          delay={40}
        />
      </div>
    </div>
  )
}

function PodiumColumn({
  player,
  place,
  height,
  visible,
  highlight,
  delay,
  crown,
}: {
  player?: Player
  place: 1 | 2 | 3
  height: number
  visible: boolean
  highlight?: boolean
  delay: number
  crown?: boolean
}) {
  const colors = {
    1: 'from-[#ffd700] to-[#f5a623]',
    2: 'from-[#c0c7d1] to-[#8e9aab]',
    3: 'from-[#cd7f32] to-[#a05a2c]',
  } as const

  if (!player) {
    return <div className="w-24 sm:w-28" />
  }

  return (
    <div
      className={`flex w-24 flex-col items-center sm:w-28 ${visible ? 'animate-podium-rise' : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative mb-2 flex flex-col items-center">
        {crown && (
          <div className="animate-pop-in absolute -top-7 text-2xl" aria-hidden>
            👑
          </div>
        )}
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-black text-white shadow-lg ring-4 ${
            highlight ? 'ring-kahoot-magenta' : 'ring-white/40'
          }`}
          style={{ background: player.avatarColor }}
        >
          {player.nickname.slice(0, 1)}
        </div>
        <p className="mt-2 max-w-full truncate text-center text-sm font-black text-white">
          {player.nickname}
        </p>
        <p className="text-xs font-bold text-white/70">{player.score} 分</p>
      </div>
      <div
        className={`flex w-full items-start justify-center rounded-t-2xl bg-gradient-to-b pt-3 font-display text-3xl font-black text-white/90 shadow-inner ${colors[place]}`}
        style={{ height }}
      >
        {place}
      </div>
    </div>
  )
}
