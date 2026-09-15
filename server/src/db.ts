import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { v4 as uuid } from 'uuid'
import type { Quiz, Question, User } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const DB_FILE = join(DATA_DIR, 'db.json')

type DbShape = {
  users: User[]
  quizzes: Quiz[]
}

function emptyDb(): DbShape {
  return { users: [], quizzes: [] }
}

function ensureDb(): DbShape {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(DB_FILE)) {
    const db = emptyDb()
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
    return db
  }
  return JSON.parse(readFileSync(DB_FILE, 'utf-8')) as DbShape
}

function save(db: DbShape) {
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

export const db = {
  findUserByUsername(username: string) {
    return ensureDb().users.find((u) => u.username.toLowerCase() === username.toLowerCase())
  },
  findUserById(id: string) {
    return ensureDb().users.find((u) => u.id === id)
  },
  createUser(username: string, passwordHash: string): User {
    const data = ensureDb()
    const user: User = {
      id: uuid(),
      username,
      passwordHash,
      createdAt: Date.now(),
    }
    data.users.push(user)
    save(data)
    return user
  },
  listQuizzes(ownerId: string) {
    return ensureDb()
      .quizzes.filter((q) => q.ownerId === ownerId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },
  getQuiz(id: string) {
    return ensureDb().quizzes.find((q) => q.id === id)
  },
  createQuiz(ownerId: string, title: string, questions: Question[]): Quiz {
    const data = ensureDb()
    const now = Date.now()
    const quiz: Quiz = {
      id: uuid(),
      title,
      questions,
      ownerId,
      createdAt: now,
      updatedAt: now,
    }
    data.quizzes.push(quiz)
    save(data)
    return quiz
  },
  updateQuiz(id: string, ownerId: string, title: string, questions: Question[]): Quiz | null {
    const data = ensureDb()
    const idx = data.quizzes.findIndex((q) => q.id === id && q.ownerId === ownerId)
    if (idx < 0) return null
    data.quizzes[idx] = {
      ...data.quizzes[idx],
      title,
      questions,
      updatedAt: Date.now(),
    }
    save(data)
    return data.quizzes[idx]
  },
  deleteQuiz(id: string, ownerId: string) {
    const data = ensureDb()
    const before = data.quizzes.length
    data.quizzes = data.quizzes.filter((q) => !(q.id === id && q.ownerId === ownerId))
    save(data)
    return data.quizzes.length < before
  },
}
