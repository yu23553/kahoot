import type { Server, Socket } from 'socket.io'
import { verifyToken } from './auth.js'
import { db } from './db.js'
import { RoomManager } from './RoomManager.js'

export function registerSocketHandlers(io: Server, rooms: RoomManager) {
  io.on('connection', (socket: Socket) => {
    socket.emit('connected', { socketId: socket.id })

    socket.on('host:createRoom', (payload, ack) => {
      try {
        const token = String(payload?.token ?? '')
        const quizId = String(payload?.quizId ?? '')
        const user = verifyToken(token)
        if (!user) {
          ack?.({ ok: false, message: '请先登录' })
          return
        }
        const quiz = db.getQuiz(quizId)
        if (!quiz || quiz.ownerId !== user.id) {
          ack?.({ ok: false, message: '测验不存在' })
          return
        }
        const room = rooms.createRoom(user.id, socket.id, quiz)
        void socket.join(`room:${room.pin}`)
        ack?.({
          ok: true,
          pin: room.pin,
          title: quiz.title,
          questionCount: quiz.questions.length,
          players: [],
        })
        rooms.broadcastLobby(room)
      } catch (e) {
        ack?.({ ok: false, message: e instanceof Error ? e.message : '创建失败' })
      }
    })

    socket.on('host:rejoin', (payload, ack) => {
      const token = String(payload?.token ?? '')
      const pin = String(payload?.pin ?? '')
      const user = verifyToken(token)
      if (!user) {
        ack?.({ ok: false, message: '请先登录' })
        return
      }
      const room = rooms.attachHost(pin, user.id, socket.id)
      if (!room) {
        ack?.({ ok: false, message: '房间不存在或无权限' })
        return
      }
      void socket.join(`room:${pin}`)
      ack?.({ ok: true, snapshot: rooms.snapshot(room) })
    })

    socket.on('host:start', (payload, ack) => {
      const token = String(payload?.token ?? '')
      const pin = String(payload?.pin ?? '')
      const user = verifyToken(token)
      if (!user) {
        ack?.({ ok: false, message: '请先登录' })
        return
      }
      const result = rooms.startGame(pin, user.id)
      ack?.(result)
    })

    socket.on('host:next', (payload, ack) => {
      const token = String(payload?.token ?? '')
      const pin = String(payload?.pin ?? '')
      const user = verifyToken(token)
      if (!user) {
        ack?.({ ok: false, message: '请先登录' })
        return
      }
      const result = rooms.nextQuestion(pin, user.id)
      ack?.(result)
    })

    socket.on('host:backToLobby', (payload, ack) => {
      const token = String(payload?.token ?? '')
      const pin = String(payload?.pin ?? '')
      const user = verifyToken(token)
      if (!user) {
        ack?.({ ok: false, message: '请先登录' })
        return
      }
      const room = rooms.backToLobby(pin, user.id)
      if (!room) {
        ack?.({ ok: false, message: '操作失败' })
        return
      }
      ack?.({ ok: true })
    })

    socket.on('host:closeRoom', (payload, ack) => {
      const token = String(payload?.token ?? '')
      const pin = String(payload?.pin ?? '')
      const user = verifyToken(token)
      if (!user) {
        ack?.({ ok: false, message: '请先登录' })
        return
      }
      const room = rooms.getRoom(pin)
      if (!room || room.hostId !== user.id) {
        ack?.({ ok: false, message: '无权限' })
        return
      }
      rooms.destroyRoom(pin)
      ack?.({ ok: true })
    })

    socket.on('host:kickPlayer', (payload, ack) => {
      const token = String(payload?.token ?? '')
      const pin = String(payload?.pin ?? '')
      const playerId = String(payload?.playerId ?? '')
      const user = verifyToken(token)
      if (!user) {
        ack?.({ ok: false, message: '请先登录' })
        return
      }
      if (!playerId) {
        ack?.({ ok: false, message: '缺少玩家' })
        return
      }
      ack?.(rooms.kickPlayer(pin, user.id, playerId))
    })

    socket.on('host:setLocked', (payload, ack) => {
      const token = String(payload?.token ?? '')
      const pin = String(payload?.pin ?? '')
      const locked = Boolean(payload?.locked)
      const user = verifyToken(token)
      if (!user) {
        ack?.({ ok: false, message: '请先登录' })
        return
      }
      ack?.(rooms.setLocked(pin, user.id, locked))
    })

    socket.on('room:preview', (payload, ack) => {
      const pin = String(payload?.pin ?? '').trim()
      if (!/^\d{6}$/.test(pin)) {
        ack?.({ ok: false, message: '请输入 6 位 PIN 码' })
        return
      }
      const preview = rooms.previewRoom(pin)
      if (!preview) {
        ack?.({ ok: false, message: '房间不存在' })
        return
      }
      if ('closed' in preview && preview.closed) {
        ack?.({ ok: false, message: '游戏已开始，无法加入' })
        return
      }
      if ('locked' in preview && preview.locked) {
        ack?.({
          ok: true,
          ...preview,
          message: '房间已锁定，暂时无法加入',
        })
        return
      }
      ack?.({ ok: true, ...preview })
    })

    socket.on('player:join', (payload, ack) => {
      const pin = String(payload?.pin ?? '').trim()
      const nickname = String(payload?.nickname ?? '')
      const language = String(payload?.language ?? '')
      if (!/^\d{6}$/.test(pin)) {
        ack?.({ ok: false, message: '请输入 6 位 PIN 码' })
        return
      }
      const result = rooms.joinPlayer(pin, nickname, socket.id, language)
      if (!result.ok) {
        ack?.(result)
        return
      }
      void socket.join(`room:${pin}`)
      ack?.({
        ok: true,
        player: {
          id: result.player.id,
          nickname: result.player.nickname,
          score: result.player.score,
          avatarColor: result.player.avatarColor,
          language: result.player.language,
        },
        snapshot: rooms.snapshot(result.room, result.player.id),
      })
    })

    socket.on('player:rejoin', (payload, ack) => {
      const pin = String(payload?.pin ?? '').trim()
      const playerId = String(payload?.playerId ?? '')
      if (!/^\d{6}$/.test(pin) || !playerId) {
        ack?.({ ok: false, message: '重连参数无效' })
        return
      }
      const result = rooms.rejoinPlayer(pin, playerId, socket.id)
      if (!result.ok) {
        ack?.(result)
        return
      }
      void socket.join(`room:${pin}`)
      ack?.({
        ok: true,
        player: {
          id: result.player.id,
          nickname: result.player.nickname,
          score: result.player.score,
          avatarColor: result.player.avatarColor,
        },
        snapshot: rooms.snapshot(result.room, result.player.id),
      })
    })

    socket.on('player:answer', (payload, ack) => {
      const result = rooms.submitAnswer(socket.id, {
        optionIndex: payload?.optionIndex,
        text: payload?.text,
        order: payload?.order,
      })
      ack?.(result)
    })

    socket.on('room:sync', (payload, ack) => {
      const pin = String(payload?.pin ?? '')
      const room = rooms.getRoom(pin)
      if (!room) {
        ack?.({ ok: false, message: '房间不存在' })
        return
      }
      ack?.({
        ok: true,
        snapshot: rooms.snapshot(room, rooms.getPlayerIdBySocket(socket.id)),
      })
    })

    socket.on('disconnect', () => {
      rooms.removeSocket(socket.id)
    })
  })
}
