import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { v4 as uuid } from 'uuid'
import { normalizeQuestion, quizDefaultLanguage, quizLanguages } from './questionUtils.js'
import type { Question, Quiz, QuizLanguage, User } from './types.js'

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

/** 读取时把旧题库补全 languages / locales */
function hydrateQuiz(raw: Quiz): Quiz {
  const languages: QuizLanguage[] =
    raw.languages?.length > 0 ? raw.languages : [{ code: 'zh', label: '中文' }]
  const codes = languages.map((l) => l.code)
  const questions = (raw.questions ?? []).map((q) =>
    normalizeQuestion(q as Parameters<typeof normalizeQuestion>[0], codes),
  )
  const defaultLanguage =
    raw.defaultLanguage && codes.includes(raw.defaultLanguage)
      ? raw.defaultLanguage
      : codes[0]
  return { ...raw, languages, defaultLanguage, questions }
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
      .map(hydrateQuiz)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },
  getQuiz(id: string) {
    const quiz = ensureDb().quizzes.find((q) => q.id === id)
    return quiz ? hydrateQuiz(quiz) : undefined
  },
  createQuiz(
    ownerId: string,
    title: string,
    questions: Question[],
    languages: QuizLanguage[],
    defaultLanguage: string,
  ): Quiz {
    const data = ensureDb()
    const now = Date.now()
    const quiz: Quiz = {
      id: uuid(),
      title,
      questions,
      languages,
      defaultLanguage,
      ownerId,
      createdAt: now,
      updatedAt: now,
    }
    data.quizzes.push(quiz)
    save(data)
    return quiz
  },
  updateQuiz(
    id: string,
    ownerId: string,
    title: string,
    questions: Question[],
    languages: QuizLanguage[],
    defaultLanguage: string,
  ): Quiz | null {
    const data = ensureDb()
    const idx = data.quizzes.findIndex((q) => q.id === id && q.ownerId === ownerId)
    if (idx < 0) return null
    data.quizzes[idx] = {
      ...data.quizzes[idx],
      title,
      questions,
      languages,
      defaultLanguage,
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

// re-export helpers used by routes for typing
export { quizDefaultLanguage, quizLanguages }
