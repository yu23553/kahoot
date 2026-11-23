import { Router } from 'express'
import { authMiddleware, login, register, type AuthUser } from './auth.js'
import { db } from './db.js'
import { normalizeQuizPayload, validateQuestions } from './questionUtils.js'

type AuthedRequest = Parameters<typeof authMiddleware>[0] & { user?: AuthUser }

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body ?? {}
    const result = await register(String(username ?? ''), String(password ?? ''))
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '注册失败' })
  }
})

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {}
    const result = await login(String(username ?? ''), String(password ?? ''))
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '登录失败' })
  }
})

authRouter.get('/me', authMiddleware, (req, res) => {
  const user = (req as AuthedRequest).user!
  res.json(user)
})

export const quizRouter = Router()
quizRouter.use(authMiddleware)

quizRouter.get('/', (req, res) => {
  const user = (req as AuthedRequest).user!
  res.json(db.listQuizzes(user.id))
})

quizRouter.get('/:id', (req, res) => {
  const user = (req as AuthedRequest).user!
  const quiz = db.getQuiz(req.params.id)
  if (!quiz || quiz.ownerId !== user.id) {
    res.status(404).json({ error: '测验不存在' })
    return
  }
  res.json(quiz)
})

quizRouter.post('/', (req, res) => {
  try {
    const user = (req as AuthedRequest).user!
    const { title, questions, languages, defaultLanguage } = normalizeQuizPayload(req.body ?? {})
    if (!title) throw new Error('请填写测验标题')
    validateQuestions(questions, languages)
    const quiz = db.createQuiz(user.id, title, questions, languages, defaultLanguage)
    res.status(201).json(quiz)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '保存失败' })
  }
})

quizRouter.put('/:id', (req, res) => {
  try {
    const user = (req as AuthedRequest).user!
    const { title, questions, languages, defaultLanguage } = normalizeQuizPayload(req.body ?? {})
    if (!title) throw new Error('请填写测验标题')
    validateQuestions(questions, languages)
    const quiz = db.updateQuiz(req.params.id, user.id, title, questions, languages, defaultLanguage)
    if (!quiz) {
      res.status(404).json({ error: '测验不存在' })
      return
    }
    res.json(quiz)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '更新失败' })
  }
})

quizRouter.delete('/:id', (req, res) => {
  const user = (req as AuthedRequest).user!
  const ok = db.deleteQuiz(req.params.id, user.id)
  if (!ok) {
    res.status(404).json({ error: '测验不存在' })
    return
  }
  res.json({ ok: true })
})
