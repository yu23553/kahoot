import { ANSWER_COLORS } from '../data/mock'
import type { Player, QuestionType, RoundStatsView } from '../types'
import { QUESTION_TYPE_LABELS } from '../types'
import { AnswerShape } from './ui'

export function RoundStatsPanel({
  stats,
  players,
  currentPlayerId,
  isHost,
  onNext,
  options,
}: {
  stats: RoundStatsView
  players: Player[]
  currentPlayerId?: string | null
  isHost?: boolean
  onNext?: () => void
  options?: string[]
}) {
  const me = currentPlayerId ? stats.playerResults[currentPlayerId] : undefined
  const accuracyPct = Math.round(stats.accuracy * 100)
  const maxCount = Math.max(1, ...stats.answerCounts, ...stats.fillAnswers.map((f) => f.count))

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="text-center">
        <p className="text-sm font-bold text-white/60">
          {QUESTION_TYPE_LABELS[stats.type]} · 第 {stats.questionIndex + 1} 题结果
        </p>
        <h2 className="mt-1 font-display text-3xl font-black text-white sm:text-4xl">本题统计</h2>
        <p className="mt-2 text-sm text-white/70 line-clamp-2">{stats.questionText}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="正确率" value={`${accuracyPct}%`} />
        <StatCard label="答对人数" value={`${stats.correctCount}/${stats.totalPlayers}`} />
        <StatCard label="已作答" value={`${stats.answeredCount}/${stats.totalPlayers}`} />
      </div>

      {me && (
        <div
          className={`animate-pop-in rounded-2xl px-5 py-4 text-center font-black shadow-xl ${
            me.correct ? 'bg-answer-green text-white' : 'bg-answer-red text-white'
          }`}
        >
          <div className="text-sm opacity-80">{me.correct ? '你答对了！' : '未完全答对'}</div>
          <div className="text-4xl">+{me.gained}</div>
          {typeof me.similarity === 'number' && (
            <div className="mt-1 text-sm opacity-80">
              匹配度 {Math.round(me.similarity * 100)}%
            </div>
          )}
        </div>
      )}

      {(stats.type === 'choice' || stats.type === 'truefalse') && (
        <DistributionBars
          type={stats.type}
          counts={stats.answerCounts}
          labels={options ?? []}
          correctIndex={stats.correctIndex}
          maxCount={maxCount}
        />
      )}

      {stats.type === 'fill' && (
        <div className="rounded-2xl bg-white/10 p-4 text-white">
          <p className="mb-2 text-sm font-bold text-white/70">答案分布（模糊匹配）</p>
          <p className="mb-3 text-sm">
            标准答案：
            <span className="font-black"> {(stats.correctAnswers ?? []).join(' / ') || '—'}</span>
          </p>
          <ul className="space-y-2">
            {stats.fillAnswers.length === 0 && (
              <li className="text-white/50">本轮无人作答</li>
            )}
            {stats.fillAnswers.map((row) => (
              <li key={row.text} className="flex items-center gap-3">
                <span className="w-28 truncate text-sm font-bold sm:w-40">{row.text}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/25">
                  <div
                    className="h-full rounded-full bg-kahoot-magenta"
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm font-black">{row.count}人</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.type === 'order' && (
        <div className="rounded-2xl bg-white/10 p-4 text-white">
          <p className="mb-2 text-sm font-bold text-white/70">正确顺序</p>
          <ol className="space-y-2">
            {(stats.correctOrder ?? []).map((item, i) => (
              <li
                key={`${item}-${i}`}
                className="flex items-center gap-3 rounded-xl bg-answer-green px-4 py-3 font-black"
              >
                <span className="opacity-80">{i + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-2xl bg-white/10 p-4">
        <p className="mb-3 text-center text-sm font-bold text-white/70">本轮得分</p>
        <ul className="mx-auto max-w-md space-y-2">
          {[...players]
            .sort((a, b) => (stats.roundScores[b.id] ?? 0) - (stats.roundScores[a.id] ?? 0))
            .slice(0, 8)
            .map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  p.id === currentPlayerId ? 'bg-white text-kahoot-purple' : 'bg-white/10 text-white'
                }`}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: p.avatarColor }}
                >
                  {p.nickname.slice(0, 1)}
                </span>
                <span className="flex-1 truncate font-bold">{p.nickname}</span>
                <span className="font-black">+{stats.roundScores[p.id] ?? 0}</span>
                <span className="text-sm opacity-70">{p.score}</span>
              </li>
            ))}
        </ul>
      </div>

      {isHost && (
        <button
          type="button"
          onClick={onNext}
          className="animate-pop-in mx-auto w-full max-w-md rounded-2xl bg-kahoot-magenta py-4 text-xl font-black text-white shadow-xl hover:brightness-110"
        >
          {stats.hasNext ? '进入下一题' : '查看领奖台'}
        </button>
      )}

      {!isHost && (
        <p className="text-center text-sm font-bold text-white/55">等待主持人进入下一题…</p>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="animate-pop-in rounded-2xl bg-white/15 px-4 py-4 text-center text-white">
      <div className="text-xs font-bold uppercase tracking-wider text-white/60">{label}</div>
      <div className="mt-1 font-display text-3xl font-black">{value}</div>
    </div>
  )
}

function DistributionBars({
  type,
  counts,
  labels,
  correctIndex,
  maxCount,
}: {
  type: QuestionType
  counts: number[]
  labels: string[]
  correctIndex: number | null
  maxCount: number
}) {
  const n = type === 'truefalse' ? 2 : 4
  return (
    <div className="rounded-2xl bg-white/10 p-4 text-white">
      <p className="mb-3 text-sm font-bold text-white/70">答案分布</p>
      <div className="space-y-3">
        {Array.from({ length: n }, (_, i) => {
          const color =
            type === 'truefalse'
              ? i === 0
                ? 'bg-answer-green'
                : 'bg-answer-red'
              : ANSWER_COLORS[i].bg
          const isCorrect = correctIndex === i
          return (
            <div key={i} className="flex items-center gap-3">
              {type === 'choice' && <AnswerShape index={i} className="h-8 w-8 shrink-0" />}
              <span className="w-24 truncate text-sm font-bold sm:w-40">
                {labels[i] || (type === 'truefalse' ? (i === 0 ? '正确' : '错误') : `选项 ${i + 1}`)}
              </span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-black/25">
                <div
                  className={`h-full rounded-full ${color} ${isCorrect ? 'ring-2 ring-white' : ''}`}
                  style={{ width: `${((counts[i] ?? 0) / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right font-black">{counts[i] ?? 0}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
