import { QUESTION_TYPE_HINTS, QUESTION_TYPE_LABELS, type QuestionType } from '../types'

const TYPE_VISUAL: Record<
  QuestionType,
  { bg: string; shapes: string[]; accent: string }
> = {
  choice: {
    bg: 'from-[#e21b3c] via-[#1368ce] to-[#26890c]',
    shapes: ['▲', '◆', '●', '■'],
    accent: '#c039f3',
  },
  truefalse: {
    bg: 'from-[#26890c] to-[#e21b3c]',
    shapes: ['✓', '✗'],
    accent: '#26890c',
  },
  fill: {
    bg: 'from-[#1368ce] to-[#46178f]',
    shapes: ['A_', '…'],
    accent: '#1368ce',
  },
  order: {
    bg: 'from-[#d89e00] to-[#ff6b35]',
    shapes: ['1', '2', '3'],
    accent: '#d89e00',
  },
}

export function QuestionIntro({
  type,
  index,
  total,
  progress,
}: {
  type: QuestionType
  index: number
  total: number
  /** 0–1 remaining */
  progress: number
}) {
  const visual = TYPE_VISUAL[type] || TYPE_VISUAL.choice

  return (
    <div className="bg-kahoot-gradient flex min-h-dvh flex-col items-center justify-center gap-8 px-4 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/55">
        Question {index + 1} / {total}
      </p>

      <div
        className={`animate-intro-burst relative flex h-40 w-40 items-center justify-center rounded-[2rem] bg-gradient-to-br shadow-2xl sm:h-52 sm:w-52 ${visual.bg}`}
      >
        <div className="absolute inset-3 rounded-[1.5rem] border-2 border-white/25" />
        <div className="flex flex-wrap items-center justify-center gap-2 px-4 text-4xl font-black text-white sm:text-5xl">
          {visual.shapes.map((s) => (
            <span key={s} className="animate-pop-in drop-shadow-lg">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="animate-pop-in space-y-2">
        <h1 className="font-display text-4xl font-black text-white sm:text-5xl">
          {QUESTION_TYPE_LABELS[type]}
        </h1>
        <p className="mx-auto max-w-sm text-base font-bold text-white/75 sm:text-lg">
          {QUESTION_TYPE_HINTS[type]}
        </p>
      </div>

      <div className="w-full max-w-md space-y-2">
        <div className="h-3 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-200 ease-linear"
            style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%`, background: visual.accent }}
          />
        </div>
        <p className="text-xs font-bold text-white/50">即将开始答题…</p>
      </div>
    </div>
  )
}
