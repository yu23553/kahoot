export type QuestionType = 'choice' | 'truefalse' | 'fill' | 'order'

export type QuizLanguage = {
  code: string
  label: string
}

/** 某一语言下的题干与选项/答案文案 */
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
  /** 选择/判断正确答案下标（各语言共用） */
  correctIndex?: number
  /** 按语言 code 存储文案；至少包含测验的每一种语言 */
  locales: Record<string, QuestionLocale>
}

export type Quiz = {
  id: string
  title: string
  questions: Question[]
  languages: QuizLanguage[]
  defaultLanguage: string
  ownerId: string
  createdAt: number
  updatedAt: number
}

export type User = {
  id: string
  username: string
  passwordHash: string
  createdAt: number
}

export type Player = {
  id: string
  nickname: string
  score: number
  avatarColor: string
  socketId: string
  /** 答题所用语言 code */
  language: string
}

export type RoomPhase =
  | 'lobby'
  | 'intro'
  | 'question'
  | 'stats'
  | 'finished'

export type StoredAnswer = {
  elapsedMs: number
  optionIndex?: number
  text?: string
  order?: string[]
  /** 填空题相似度 0–1 */
  similarity?: number
}

export type FillAnswerStat = {
  text: string
  count: number
  avgSimilarity: number
}

export type RoundStats = {
  questionIndex: number
  type: QuestionType
  questionText: string
  correctIndex?: number
  correctAnswers?: string[]
  correctOrder?: string[]
  options?: string[]
  answerCounts: number[]
  fillAnswers: FillAnswerStat[]
  correctCount: number
  answeredCount: number
  totalPlayers: number
  accuracy: number
  roundScores: Record<string, number>
  playerResults: Record<
    string,
    {
      correct: boolean
      gained: number
      similarity?: number
      answer?: { optionIndex?: number; text?: string; order?: string[] }
    }
  >
}

export type Room = {
  pin: string
  hostId: string
  hostSocketId: string | null
  quiz: Quiz
  players: Map<string, Player>
  phase: RoomPhase
  currentQuestionIndex: number
  introEndsAt: number
  questionStartedAt: number
  questionEndsAt: number
  answers: Map<string, StoredAnswer>
  lastRoundScores: Map<string, number>
  lastRoundStats: RoundStats | null
  /** 排序题：打乱后的下标序列（各语言共用下标） */
  shuffledIndices: number[] | null
  createdAt: number
  lastActiveAt: number
  timer: NodeJS.Timeout | null
  introTimer: NodeJS.Timeout | null
}

export type PublicPlayer = {
  id: string
  nickname: string
  score: number
  avatarColor: string
  language?: string
}

export type PublicQuestion = {
  index: number
  total: number
  type: QuestionType
  text: string
  timeLimit: number
  endsAt: number
  language: string
  options?: string[]
  items?: string[]
}

export type AnswerPayload = {
  optionIndex?: number
  text?: string
  order?: string[]
}

export const MAX_ROOM_PLAYERS = 80
export const INTRO_DURATION_MS = 5000
export const LOBBY_IDLE_MS = 45 * 60 * 1000
export const FINISHED_IDLE_MS = 20 * 60 * 1000
export const IN_GAME_IDLE_MS = 3 * 60 * 60 * 1000

export const PRESET_LANGUAGES: QuizLanguage[] = [
  { code: 'zh', label: '中文' },
  { code: 'th', label: 'ไทย' },
  { code: 'id', label: 'Indonesia' },
  { code: 'en', label: 'English' },
]
