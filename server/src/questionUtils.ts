import { v4 as uuid } from 'uuid'
import type {
  AnswerPayload,
  PublicQuestion,
  Question,
  QuestionLocale,
  QuestionType,
  Quiz,
  QuizLanguage,
  Room,
  StoredAnswer,
} from './types.js'
import {
  DEFAULT_QUESTION_POINTS,
  MAX_QUESTION_POINTS,
  MIN_QUESTION_POINTS,
} from './types.js'

function clampIndex(value: unknown, size: number) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n >= size) return 0
  return Math.floor(n)
}

function emptyLocale(type: QuestionType): QuestionLocale {
  if (type === 'choice') return { text: '', options: ['', '', '', ''] }
  if (type === 'truefalse') return { text: '', options: ['正确', '错误'] }
  if (type === 'fill') return { text: '', acceptAnswers: [''] }
  return { text: '', items: ['', ''] }
}

/** 兼容旧题库：无 locales 时从顶层 text/options 迁入 */
export function normalizeQuestion(
  raw: Partial<Question> & {
    text?: string
    options?: string[]
    acceptAnswers?: string[]
    items?: string[]
    locales?: Record<string, QuestionLocale>
  },
  languageCodes: string[] = ['zh'],
): Question {
  const type = (raw.type || 'choice') as QuestionType
  const codes = languageCodes.length ? languageCodes : ['zh']
  const locales: Record<string, QuestionLocale> = {}

  const legacy: QuestionLocale = {
    text: String(raw.text ?? '').trim(),
    options: raw.options?.map((o) => String(o)),
    acceptAnswers: raw.acceptAnswers?.map((a) => String(a)),
    items: raw.items?.map((i) => String(i)),
  }

  for (const code of codes) {
    const src = raw.locales?.[code] ?? (code === codes[0] ? legacy : undefined) ?? emptyLocale(type)
    locales[code] = normalizeLocale(type, src)
  }

  // 保留 locales 里多余的 key（编辑时临时语言）
  if (raw.locales) {
    for (const [code, loc] of Object.entries(raw.locales)) {
      if (!locales[code]) locales[code] = normalizeLocale(type, loc)
    }
  }

  const primary = locales[codes[0]]
  const pointsRaw = Number((raw as { points?: number }).points)
  const points = Number.isFinite(pointsRaw)
    ? Math.min(MAX_QUESTION_POINTS, Math.max(MIN_QUESTION_POINTS, Math.round(pointsRaw)))
    : DEFAULT_QUESTION_POINTS
  const base: Question = {
    id: raw.id || uuid(),
    type,
    timeLimit: Number(raw.timeLimit) || 20,
    points,
    locales,
  }

  if (type === 'choice') {
    return { ...base, correctIndex: clampIndex(raw.correctIndex, 4) }
  }
  if (type === 'truefalse') {
    return { ...base, correctIndex: Number(raw.correctIndex) === 1 ? 1 : 0 }
  }
  // 确保主语言有内容引用方便调试
  void primary
  return base
}

function normalizeLocale(type: QuestionType, src: QuestionLocale): QuestionLocale {
  const text = String(src.text ?? '').trim()
  if (type === 'choice') {
    const options = (src.options ?? ['', '', '', '']).map((o) => String(o).trim())
    while (options.length < 4) options.push('')
    return { text, options: options.slice(0, 4) }
  }
  if (type === 'truefalse') {
    const options = (src.options ?? ['正确', '错误']).map((o) => String(o).trim())
    return {
      text,
      options: [options[0] || '正确', options[1] || '错误'],
    }
  }
  if (type === 'fill') {
    return {
      text,
      acceptAnswers: (src.acceptAnswers ?? []).map((a) => String(a).trim()).filter(Boolean),
    }
  }
  return {
    text,
    items: (src.items ?? []).map((i) => String(i).trim()).filter(Boolean),
  }
}

export function normalizeQuizLanguages(
  languages: QuizLanguage[] | undefined,
  defaultLanguage?: string,
): { languages: QuizLanguage[]; defaultLanguage: string } {
  let list = (languages ?? [])
    .map((l) => ({
      code: String(l.code ?? '')
        .trim()
        .toLowerCase()
        .slice(0, 16),
      label: String(l.label ?? '').trim().slice(0, 32),
    }))
    .filter((l) => l.code && l.label)

  if (list.length === 0) {
    list = [{ code: 'zh', label: '中文' }]
  }

  // 去重 code
  const seen = new Set<string>()
  list = list.filter((l) => {
    if (seen.has(l.code)) return false
    seen.add(l.code)
    return true
  })

  const def =
    defaultLanguage && list.some((l) => l.code === defaultLanguage)
      ? defaultLanguage
      : list[0].code

  return { languages: list, defaultLanguage: def }
}

export function normalizeQuizPayload(raw: {
  title?: string
  questions?: unknown[]
  languages?: QuizLanguage[]
  defaultLanguage?: string
}): { title: string; questions: Question[]; languages: QuizLanguage[]; defaultLanguage: string } {
  const title = String(raw.title ?? '').trim()
  const { languages, defaultLanguage } = normalizeQuizLanguages(
    raw.languages,
    raw.defaultLanguage,
  )
  const codes = languages.map((l) => l.code)
  const questions = (raw.questions ?? []).map((q) =>
    normalizeQuestion(q as Parameters<typeof normalizeQuestion>[0], codes),
  )
  return { title, questions, languages, defaultLanguage }
}

export function validateQuestions(questions: Question[], languages: QuizLanguage[]) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('至少需要 1 道题')
  }
  if (!languages.length) throw new Error('至少需要一种语言')

  for (const q of questions) {
    if (!q.timeLimit || q.timeLimit < 5 || q.timeLimit > 120) {
      throw new Error('倒计时需在 5–120 秒')
    }
    if (
      !Number.isFinite(q.points) ||
      q.points < MIN_QUESTION_POINTS ||
      q.points > MAX_QUESTION_POINTS
    ) {
      throw new Error(`题目分值需在 ${MIN_QUESTION_POINTS}–${MAX_QUESTION_POINTS}`)
    }
    for (const lang of languages) {
      const loc = q.locales?.[lang.code]
      if (!loc?.text?.trim()) {
        throw new Error(`请完善「${lang.label}」语言下的题干`)
      }
      if (q.type === 'choice') {
        if (!loc.options || loc.options.length !== 4 || loc.options.some((o) => !o.trim())) {
          throw new Error(`「${lang.label}」选择题需要 4 个非空选项`)
        }
      }
      if (q.type === 'truefalse') {
        if (!loc.options || loc.options.length < 2 || loc.options.some((o) => !o.trim())) {
          throw new Error(`请完善「${lang.label}」判断题选项文案`)
        }
      }
      if (q.type === 'fill') {
        if (!loc.acceptAnswers?.length) {
          throw new Error(`「${lang.label}」填空题至少需要 1 个可接受答案`)
        }
      }
      if (q.type === 'order') {
        if (!loc.items || loc.items.length < 2) {
          throw new Error(`「${lang.label}」排序题至少需要 2 个条目`)
        }
        if (loc.items.length > 8) throw new Error('排序题最多 8 个条目')
      }
    }

    // 各语言排序条目数量必须一致
    if (q.type === 'order') {
      const counts = languages.map((l) => q.locales[l.code]?.items?.length ?? 0)
      if (counts.some((c) => c !== counts[0])) {
        throw new Error('各语言排序题条目数量必须相同')
      }
    }

    if (q.type === 'choice') {
      if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex > 3) {
        throw new Error('请设置选择题正确答案')
      }
    }
    if (q.type === 'truefalse') {
      if (q.correctIndex !== 0 && q.correctIndex !== 1) {
        throw new Error('请设置判断题正确答案')
      }
    }
  }
}

export function resolveLocale(
  q: Question,
  language: string,
  fallback: string,
): QuestionLocale & { language: string } {
  const loc =
    q.locales?.[language] ||
    q.locales?.[fallback] ||
    q.locales?.[Object.keys(q.locales ?? {})[0]] ||
    emptyLocale(q.type || 'choice')
  const used =
    q.locales?.[language] ? language : q.locales?.[fallback] ? fallback : Object.keys(q.locales ?? {})[0] || fallback
  return { ...loc, language: used }
}

export function quizLanguages(quiz: Quiz): QuizLanguage[] {
  if (quiz.languages?.length) return quiz.languages
  return [{ code: 'zh', label: '中文' }]
}

export function quizDefaultLanguage(quiz: Quiz): string {
  const langs = quizLanguages(quiz)
  if (quiz.defaultLanguage && langs.some((l) => l.code === quiz.defaultLanguage)) {
    return quiz.defaultLanguage
  }
  return langs[0].code
}

export function shuffle<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

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

export const FILL_CORRECT_THRESHOLD = 0.72

export function isAnswerCorrect(
  q: Question,
  answer: StoredAnswer | null | undefined,
  language: string,
  fallback: string,
): boolean {
  if (!answer) return false
  const loc = resolveLocale(q, language, fallback)
  if (q.type === 'choice' || q.type === 'truefalse') {
    return answer.optionIndex === q.correctIndex
  }
  if (q.type === 'fill') {
    const sim =
      answer.similarity ?? fillSimilarity(String(answer.text ?? ''), loc.acceptAnswers ?? [])
    return sim >= FILL_CORRECT_THRESHOLD
  }
  if (q.type === 'order') {
    const order = answer.order ?? []
    const correct = loc.items ?? []
    if (order.length !== correct.length) return false
    return order.every((item, i) => item === correct[i])
  }
  return false
}

export function calcFillScore(
  similarity: number,
  elapsedMs: number,
  timeLimitSec: number,
  maxPoints = DEFAULT_QUESTION_POINTS,
) {
  if (similarity < 0.4) return 0
  const ratio = Math.min(1, Math.max(0, elapsedMs / (timeLimitSec * 1000)))
  const timeFactor = 1 - ratio / 2
  return Math.round(maxPoints * similarity * timeFactor)
}

export function questionPoints(q: { points?: number }) {
  const n = Number(q.points)
  if (!Number.isFinite(n)) return DEFAULT_QUESTION_POINTS
  return Math.min(MAX_QUESTION_POINTS, Math.max(MIN_QUESTION_POINTS, Math.round(n)))
}

export function toPublicQuestion(room: Room, language: string): PublicQuestion {
  const q = room.quiz.questions[room.currentQuestionIndex]
  const fallback = quizDefaultLanguage(room.quiz)
  const loc = resolveLocale(q, language, fallback)
  const base: PublicQuestion = {
    index: room.currentQuestionIndex,
    total: room.quiz.questions.length,
    type: q.type || 'choice',
    text: loc.text,
    timeLimit: q.timeLimit,
    endsAt: room.questionEndsAt,
    language: loc.language,
  }
  if (q.type === 'choice' || q.type === 'truefalse' || !q.type) {
    return { ...base, type: q.type || 'choice', options: loc.options }
  }
  if (q.type === 'fill') {
    return base
  }
  const items = loc.items ?? []
  const indices =
    room.shuffledIndices ?? items.map((_, i) => i)
  return {
    ...base,
    items: indices.map((i) => items[i]).filter((x) => x !== undefined),
  }
}

export function sanitizeAnswerPayload(
  q: Question,
  payload: AnswerPayload,
  language: string,
  fallback: string,
): StoredAnswer | null {
  const loc = resolveLocale(q, language, fallback)
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
    const items = loc.items ?? []
    if (!order || order.length !== items.length) return null
    const set = new Set(items)
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
