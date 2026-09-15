import type { Server } from 'socket.io'
import {
  calcFillScore,
  fillSimilarity,
  isAnswerCorrect,
  normalizeQuestion,
  sanitizeAnswerPayload,
  shuffle,
  toPublicQuestion,
} from './questionUtils.js'
import type {
  AnswerPayload,
  FillAnswerStat,
  Player,
  PublicPlayer,
  Quiz,
  Room,
  RoomPhase,
  RoundStats,
  StoredAnswer,
} from './types.js'
import {
  FINISHED_IDLE_MS,
  IN_GAME_IDLE_MS,
  INTRO_DURATION_MS,
  LOBBY_IDLE_MS,
  MAX_ROOM_PLAYERS,
} from './types.js'

const AVATAR_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#c039f3', '#ff6b35', '#00c2a8']

function calcScore(correct: boolean, elapsedMs: number, timeLimitSec: number) {
  if (!correct) return 0
  const ratio = Math.min(1, Math.max(0, elapsedMs / (timeLimitSec * 1000)))
  return Math.round(1000 * (1 - ratio / 2))
}

function generatePin(existing: Set<string>) {
  let pin = ''
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000))
  } while (existing.has(pin))
  return pin
}

function toPublicPlayers(room: Room): PublicPlayer[] {
  return [...room.players.values()]
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      avatarColor: p.avatarColor,
    }))
    .sort((a, b) => b.score - a.score)
}

function clearTimers(room: Room) {
  if (room.timer) clearTimeout(room.timer)
  if (room.introTimer) clearTimeout(room.introTimer)
  room.timer = null
  room.introTimer = null
}

function touch(room: Room) {
  room.lastActiveAt = Date.now()
}

function myAnswerView(answer?: StoredAnswer) {
  if (!answer) return null
  if (answer.optionIndex !== undefined) return { optionIndex: answer.optionIndex }
  if (answer.text !== undefined) {
    return { text: answer.text, similarity: answer.similarity }
  }
  if (answer.order) return { order: answer.order }
  return null
}

export class RoomManager {
  private rooms = new Map<string, Room>()
  private playerSocketIndex = new Map<string, { pin: string; playerId: string }>()
  private hostSocketIndex = new Map<string, string>()
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(private io: Server) {
    this.cleanupTimer = setInterval(() => this.cleanupIdleRooms(), 60_000)
  }

  getRoom(pin: string) {
    return this.rooms.get(pin)
  }

  createRoom(hostId: string, hostSocketId: string, quiz: Quiz) {
    for (const [pin, room] of this.rooms) {
      if (room.hostId === hostId) this.destroyRoom(pin, '主持人创建了新房间')
    }

    const pin = generatePin(new Set(this.rooms.keys()))
    const now = Date.now()
    const normalizedQuiz: Quiz = {
      ...structuredClone(quiz),
      questions: quiz.questions.map((q) => normalizeQuestion(q)),
    }
    const room: Room = {
      pin,
      hostId,
      hostSocketId,
      quiz: normalizedQuiz,
      players: new Map(),
      phase: 'lobby',
      currentQuestionIndex: 0,
      introEndsAt: 0,
      questionStartedAt: 0,
      questionEndsAt: 0,
      answers: new Map(),
      lastRoundScores: new Map(),
      lastRoundStats: null,
      shuffledItems: null,
      createdAt: now,
      lastActiveAt: now,
      timer: null,
      introTimer: null,
    }
    this.rooms.set(pin, room)
    this.hostSocketIndex.set(hostSocketId, pin)
    return room
  }

  destroyRoom(pin: string, reason = '房间已关闭') {
    const room = this.rooms.get(pin)
    if (!room) return
    clearTimers(room)
    this.io.to(`room:${pin}`).emit('room:closed', { reason })
    for (const player of room.players.values()) {
      if (player.socketId) this.playerSocketIndex.delete(player.socketId)
    }
    if (room.hostSocketId) this.hostSocketIndex.delete(room.hostSocketId)
    this.rooms.delete(pin)
  }

  attachHost(pin: string, hostId: string, socketId: string) {
    const room = this.rooms.get(pin)
    if (!room || room.hostId !== hostId) return null
    if (room.hostSocketId) this.hostSocketIndex.delete(room.hostSocketId)
    room.hostSocketId = socketId
    this.hostSocketIndex.set(socketId, pin)
    touch(room)
    return room
  }

  joinPlayer(pin: string, nickname: string, socketId: string) {
    const room = this.rooms.get(pin)
    if (!room) return { ok: false as const, message: '房间不存在' }
    if (room.phase !== 'lobby') return { ok: false as const, message: '游戏已开始，无法加入' }
    if (room.players.size >= MAX_ROOM_PLAYERS) {
      return { ok: false as const, message: `房间已满（最多 ${MAX_ROOM_PLAYERS} 人）` }
    }

    const name = nickname.trim().slice(0, 16)
    if (!name) return { ok: false as const, message: '请输入昵称' }
    if ([...room.players.values()].some((p) => p.nickname.toLowerCase() === name.toLowerCase())) {
      return { ok: false as const, message: '昵称已被占用' }
    }

    const player: Player = {
      id: crypto.randomUUID(),
      nickname: name,
      score: 0,
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      socketId,
    }
    room.players.set(player.id, player)
    this.playerSocketIndex.set(socketId, { pin, playerId: player.id })
    touch(room)
    this.broadcastLobby(room)
    return { ok: true as const, player, room }
  }

  rejoinPlayer(pin: string, playerId: string, socketId: string) {
    const room = this.rooms.get(pin)
    if (!room) return { ok: false as const, message: '房间不存在' }
    const player = room.players.get(playerId)
    if (!player) return { ok: false as const, message: '玩家不存在，请重新加入' }

    if (player.socketId && player.socketId !== socketId) {
      this.playerSocketIndex.delete(player.socketId)
    }
    player.socketId = socketId
    this.playerSocketIndex.set(socketId, { pin, playerId })
    touch(room)
    return { ok: true as const, player, room }
  }

  removeSocket(socketId: string) {
    const hostPin = this.hostSocketIndex.get(socketId)
    if (hostPin) {
      const room = this.rooms.get(hostPin)
      if (room) {
        room.hostSocketId = null
        this.hostSocketIndex.delete(socketId)
        touch(room)
      }
      return
    }

    const info = this.playerSocketIndex.get(socketId)
    if (!info) return
    const room = this.rooms.get(info.pin)
    this.playerSocketIndex.delete(socketId)
    if (!room) return
    if (room.phase === 'lobby') {
      room.players.delete(info.playerId)
      touch(room)
      this.broadcastLobby(room)
    } else {
      const player = room.players.get(info.playerId)
      if (player) player.socketId = ''
      touch(room)
    }
  }

  startGame(pin: string, hostId: string) {
    const room = this.rooms.get(pin)
    if (!room || room.hostId !== hostId) return { ok: false as const, message: '无权限' }
    if (room.phase !== 'lobby' && room.phase !== 'finished') {
      return { ok: false as const, message: '当前无法开始' }
    }
    if (room.players.size === 0) return { ok: false as const, message: '至少需要 1 名玩家' }

    for (const p of room.players.values()) p.score = 0
    room.lastRoundScores.clear()
    room.lastRoundStats = null
    touch(room)
    this.beginIntro(room, 0)
    return { ok: true as const }
  }

  nextQuestion(pin: string, hostId: string) {
    const room = this.rooms.get(pin)
    if (!room || room.hostId !== hostId) return { ok: false as const, message: '无权限' }
    if (room.phase !== 'stats') return { ok: false as const, message: '当前不能进入下一题' }

    touch(room)
    const next = room.currentQuestionIndex + 1
    if (next >= room.quiz.questions.length) {
      clearTimers(room)
      room.phase = 'finished'
      this.io.to(`room:${room.pin}`).emit('game:end', {
        players: toPublicPlayers(room),
      })
      return { ok: true as const }
    }
    this.beginIntro(room, next)
    return { ok: true as const }
  }

  submitAnswer(socketId: string, payload: AnswerPayload) {
    const info = this.playerSocketIndex.get(socketId)
    if (!info) return { ok: false as const, message: '未加入房间' }
    const room = this.rooms.get(info.pin)
    if (!room || room.phase !== 'question') return { ok: false as const, message: '当前不能答题' }
    if (room.answers.has(info.playerId)) return { ok: false as const, message: '已提交' }

    const q = room.quiz.questions[room.currentQuestionIndex]
    const sanitized = sanitizeAnswerPayload(q, payload)
    if (!sanitized) return { ok: false as const, message: '答案无效' }

    sanitized.elapsedMs = Date.now() - room.questionStartedAt
    if (q.type === 'fill' && sanitized.text !== undefined) {
      sanitized.similarity = fillSimilarity(sanitized.text, q.acceptAnswers ?? [])
    }
    room.answers.set(info.playerId, sanitized)
    touch(room)

    this.io.to(`room:${room.pin}`).emit('answer:progress', {
      answeredCount: room.answers.size,
      totalPlayers: room.players.size,
    })
    this.io.to(socketId).emit('answer:accepted', myAnswerView(sanitized))

    if (room.answers.size >= room.players.size) {
      this.finishQuestion(room)
    }
    return { ok: true as const }
  }

  private beginIntro(room: Room, index: number) {
    clearTimers(room)
    room.currentQuestionIndex = index
    room.phase = 'intro'
    room.answers.clear()
    room.lastRoundScores.clear()
    room.lastRoundStats = null
    room.shuffledItems = null
    const q = room.quiz.questions[index]
    room.introEndsAt = Date.now() + INTRO_DURATION_MS

    this.io.to(`room:${room.pin}`).emit('question:intro', {
      index,
      total: room.quiz.questions.length,
      type: q.type || 'choice',
      introEndsAt: room.introEndsAt,
      durationMs: INTRO_DURATION_MS,
      players: toPublicPlayers(room),
    })

    room.introTimer = setTimeout(() => this.beginQuestion(room, index), INTRO_DURATION_MS)
  }

  private beginQuestion(room: Room, index: number) {
    if (room.phase !== 'intro' || room.currentQuestionIndex !== index) return
    clearTimers(room)
    room.currentQuestionIndex = index
    room.phase = 'question'
    room.answers.clear()
    const q = room.quiz.questions[index]
    room.shuffledItems = q.type === 'order' ? shuffle(q.items ?? []) : null
    room.questionStartedAt = Date.now()
    room.questionEndsAt = room.questionStartedAt + q.timeLimit * 1000
    touch(room)

    this.io.to(`room:${room.pin}`).emit('question:show', {
      question: toPublicQuestion(room),
      players: toPublicPlayers(room),
    })

    room.timer = setTimeout(() => this.finishQuestion(room), q.timeLimit * 1000 + 50)
  }

  private finishQuestion(room: Room) {
    if (room.phase !== 'question') return
    clearTimers(room)
    room.phase = 'stats'
    touch(room)

    const q = room.quiz.questions[room.currentQuestionIndex]
    const roundScores: Record<string, number> = {}
    const answerCounts = [0, 0, 0, 0]
    const fillBucket = new Map<string, { count: number; simSum: number }>()
    let correctCount = 0
    const playerResults: RoundStats['playerResults'] = {}

    for (const [playerId, player] of room.players) {
      const ans = room.answers.get(playerId)
      if (ans?.optionIndex !== undefined && ans.optionIndex >= 0 && ans.optionIndex < 4) {
        answerCounts[ans.optionIndex] += 1
      }
      if (q.type === 'fill' && ans?.text) {
        const key = ans.text.trim() || '(空)'
        const prev = fillBucket.get(key) ?? { count: 0, simSum: 0 }
        prev.count += 1
        prev.simSum += ans.similarity ?? 0
        fillBucket.set(key, prev)
      }

      let gained = 0
      let correct = false
      if (q.type === 'fill') {
        const sim = ans?.similarity ?? 0
        correct = isAnswerCorrect(q, ans)
        gained = calcFillScore(sim, ans?.elapsedMs ?? q.timeLimit * 1000, q.timeLimit)
      } else {
        correct = isAnswerCorrect(q, ans)
        gained = calcScore(correct, ans?.elapsedMs ?? q.timeLimit * 1000, q.timeLimit)
      }

      if (correct) correctCount += 1
      player.score += gained
      roundScores[playerId] = gained
      room.lastRoundScores.set(playerId, gained)
      playerResults[playerId] = {
        correct,
        gained,
        similarity: ans?.similarity,
        answer: myAnswerView(ans) ?? undefined,
      }
    }

    const fillAnswers: FillAnswerStat[] = [...fillBucket.entries()]
      .map(([text, v]) => ({
        text,
        count: v.count,
        avgSimilarity: v.count ? v.simSum / v.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)

    const answeredCount = room.answers.size
    const totalPlayers = room.players.size
    const stats: RoundStats = {
      questionIndex: room.currentQuestionIndex,
      type: q.type || 'choice',
      questionText: q.text,
      correctIndex: q.correctIndex,
      correctAnswers: q.acceptAnswers,
      correctOrder: q.items,
      answerCounts,
      fillAnswers,
      correctCount,
      answeredCount,
      totalPlayers,
      accuracy: totalPlayers > 0 ? correctCount / totalPlayers : 0,
      roundScores,
      playerResults,
    }
    room.lastRoundStats = stats

    this.io.to(`room:${room.pin}`).emit('question:stats', {
      ...stats,
      players: toPublicPlayers(room),
      hasNext: room.currentQuestionIndex + 1 < room.quiz.questions.length,
    })
  }

  broadcastLobby(room: Room) {
    this.io.to(`room:${room.pin}`).emit('lobby:update', {
      pin: room.pin,
      title: room.quiz.title,
      questionCount: room.quiz.questions.length,
      phase: room.phase as RoomPhase,
      players: toPublicPlayers(room),
      maxPlayers: MAX_ROOM_PLAYERS,
    })
  }

  getPlayerIdBySocket(socketId: string) {
    return this.playerSocketIndex.get(socketId)?.playerId
  }

  snapshot(room: Room, forPlayerId?: string) {
    const base = {
      pin: room.pin,
      title: room.quiz.title,
      questionCount: room.quiz.questions.length,
      phase: room.phase,
      players: toPublicPlayers(room),
      currentQuestionIndex: room.currentQuestionIndex,
      maxPlayers: MAX_ROOM_PLAYERS,
    }

    const myAns = forPlayerId ? room.answers.get(forPlayerId) : undefined

    if (room.phase === 'intro') {
      const q = room.quiz.questions[room.currentQuestionIndex]
      return {
        ...base,
        type: q.type || 'choice',
        introEndsAt: room.introEndsAt,
        durationMs: INTRO_DURATION_MS,
      }
    }

    if (room.phase === 'question') {
      return {
        ...base,
        question: toPublicQuestion(room),
        answeredCount: room.answers.size,
        myAnswer: myAnswerView(myAns),
      }
    }

    if (room.phase === 'stats' && room.lastRoundStats) {
      return {
        ...base,
        question: toPublicQuestion(room),
        ...room.lastRoundStats,
        myAnswer: myAnswerView(myAns),
        hasNext: room.currentQuestionIndex + 1 < room.quiz.questions.length,
      }
    }

    return base
  }

  backToLobby(pin: string, hostId: string) {
    const room = this.rooms.get(pin)
    if (!room || room.hostId !== hostId) return null
    clearTimers(room)
    room.phase = 'lobby'
    room.currentQuestionIndex = 0
    room.answers.clear()
    room.lastRoundScores.clear()
    room.lastRoundStats = null
    room.shuffledItems = null
    for (const p of room.players.values()) p.score = 0
    touch(room)
    this.broadcastLobby(room)
    this.io.to(`room:${pin}`).emit('game:reset', { phase: 'lobby' })
    return room
  }

  private cleanupIdleRooms() {
    const now = Date.now()
    for (const [pin, room] of this.rooms) {
      const idle = now - room.lastActiveAt
      if (room.phase === 'finished' && idle >= FINISHED_IDLE_MS) {
        this.destroyRoom(pin, '房间已结束并自动清理')
        continue
      }
      if (room.phase === 'lobby') {
        const empty = room.players.size === 0
        const noHost = !room.hostSocketId
        if ((empty || noHost) && idle >= LOBBY_IDLE_MS) {
          this.destroyRoom(pin, '房间空闲过久，已自动关闭')
        }
        continue
      }
      if (idle >= IN_GAME_IDLE_MS) {
        this.destroyRoom(pin, '房间长时间无活动，已自动关闭')
      }
    }
  }
}
