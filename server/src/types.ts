export type QuestionType = 'choice' | 'truefalse' | 'fill' | 'order'

export type Question = {
  id: string
  type: QuestionType
  text: string
  timeLimit: number
  /** 选择题 4 项 / 判断题 2 项 */
  options?: string[]
  /** 选择/判断的正确答案下标 */
  correctIndex?: number
  /** 填空题可接受答案（不区分大小写，支持模糊） */
  acceptAnswers?: string[]
  /** 排序题：按正确顺序排列的条目 */
  items?: string[]
}

export type Quiz = {
  id: string
  title: string
  questions: Question[]
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
  /** 排序题本轮发给玩家的打乱顺序 */
  shuffledItems: string[] | null
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
}

export type PublicQuestion = {
  index: number
  total: number
  type: QuestionType
  text: string
  timeLimit: number
  endsAt: number
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
/** 大厅空闲（无玩家或无主持活动）超时 */
export const LOBBY_IDLE_MS = 45 * 60 * 1000
/** 结束后房间保留时间 */
export const FINISHED_IDLE_MS = 20 * 60 * 1000
/** 游戏中无任何活动超时（极端断线） */
export const IN_GAME_IDLE_MS = 3 * 60 * 60 * 1000
