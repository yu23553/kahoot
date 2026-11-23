export type QuestionType = 'choice' | 'truefalse' | 'fill' | 'order'

export type QuizLanguage = {
  code: string
  label: string
}

export type QuestionLocale = {
  text: string
  options?: string[]
  acceptAnswers?: string[]
  items?: string[]
}

export type Question = {
  id: string
  type: QuestionType
  timeLimit: number
  correctIndex?: number
  locales: Record<string, QuestionLocale>
}

export type Player = {
  id: string
  nickname: string
  score: number
  avatarColor: string
  language?: string
  isMock?: boolean
}

export type GamePhase =
  | 'idle'
  | 'lobby'
  | 'intro'
  | 'question'
  | 'stats'
  | 'finished'

export type QuizDraft = {
  title: string
  languages: QuizLanguage[]
  defaultLanguage: string
  questions: Question[]
}

export type PublicQuestion = {
  index: number
  total: number
  type: QuestionType
  text: string
  timeLimit: number
  endsAt: number
  language?: string
  options?: string[]
  items?: string[]
}

export type MyAnswer =
  | { optionIndex: number }
  | { text: string; similarity?: number }
  | { order: string[] }
  | null

export type FillAnswerStat = {
  text: string
  count: number
  avgSimilarity: number
}

export type PlayerRoundResult = {
  correct: boolean
  gained: number
  similarity?: number
  answer?: { optionIndex?: number; text?: string; order?: string[] }
}

export type RoundStatsView = {
  questionIndex: number
  type: QuestionType
  questionText: string
  correctIndex: number | null
  correctAnswers: string[] | null
  correctOrder: string[] | null
  options?: string[]
  answerCounts: number[]
  fillAnswers: FillAnswerStat[]
  correctCount: number
  answeredCount: number
  totalPlayers: number
  accuracy: number
  roundScores: Record<string, number>
  playerResults: Record<string, PlayerRoundResult>
  hasNext: boolean
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  choice: '选择题',
  truefalse: '判断题',
  fill: '填空题',
  order: '排序题',
}

export const QUESTION_TYPE_HINTS: Record<QuestionType, string> = {
  choice: '从四个选项中选出正确答案',
  truefalse: '判断题目说法是否正确',
  fill: '输入答案，越接近标准答案分越高',
  order: '将条目调整为正确顺序',
}

export const PRESET_LANGUAGES: QuizLanguage[] = [
  { code: 'zh', label: '中文' },
  { code: 'th', label: 'ไทย' },
  { code: 'id', label: 'Indonesia' },
  { code: 'en', label: 'English' },
]
