import type { Question, QuestionType, QuizDraft } from '../types'

export const ANSWER_COLORS = [
  { key: 'red', bg: 'bg-answer-red', hex: '#e21b3c', shape: 'triangle' as const },
  { key: 'blue', bg: 'bg-answer-blue', hex: '#1368ce', shape: 'diamond' as const },
  { key: 'yellow', bg: 'bg-answer-yellow', hex: '#d89e00', shape: 'circle' as const },
  { key: 'green', bg: 'bg-answer-green', hex: '#26890c', shape: 'square' as const },
] as const

export function createId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyQuestion(type: QuestionType = 'choice'): Question {
  const id = createId('q')
  if (type === 'truefalse') {
    return {
      id,
      type,
      text: '',
      options: ['正确', '错误'],
      correctIndex: 0,
      timeLimit: 15,
    }
  }
  if (type === 'fill') {
    return {
      id,
      type,
      text: '',
      acceptAnswers: [''],
      timeLimit: 30,
    }
  }
  if (type === 'order') {
    return {
      id,
      type,
      text: '',
      items: ['', ''],
      timeLimit: 40,
    }
  }
  return {
    id,
    type: 'choice',
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    timeLimit: 20,
  }
}

export const DEFAULT_QUIZ: QuizDraft = {
  title: '多题型趣味挑战',
  questions: [
    {
      id: 'q1',
      type: 'choice',
      text: '太阳系中最大的行星是？',
      options: ['地球', '木星', '土星', '火星'],
      correctIndex: 1,
      timeLimit: 20,
    },
    {
      id: 'q2',
      type: 'truefalse',
      text: '一年有 365 天（平年）。',
      options: ['正确', '错误'],
      correctIndex: 0,
      timeLimit: 12,
    },
    {
      id: 'q3',
      type: 'fill',
      text: 'HTML 中用来创建超链接的标签名是？（填写标签名，如 a）',
      acceptAnswers: ['a', 'A', '<a>'],
      timeLimit: 25,
    },
    {
      id: 'q4',
      type: 'order',
      text: '将一周按从周一到周四的顺序排列：',
      items: ['周一', '周二', '周三', '周四'],
      timeLimit: 35,
    },
  ],
}
