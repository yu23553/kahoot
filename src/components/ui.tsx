import { ANSWER_COLORS } from '../data/mock'

export function AnswerShape({ index, className = '' }: { index: number; className?: string }) {
  const color = ANSWER_COLORS[index]?.hex ?? '#fff'
  const shape = ANSWER_COLORS[index]?.shape

  if (shape === 'triangle') {
    return (
      <svg viewBox="0 0 40 40" className={className} aria-hidden>
        <polygon points="20,4 36,34 4,34" fill={color} stroke="white" strokeWidth="2" />
      </svg>
    )
  }
  if (shape === 'diamond') {
    return (
      <svg viewBox="0 0 40 40" className={className} aria-hidden>
        <polygon points="20,3 37,20 20,37 3,20" fill={color} stroke="white" strokeWidth="2" />
      </svg>
    )
  }
  if (shape === 'circle') {
    return (
      <svg viewBox="0 0 40 40" className={className} aria-hidden>
        <circle cx="20" cy="20" r="15" fill={color} stroke="white" strokeWidth="2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect x="6" y="6" width="28" height="28" rx="3" fill={color} stroke="white" strokeWidth="2" />
    </svg>
  )
}

export function CountdownRing({
  timeLeft,
  total,
  size = 88,
}: {
  timeLeft: number
  total: number
  size?: number
}) {
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  const progress = total > 0 ? timeLeft / total : 0
  const urgent = timeLeft <= 5

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={urgent ? '#e21b3c' : '#fff'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className="transition-all duration-1000 linear"
        />
      </svg>
      <span className={`absolute text-2xl font-black ${urgent ? 'text-red-300' : 'text-white'}`}>
        {timeLeft}
      </span>
    </div>
  )
}

export function LeaderboardList({
  players,
  highlightId,
  showDelta,
  deltas,
}: {
  players: { id: string; nickname: string; score: number; avatarColor: string }[]
  highlightId?: string | null
  showDelta?: boolean
  deltas?: Record<string, number>
}) {
  return (
    <ul className="mx-auto w-full max-w-lg space-y-2">
      {players.map((p, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
        const delta = deltas?.[p.id] ?? 0
        const isMe = highlightId === p.id
        return (
          <li
            key={p.id}
            className={`animate-pop-in flex items-center gap-3 rounded-xl px-4 py-3 ${
              isMe ? 'bg-white text-kahoot-purple ring-2 ring-kahoot-magenta' : 'bg-white/15 text-white'
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="w-10 text-center text-lg font-black">{medal}</span>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: p.avatarColor }}
            >
              {p.nickname.slice(0, 1)}
            </span>
            <span className="flex-1 truncate text-left font-bold">{p.nickname}</span>
            <div className="text-right">
              <div className="font-black tabular-nums">{p.score}</div>
              {showDelta && delta > 0 && (
                <div className={`text-xs font-bold ${isMe ? 'text-green-700' : 'text-green-300'}`}>
                  +{delta}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const text = size === 'lg' ? 'text-5xl sm:text-6xl' : size === 'sm' ? 'text-2xl' : 'text-3xl'
  return (
    <div className={`font-display font-black tracking-tight ${text}`}>
      <span className="text-white">Kaho</span>
      <span className="text-kahoot-magenta">ot</span>
      <span className="ml-1 text-sm font-bold text-white/60">Mock</span>
    </div>
  )
}
