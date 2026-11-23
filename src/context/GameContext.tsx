import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { emitAck, getSocket } from '../lib/socket'
import type {
  FillAnswerStat,
  GamePhase,
  MyAnswer,
  Player,
  PlayerRoundResult,
  PublicQuestion,
  QuestionType,
  RoundStatsView,
} from '../types'

type Role = 'none' | 'host' | 'player'

type AnswerPayload = {
  optionIndex?: number
  text?: string
  order?: string[]
}

type SessionPersist = {
  role: Role
  pin: string
  playerId?: string
}

type GameContextValue = {
  role: Role
  pin: string
  quizTitle: string
  questionCount: number
  players: Player[]
  currentPlayerId: string | null
  phase: GamePhase
  currentQuestionIndex: number
  timeLeft: number
  introProgress: number
  introType: QuestionType | null
  currentQuestion: {
    id: string
    type: QuestionType
    text: string
    timeLimit: number
    options?: string[]
    items?: string[]
    correctIndex?: number
    acceptAnswers?: string[]
    language?: string
  } | null
  myAnswer: MyAnswer
  correctIndex: number | null
  correctAnswers: string[] | null
  correctOrder: string[] | null
  answerCounts: number[]
  correctCount: number
  lastRoundScores: Record<string, number>
  roundStats: RoundStatsView | null
  answeredCount: number
  sortedPlayers: Player[]
  connected: boolean
  reconnecting: boolean
  error: string
  clearError: () => void
  createRoom: (quizId: string) => Promise<void>
  myLanguage: string | null
  roomLanguages: { code: string; label: string }[]
  joinGame: (pin: string, nickname: string, language?: string) => Promise<void>
  previewRoom: (
    pin: string,
  ) => Promise<{
    title: string
    languages: { code: string; label: string }[]
    defaultLanguage: string
  }>
  startGame: () => Promise<void>
  nextQuestion: () => Promise<void>
  submitAnswer: (payload: AnswerPayload) => Promise<void>
  backToLobby: () => Promise<void>
  goHome: () => void
}

const GameContext = createContext<GameContextValue | null>(null)
const SESSION_KEY = 'kahoot_game_session_v1'

function calcTimeLeft(endsAt?: number) {
  if (!endsAt) return 0
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
}

function parseMyAnswer(raw: unknown): MyAnswer {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (typeof obj.optionIndex === 'number') return { optionIndex: obj.optionIndex }
  if (typeof obj.text === 'string') {
    return {
      text: obj.text,
      similarity: typeof obj.similarity === 'number' ? obj.similarity : undefined,
    }
  }
  if (Array.isArray(obj.order)) return { order: obj.order.map(String) }
  return null
}

function saveSession(data: SessionPersist | null) {
  try {
    if (!data || data.role === 'none' || !data.pin) {
      sessionStorage.removeItem(SESSION_KEY)
      return
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

function loadSession(): SessionPersist | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionPersist
  } catch {
    return null
  }
}

function parseRoundStats(payload: Record<string, unknown>): RoundStatsView {
  return {
    questionIndex: Number(payload.questionIndex ?? 0),
    type: (payload.type as QuestionType) || 'choice',
    questionText: String(payload.questionText ?? ''),
    correctIndex: typeof payload.correctIndex === 'number' ? payload.correctIndex : null,
    correctAnswers: Array.isArray(payload.correctAnswers)
      ? (payload.correctAnswers as string[])
      : null,
    correctOrder: Array.isArray(payload.correctOrder) ? (payload.correctOrder as string[]) : null,
    answerCounts: Array.isArray(payload.answerCounts)
      ? (payload.answerCounts as number[])
      : [0, 0, 0, 0],
    fillAnswers: Array.isArray(payload.fillAnswers)
      ? (payload.fillAnswers as FillAnswerStat[])
      : [],
    correctCount: Number(payload.correctCount ?? 0),
    answeredCount: Number(payload.answeredCount ?? 0),
    totalPlayers: Number(payload.totalPlayers ?? 0),
    accuracy: Number(payload.accuracy ?? 0),
    roundScores:
      payload.roundScores && typeof payload.roundScores === 'object'
        ? (payload.roundScores as Record<string, number>)
        : {},
    playerResults:
      payload.playerResults && typeof payload.playerResults === 'object'
        ? (payload.playerResults as Record<string, PlayerRoundResult>)
        : {},
    hasNext: Boolean(payload.hasNext),
    options: Array.isArray(payload.options) ? (payload.options as string[]) : undefined,
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const initialSession = loadSession()
  const [role, setRole] = useState<Role>(initialSession?.role === 'host' || initialSession?.role === 'player' ? initialSession.role : 'none')
  const [pin, setPin] = useState(initialSession?.pin ?? '')
  const [quizTitle, setQuizTitle] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(initialSession?.playerId ?? null)
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [endsAt, setEndsAt] = useState(0)
  const [introEndsAt, setIntroEndsAt] = useState(0)
  const [introDurationMs, setIntroDurationMs] = useState(5000)
  const [introProgress, setIntroProgress] = useState(1)
  const [introType, setIntroType] = useState<QuestionType | null>(null)
  const [questionMeta, setQuestionMeta] = useState<PublicQuestion | null>(null)
  const [myAnswer, setMyAnswer] = useState<MyAnswer>(null)
  const [correctIndex, setCorrectIndex] = useState<number | null>(null)
  const [correctAnswers, setCorrectAnswers] = useState<string[] | null>(null)
  const [correctOrder, setCorrectOrder] = useState<string[] | null>(null)
  const [answerCounts, setAnswerCounts] = useState<number[]>([0, 0, 0, 0])
  const [correctCount, setCorrectCount] = useState(0)
  const [lastRoundScores, setLastRoundScores] = useState<Record<string, number>>({})
  const [roundStats, setRoundStats] = useState<RoundStatsView | null>(null)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [error, setError] = useState('')
  const [myLanguage, setMyLanguage] = useState<string | null>(null)
  const [roomLanguages, setRoomLanguages] = useState<{ code: string; label: string }[]>([])

  const roleRef = useRef(role)
  const pinRef = useRef(pin)
  const playerIdRef = useRef(currentPlayerId)
  const tokenRef = useRef(user?.token)
  roleRef.current = role
  pinRef.current = pin
  playerIdRef.current = currentPlayerId
  tokenRef.current = user?.token

  const persist = useCallback((nextRole: Role, nextPin: string, nextPlayerId?: string | null) => {
    saveSession({
      role: nextRole,
      pin: nextPin,
      playerId: nextPlayerId || undefined,
    })
  }, [])

  const applySnapshot = useCallback((snapshot: Record<string, unknown>) => {
    if (typeof snapshot.pin === 'string') setPin(snapshot.pin)
    if (typeof snapshot.title === 'string') setQuizTitle(snapshot.title)
    if (typeof snapshot.questionCount === 'number') setQuestionCount(snapshot.questionCount)
    if (typeof snapshot.phase === 'string') setPhase(snapshot.phase as GamePhase)
    if (Array.isArray(snapshot.players)) setPlayers(snapshot.players as Player[])
    if (typeof snapshot.currentQuestionIndex === 'number') {
      setCurrentQuestionIndex(snapshot.currentQuestionIndex)
    }

    if (snapshot.phase === 'intro') {
      setIntroType((snapshot.type as QuestionType) || 'choice')
      if (typeof snapshot.introEndsAt === 'number') setIntroEndsAt(snapshot.introEndsAt)
      if (typeof snapshot.durationMs === 'number') setIntroDurationMs(snapshot.durationMs)
      setQuestionMeta(null)
      setRoundStats(null)
    }

    if (snapshot.question && typeof snapshot.question === 'object') {
      const q = snapshot.question as PublicQuestion
      setQuestionMeta(q)
      setCurrentQuestionIndex(q.index)
      setEndsAt(q.endsAt)
      setTimeLeft(calcTimeLeft(q.endsAt))
      setIntroType(q.type)
    }
    setMyAnswer(parseMyAnswer(snapshot.myAnswer))
    if (typeof snapshot.correctIndex === 'number') setCorrectIndex(snapshot.correctIndex)
    if (Array.isArray(snapshot.correctAnswers)) setCorrectAnswers(snapshot.correctAnswers as string[])
    if (Array.isArray(snapshot.correctOrder)) setCorrectOrder(snapshot.correctOrder as string[])
    if (Array.isArray(snapshot.answerCounts)) setAnswerCounts(snapshot.answerCounts as number[])
    if (snapshot.roundScores && typeof snapshot.roundScores === 'object') {
      setLastRoundScores(snapshot.roundScores as Record<string, number>)
    }
    if (typeof snapshot.answeredCount === 'number') setAnsweredCount(snapshot.answeredCount)
    if (typeof snapshot.correctCount === 'number') setCorrectCount(snapshot.correctCount)
    if (Array.isArray(snapshot.languages)) {
      setRoomLanguages(snapshot.languages as { code: string; label: string }[])
    }
    if (typeof snapshot.myLanguage === 'string') setMyLanguage(snapshot.myLanguage)

    if (snapshot.phase === 'stats') {
      setRoundStats(parseRoundStats(snapshot))
      setPhase('stats')
    }
  }, [])

  const tryReconnect = useCallback(async () => {
    const session = loadSession()
    const liveRole = roleRef.current !== 'none' ? roleRef.current : session?.role
    const livePin = pinRef.current || session?.pin
    const livePlayerId = playerIdRef.current || session?.playerId
    if (!liveRole || liveRole === 'none' || !livePin) return

    setReconnecting(true)
    try {
      if (liveRole === 'host') {
        const token = tokenRef.current
        if (!token) return
        const res = await emitAck<{
          ok: boolean
          message?: string
          snapshot?: Record<string, unknown>
        }>('host:rejoin', { token, pin: livePin })
        if (!res.ok || !res.snapshot) {
          if (res.message) setError(res.message)
          return
        }
        setRole('host')
        setPin(livePin)
        persist('host', livePin)
        applySnapshot(res.snapshot)
      } else if (liveRole === 'player' && livePlayerId) {
        const res = await emitAck<{
          ok: boolean
          message?: string
          player?: Player
          snapshot?: Record<string, unknown>
        }>('player:rejoin', { pin: livePin, playerId: livePlayerId })
        if (!res.ok || !res.player) {
          saveSession(null)
          setError(res.message || '重连失败，请重新加入')
          setRole('none')
          setPin('')
          setCurrentPlayerId(null)
          setPhase('idle')
          return
        }
        setRole('player')
        setCurrentPlayerId(res.player.id)
        setPin(livePin)
        persist('player', livePin, res.player.id)
        if (res.snapshot) applySnapshot(res.snapshot)
      }
    } catch {
      // 稍后随 socket 再试
    } finally {
      setReconnecting(false)
    }
  }, [applySnapshot, persist])

  useEffect(() => {
    const socket = getSocket()
    const onConnect = () => {
      setConnected(true)
      void tryReconnect()
    }
    const onDisconnect = () => {
      setConnected(false)
      setReconnecting(true)
    }

    const onLobby = (payload: {
      pin: string
      title: string
      questionCount: number
      phase: GamePhase
      players: Player[]
    }) => {
      setPin(payload.pin)
      setQuizTitle(payload.title)
      setQuestionCount(payload.questionCount)
      setPhase(payload.phase)
      setPlayers(payload.players)
    }

    const onIntro = (payload: {
      index: number
      total: number
      type: QuestionType
      introEndsAt: number
      durationMs: number
      players: Player[]
    }) => {
      setPhase('intro')
      setPlayers(payload.players)
      setCurrentQuestionIndex(payload.index)
      setQuestionCount(payload.total)
      setIntroType(payload.type)
      setIntroEndsAt(payload.introEndsAt)
      setIntroDurationMs(payload.durationMs)
      setIntroProgress(1)
      setQuestionMeta(null)
      setMyAnswer(null)
      setCorrectIndex(null)
      setCorrectAnswers(null)
      setCorrectOrder(null)
      setAnswerCounts([0, 0, 0, 0])
      setCorrectCount(0)
      setLastRoundScores({})
      setRoundStats(null)
      setAnsweredCount(0)
    }

    const onQuestionShow = (payload: { question: PublicQuestion; players: Player[] }) => {
      setPhase('question')
      setPlayers(payload.players)
      setQuestionMeta(payload.question)
      setCurrentQuestionIndex(payload.question.index)
      setEndsAt(payload.question.endsAt)
      setTimeLeft(calcTimeLeft(payload.question.endsAt))
      setIntroType(payload.question.type)
      setMyAnswer(null)
      setCorrectIndex(null)
      setCorrectAnswers(null)
      setCorrectOrder(null)
      setAnswerCounts([0, 0, 0, 0])
      setCorrectCount(0)
      setLastRoundScores({})
      setRoundStats(null)
      setAnsweredCount(0)
    }

    const onStats = (payload: Record<string, unknown> & { players: Player[] }) => {
      setPhase('stats')
      setPlayers(payload.players)
      const stats = parseRoundStats(payload)
      setRoundStats(stats)
      setCorrectIndex(stats.correctIndex)
      setCorrectAnswers(stats.correctAnswers)
      setCorrectOrder(stats.correctOrder)
      setAnswerCounts(stats.answerCounts)
      setCorrectCount(stats.correctCount)
      setLastRoundScores(stats.roundScores)
      setCurrentQuestionIndex(stats.questionIndex)
    }

    const onProgress = (payload: { answeredCount: number }) => {
      setAnsweredCount(payload.answeredCount)
    }

    const onAccepted = (payload: unknown) => {
      setMyAnswer(parseMyAnswer(payload))
    }

    const onEnd = (payload: { players: Player[] }) => {
      setPhase('finished')
      setPlayers(payload.players)
      setRoundStats(null)
    }

    const onReset = () => {
      setPhase('lobby')
      setMyAnswer(null)
      setCorrectIndex(null)
      setCorrectAnswers(null)
      setCorrectOrder(null)
      setQuestionMeta(null)
      setLastRoundScores({})
      setRoundStats(null)
      setAnsweredCount(0)
      setCurrentQuestionIndex(0)
      setIntroType(null)
    }

    const onClosed = (payload: { reason?: string }) => {
      setError(payload.reason || '房间已关闭')
      setRole('none')
      setPin('')
      setPhase('idle')
      setPlayers([])
      setCurrentPlayerId(null)
      saveSession(null)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('lobby:update', onLobby)
    socket.on('question:intro', onIntro)
    socket.on('question:show', onQuestionShow)
    socket.on('question:stats', onStats)
    socket.on('answer:progress', onProgress)
    socket.on('answer:accepted', onAccepted)
    socket.on('game:end', onEnd)
    socket.on('game:reset', onReset)
    socket.on('room:closed', onClosed)
    setConnected(socket.connected)
    if (socket.connected) void tryReconnect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('lobby:update', onLobby)
      socket.off('question:intro', onIntro)
      socket.off('question:show', onQuestionShow)
      socket.off('question:stats', onStats)
      socket.off('answer:progress', onProgress)
      socket.off('answer:accepted', onAccepted)
      socket.off('game:end', onEnd)
      socket.off('game:reset', onReset)
      socket.off('room:closed', onClosed)
    }
  }, [tryReconnect])

  useEffect(() => {
    if (phase !== 'question' || !endsAt) return
    setTimeLeft(calcTimeLeft(endsAt))
    const timer = window.setInterval(() => setTimeLeft(calcTimeLeft(endsAt)), 250)
    return () => window.clearInterval(timer)
  }, [phase, endsAt])

  useEffect(() => {
    if (phase !== 'intro' || !introEndsAt) return
    const tick = () => {
      const left = Math.max(0, introEndsAt - Date.now())
      setIntroProgress(Math.min(1, left / introDurationMs))
    }
    tick()
    const timer = window.setInterval(tick, 50)
    return () => window.clearInterval(timer)
  }, [phase, introEndsAt, introDurationMs])

  const createRoom = useCallback(
    async (quizId: string) => {
      if (!user?.token) throw new Error('请先登录主持人账号')
      const res = await emitAck<{
        ok: boolean
        message?: string
        pin?: string
        title?: string
        questionCount?: number
        players?: Player[]
      }>('host:createRoom', { token: user.token, quizId })
      if (!res.ok || !res.pin) throw new Error(res.message || '创建房间失败')
      setRole('host')
      setPin(res.pin)
      setQuizTitle(res.title || '')
      setQuestionCount(res.questionCount || 0)
      setPlayers(res.players || [])
      setPhase('lobby')
      setCurrentPlayerId(null)
      setMyAnswer(null)
      setRoundStats(null)
      setError('')
      persist('host', res.pin)
    },
    [persist, user],
  )

  const previewRoom = useCallback(async (pinInput: string) => {
    const res = await emitAck<{
      ok: boolean
      message?: string
      title?: string
      languages?: { code: string; label: string }[]
      defaultLanguage?: string
    }>('room:preview', { pin: pinInput })
    if (!res.ok) throw new Error(res.message || '房间不存在')
    return {
      title: res.title || '',
      languages: res.languages?.length ? res.languages : [{ code: 'zh', label: '中文' }],
      defaultLanguage: res.defaultLanguage || res.languages?.[0]?.code || 'zh',
    }
  }, [])

  const joinGame = useCallback(
    async (pinInput: string, nickname: string, language?: string) => {
      const res = await emitAck<{
        ok: boolean
        message?: string
        player?: Player & { language?: string }
        snapshot?: Record<string, unknown>
      }>('player:join', { pin: pinInput, nickname, language })
      if (!res.ok || !res.player) throw new Error(res.message || '加入失败')
      setRole('player')
      setCurrentPlayerId(res.player.id)
      if (res.player.language) setMyLanguage(res.player.language)
      setError('')
      persist('player', pinInput, res.player.id)
      if (res.snapshot) applySnapshot(res.snapshot)
      else {
        setPin(pinInput)
        setPhase('lobby')
      }
    },
    [applySnapshot, persist],
  )

  const startGame = useCallback(async () => {
    if (!user?.token || !pin) throw new Error('无法开始')
    const res = await emitAck<{ ok: boolean; message?: string }>('host:start', {
      token: user.token,
      pin,
    })
    if (!res.ok) throw new Error(res.message || '开始失败')
  }, [pin, user])

  const nextQuestion = useCallback(async () => {
    if (!user?.token || !pin) throw new Error('无法继续')
    const res = await emitAck<{ ok: boolean; message?: string }>('host:next', {
      token: user.token,
      pin,
    })
    if (!res.ok) throw new Error(res.message || '进入下一题失败')
  }, [pin, user])

  const submitAnswer = useCallback(
    async (payload: AnswerPayload) => {
      if (myAnswer !== null) return
      const res = await emitAck<{ ok: boolean; message?: string }>('player:answer', payload)
      if (!res.ok) throw new Error(res.message || '提交失败')
      setMyAnswer(parseMyAnswer(payload))
    },
    [myAnswer],
  )

  const backToLobby = useCallback(async () => {
    if (!user?.token || !pin) return
    const res = await emitAck<{ ok: boolean; message?: string }>('host:backToLobby', {
      token: user.token,
      pin,
    })
    if (!res.ok) throw new Error(res.message || '返回大厅失败')
    setPhase('lobby')
    persist('host', pin)
  }, [persist, pin, user])

  const goHome = useCallback(() => {
    if (role === 'host' && user?.token && pin) {
      void emitAck('host:closeRoom', { token: user.token, pin }).catch(() => undefined)
    }
    setRole('none')
    setPin('')
    setQuizTitle('')
    setQuestionCount(0)
    setPlayers([])
    setCurrentPlayerId(null)
    setPhase('idle')
    setQuestionMeta(null)
    setMyAnswer(null)
    setCorrectIndex(null)
    setCorrectAnswers(null)
    setCorrectOrder(null)
    setLastRoundScores({})
    setRoundStats(null)
    setAnsweredCount(0)
    setIntroType(null)
    setMyLanguage(null)
    setRoomLanguages([])
    setError('')
    saveSession(null)
  }, [pin, role, user])

  const currentQuestion = questionMeta
    ? {
        id: `q_${questionMeta.index}`,
        type: questionMeta.type || 'choice',
        text: questionMeta.text,
        timeLimit: questionMeta.timeLimit,
        options: questionMeta.options,
        items: questionMeta.items,
        correctIndex: correctIndex ?? undefined,
        acceptAnswers: correctAnswers ?? undefined,
        language: questionMeta.language || myLanguage || undefined,
      }
    : null

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players],
  )

  const value: GameContextValue = {
    role,
    pin,
    quizTitle,
    questionCount,
    players,
    currentPlayerId,
    phase,
    currentQuestionIndex,
    timeLeft,
    introProgress,
    introType,
    currentQuestion,
    myAnswer,
    correctIndex,
    correctAnswers,
    correctOrder,
    answerCounts,
    correctCount,
    lastRoundScores,
    roundStats,
    answeredCount,
    sortedPlayers,
    connected,
    reconnecting,
    error,
    myLanguage,
    roomLanguages,
    clearError: () => setError(''),
    createRoom,
    joinGame,
    previewRoom,
    startGame,
    nextQuestion,
    submitAnswer,
    backToLobby,
    goHome,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
