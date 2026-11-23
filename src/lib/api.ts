import type { Question, QuizLanguage } from '../types'
import { getApiBase } from './config'

export type AuthSession = {
  id: string
  username: string
  token: string
}

export type RemoteQuiz = {
  id: string
  title: string
  questions: Question[]
  languages: QuizLanguage[]
  defaultLanguage: string
  ownerId: string
  createdAt: number
  updatedAt: number
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `请求失败 (${res.status})`)
  }
  return data as T
}

export const api = {
  register(username: string, password: string) {
    return request<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },
  login(username: string, password: string) {
    return request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },
  me(token: string) {
    return request<{ id: string; username: string }>('/auth/me', {}, token)
  },
  listQuizzes(token: string) {
    return request<RemoteQuiz[]>('/quizzes', {}, token)
  },
  getQuiz(token: string, id: string) {
    return request<RemoteQuiz>(`/quizzes/${id}`, {}, token)
  },
  createQuiz(
    token: string,
    payload: {
      title: string
      questions: RemoteQuiz['questions']
      languages: QuizLanguage[]
      defaultLanguage: string
    },
  ) {
    return request<RemoteQuiz>(
      '/quizzes',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    )
  },
  updateQuiz(
    token: string,
    id: string,
    payload: {
      title: string
      questions: RemoteQuiz['questions']
      languages: QuizLanguage[]
      defaultLanguage: string
    },
  ) {
    return request<RemoteQuiz>(
      `/quizzes/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      token,
    )
  },
  deleteQuiz(token: string, id: string) {
    return request<{ ok: boolean }>(`/quizzes/${id}`, { method: 'DELETE' }, token)
  },
}
