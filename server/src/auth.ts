import bcrypt from 'bcryptjs'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'kahoot-dev-secret-change-me'

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'kahoot-dev-secret-change-me') {
  console.warn('[auth] 警告：生产环境请设置强随机 JWT_SECRET')
}

export type AuthUser = { id: string; username: string }

export function signToken(user: AuthUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser
  } catch {
    return null
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ error: '未登录' })
    return
  }
  const user = verifyToken(token)
  if (!user) {
    res.status(401).json({ error: '登录已过期' })
    return
  }
  ;(req as Request & { user: AuthUser }).user = user
  next()
}

export async function register(username: string, password: string) {
  const name = username.trim()
  if (name.length < 2 || name.length > 20) throw new Error('用户名需 2–20 个字符')
  if (password.length < 4) throw new Error('密码至少 4 位')
  if (db.findUserByUsername(name)) throw new Error('用户名已存在')
  const passwordHash = await bcrypt.hash(password, 10)
  const user = db.createUser(name, passwordHash)
  const authUser: AuthUser = { id: user.id, username: user.username }
  return { ...authUser, token: signToken(authUser) }
}

export async function login(username: string, password: string) {
  const user = db.findUserByUsername(username.trim())
  if (!user) throw new Error('用户名或密码错误')
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw new Error('用户名或密码错误')
  const authUser: AuthUser = { id: user.id, username: user.username }
  return { ...authUser, token: signToken(authUser) }
}

export { JWT_SECRET }
