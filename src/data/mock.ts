import type { Question, QuestionLocale, QuestionType, QuizDraft, QuizLanguage } from '../types'

export const ANSWER_COLORS = [
  { key: 'red', bg: 'bg-answer-red', hex: '#e21b3c', shape: 'triangle' as const },
  { key: 'blue', bg: 'bg-answer-blue', hex: '#1368ce', shape: 'diamond' as const },
  { key: 'yellow', bg: 'bg-answer-yellow', hex: '#d89e00', shape: 'circle' as const },
  { key: 'green', bg: 'bg-answer-green', hex: '#26890c', shape: 'square' as const },
] as const

export function createId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function emptyLocale(type: QuestionType, languageCode = 'zh'): QuestionLocale {
  if (type === 'truefalse') {
    if (languageCode === 'th') return { text: '', options: ['ถูก', 'ผิด'] }
    if (languageCode === 'id') return { text: '', options: ['Benar', 'Salah'] }
    if (languageCode === 'en') return { text: '', options: ['True', 'False'] }
    return { text: '', options: ['正确', '错误'] }
  }
  if (type === 'fill') return { text: '', acceptAnswers: [''] }
  if (type === 'order') return { text: '', items: ['', ''] }
  return { text: '', options: ['', '', '', ''] }
}

export function createEmptyQuestion(
  type: QuestionType = 'choice',
  languages: QuizLanguage[] = [{ code: 'zh', label: '中文' }],
): Question {
  const locales: Record<string, QuestionLocale> = {}
  for (const lang of languages) {
    locales[lang.code] = emptyLocale(type, lang.code)
  }
  const base = {
    id: createId('q'),
    type,
    timeLimit: type === 'fill' ? 30 : type === 'order' ? 40 : type === 'truefalse' ? 15 : 20,
    points: 1000,
    locales,
  }
  if (type === 'choice' || type === 'truefalse') {
    return { ...base, type, correctIndex: 0 }
  }
  return { ...base, type }
}

/** 给题目补全新语言空 locale / 切换题型时重建 */
export function ensureQuestionLocales(
  q: Question,
  languages: QuizLanguage[],
  type = q.type,
): Question {
  const locales: Record<string, QuestionLocale> = {}
  for (const lang of languages) {
    const prev = q.locales?.[lang.code]
    if (prev && q.type === type) {
      locales[lang.code] = prev
    } else {
      locales[lang.code] = emptyLocale(type, lang.code)
      if (prev?.text) locales[lang.code].text = prev.text
    }
  }
  const next: Question = {
    id: q.id,
    type,
    timeLimit: q.timeLimit,
    points: Number.isFinite(q.points) ? q.points : 1000,
    locales,
  }
  if (type === 'choice' || type === 'truefalse') {
    next.correctIndex = q.correctIndex ?? 0
  }
  return next
}

export const DEFAULT_QUIZ: QuizDraft = {
  title: '多题型趣味挑战',
  languages: [{ code: 'zh', label: '中文' }],
  defaultLanguage: 'zh',
  questions: [
    {
      id: 'q1',
      type: 'choice',
      timeLimit: 20,
      points: 1000,
      correctIndex: 1,
      locales: {
        zh: {
          text: '太阳系中最大的行星是？',
          options: ['地球', '木星', '土星', '火星'],
        },
      },
    },
    {
      id: 'q2',
      type: 'truefalse',
      timeLimit: 12,
      points: 500,
      correctIndex: 0,
      locales: {
        zh: {
          text: '一年有 365 天（平年）。',
          options: ['正确', '错误'],
        },
      },
    },
    {
      id: 'q3',
      type: 'fill',
      timeLimit: 25,
      points: 1500,
      locales: {
        zh: {
          text: 'HTML 中用来创建超链接的标签名是？（填写标签名，如 a）',
          acceptAnswers: ['a', 'A', '<a>'],
        },
      },
    },
    {
      id: 'q4',
      type: 'order',
      timeLimit: 35,
      points: 2000,
      locales: {
        zh: {
          text: '将一周按从周一到周四的顺序排列：',
          items: ['周一', '周二', '周三', '周四'],
        },
      },
    },
  ],
}
