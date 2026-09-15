import { v4 as uuid } from 'uuid'
import type { AnswerPayload, PublicQuestion, Question, QuestionType, Room, StoredAnswer } from './types.js'

export function normalizeQuestion(raw: Partial<Question> & { text?: string }): Question {
  const type = (raw.type || 'choice') as QuestionType
  const base = {
    id: raw.id || uuid(),
    type,
    text: String(raw.text ?? '').trim(),
    timeLimit: Number(raw.timeLimit) || 20,
  }

  if (type === 'choice') {
    const options = (raw.options ?? ['', '', '', '']).map((o) => String(o).trim())
    while (options.length < 4) options.push('')
    return {
      ...base,
      options: options.slice(0, 4),
      correctIndex: clampIndex(raw.correctIndex, 4),
    }
  }

  if (type === 'truefalse') {
    return {
      ...base,
      options: ['正确', '错误'],
      correctIndex: Number(raw.correctIndex) === 1 ? 1 : 0,
    }
  }

  if (type === 'fill') {
    const acceptAnswers = (raw.acceptAnswers ?? [])
      .map((a) => String(a).trim())
      .filter(Boolean)
    return { ...base, acceptAnswers }
  }

  const items = (raw.items ?? []).map((i) => String(i).trim()).filter(Boolean)
  return { ...base, items }
}

export function validateQuestions(questions: Question[]) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('至少需要 1 道题')
  }
  for (const raw of questions) {
    const q = normalizeQuestion(raw)
    if (!q.text) throw new Error('题干不能为空')
    if (!q.timeLimit || q.timeLimit < 5 || q.timeLimit > 120) {
      throw new Error('倒计时需在 5–120 秒')
    }
    if (q.type === 'choice') {
      if (!q.options || q.options.length !== 4 || q.options.some((o) => !o)) {
        throw new Error('选择题需要 4 个非空选项')
      }
      if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex > 3) {
        throw new Error('请设置选择题正确答案')
      }
    }
    if (q.type === 'truefalse') {
      if (q.correctIndex !== 0 && q.correctIndex !== 1) {
        throw new Error('请设置判断题正确答案')
      }
    }
    if (q.type === 'fill') {
      if (!q.acceptAnswers?.length) throw new Error('填空题至少需要 1 个可接受答案')
    }
    if (q.type === 'order') {
      if (!q.items || q.items.length < 2) throw new Error('排序题至少需要 2 个条目')
      if (q.items.length > 8) throw new Error('排序题最多 8 个条目')
    }
  }
}

function clampIndex(value: unknown, size: number) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n >= size) return 0
  return Math.floor(n)
}

export function shuffle<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** 填空规范化：去空格、小写、全角转半角 */
export function normalizeFillText(input: string) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
}

function levenshtein(a: string, b: string) {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = new Array<number>(n + 1)
  for (let j = 0; j <= n; j += 1) dp[j] = j
  for (let i = 1; i <= m; i += 1) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j += 1) {
      const tmp = dp[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  return dp[n]
}

/** 与标准答案的最佳相似度 0–1 */
export function fillSimilarity(answer: string, acceptAnswers: string[] = []): number {
  const n = normalizeFillText(answer)
  if (!n) return 0
  let best = 0
  for (const raw of acceptAnswers) {
    const t = normalizeFillText(raw)
    if (!t) continue
    if (n === t) return 1
    const longer = Math.max(n.length, t.length)
    const shorter = Math.min(n.length, t.length)
    if (n.includes(t) || t.includes(n)) {
      best = Math.max(best, shorter / longer)
    }
    const ratio = 1 - levenshtein(n, t) / longer
    best = Math.max(best, Math.max(0, ratio))
  }
  return best
}

/** 填空：相似度 ≥ 0.72 视为“答对”（用于正确率统计） */
export const FILL_CORRECT_THRESHOLD = 0.72

export function isAnswerCorrect(q: Question, answer?: StoredAnswer | null): boolean {
  if (!answer) return false
  if (q.type === 'choice' || q.type === 'truefalse') {
    return answer.optionIndex === q.correctIndex
  }
  if (q.type === 'fill') {
    const sim =
      answer.similarity ?? fillSimilarity(String(answer.text ?? ''), q.acceptAnswers ?? [])
    return sim >= FILL_CORRECT_THRESHOLD
  }
  if (q.type === 'order') {
    const order = answer.order ?? []
    const correct = q.items ?? []
    if (order.length !== correct.length) return false
    return order.every((item, i) => item === correct[i])
  }
  return false
}

/**
 * 填空计分：越接近标准答案越高，同等接近时越快越高。
 * 满分约 1000；完全不沾边（<0.4）得 0。
 */
export function calcFillScore(similarity: number, elapsedMs: number, timeLimitSec: number) {
  if (similarity < 0.4) return 0
  const ratio = Math.min(1, Math.max(0, elapsedMs / (timeLimitSec * 1000)))
  const timeFactor = 1 - ratio / 2
  return Math.round(1000 * similarity * timeFactor)
}

export function toPublicQuestion(room: Room): PublicQuestion {
  const q = room.quiz.questions[room.currentQuestionIndex]
  const base: PublicQuestion = {
    index: room.currentQuestionIndex,
    total: room.quiz.questions.length,
    type: q.type || 'choice',
    text: q.text,
    timeLimit: q.timeLimit,
    endsAt: room.questionEndsAt,
  }
  if (q.type === 'choice' || q.type === 'truefalse' || !q.type) {
    return { ...base, type: q.type || 'choice', options: q.options }
  }
  if (q.type === 'fill') {
    return base
  }
  return {
    ...base,
    items: room.shuffledItems ?? shuffle(q.items ?? []),
  }
}

export function sanitizeAnswerPayload(q: Question, payload: AnswerPayload): StoredAnswer | null {
  if (q.type === 'choice') {
    const idx = Number(payload.optionIndex)
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) return null
    return { optionIndex: idx, elapsedMs: 0 }
  }
  if (q.type === 'truefalse') {
    const idx = Number(payload.optionIndex)
    if (idx !== 0 && idx !== 1) return null
    return { optionIndex: idx, elapsedMs: 0 }
  }
  if (q.type === 'fill') {
    const text = String(payload.text ?? '').trim()
    if (!text) return null
    return { text: text.slice(0, 64), elapsedMs: 0 }
  }
  if (q.type === 'order') {
    const order = Array.isArray(payload.order) ? payload.order.map(String) : null
    if (!order || order.length !== (q.items?.length ?? 0)) return null
    const set = new Set(q.items)
    if (order.some((item) => !set.has(item)) || new Set(order).size !== order.length) return null
    return { order, elapsedMs: 0 }
  }
  return null
}

export function typeLabel(type: QuestionType) {
  switch (type) {
    case 'truefalse':
      return '判断题'
    case 'fill':
      return '填空题'
    case 'order':
      return '排序题'
    default:
      return '选择题'
  }
}
