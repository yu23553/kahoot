import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { ANSWER_COLORS, createEmptyQuestion, DEFAULT_QUIZ } from '../data/mock'
import { api } from '../lib/api'
import type { Question, QuestionType, QuizDraft } from '../types'
import { QUESTION_TYPE_LABELS } from '../types'

const TYPE_OPTIONS: QuestionType[] = ['choice', 'truefalse', 'fill', 'order']

export default function HostCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('id')
  const { user, loading: authLoading } = useAuth()
  const [draft, setDraft] = useState<QuizDraft>(() => structuredClone(DEFAULT_QUIZ))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(!editId)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/host/login', { replace: true })
      return
    }
    if (!editId) return
    api
      .getQuiz(user.token, editId)
      .then((quiz) => {
        setDraft({
          title: quiz.title,
          questions: quiz.questions.map((q) => ({
            ...createEmptyQuestion(q.type || 'choice'),
            ...q,
            type: q.type || 'choice',
          })),
        })
        setLoaded(true)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : '加载失败')
        setLoaded(true)
      })
  }, [user, authLoading, editId, navigate])

  const canSave = useMemo(() => {
    if (!draft.title.trim() || draft.questions.length === 0) return false
    return draft.questions.every((q) => {
      if (!q.text.trim() || q.timeLimit < 5 || q.timeLimit > 120) return false
      if (q.type === 'choice') {
        return !!q.options?.length && q.options.every((o) => o.trim()) && q.correctIndex !== undefined
      }
      if (q.type === 'truefalse') return q.correctIndex === 0 || q.correctIndex === 1
      if (q.type === 'fill') return (q.acceptAnswers ?? []).some((a) => a.trim())
      if (q.type === 'order') {
        const items = q.items ?? []
        return items.length >= 2 && items.every((i) => i.trim())
      }
      return false
    })
  }, [draft])

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }))
  }

  const changeType = (index: number, type: QuestionType) => {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== index) return q
        const next = createEmptyQuestion(type)
        return { ...next, id: q.id, text: q.text, timeLimit: q.timeLimit }
      }),
    }))
  }

  const onSave = async () => {
    if (!user || !canSave) {
      setError('请完善每道题的内容与答案设置')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: draft.title.trim(),
        questions: draft.questions,
      }
      if (editId) await api.updateQuiz(user.token, editId, payload)
      else await api.createQuiz(user.token, payload)
      navigate('/host')
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded || authLoading) {
    return (
      <div className="bg-kahoot-gradient flex min-h-dvh items-center justify-center text-white">
        加载中…
      </div>
    )
  }

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Logo size="sm" />
          <button
            type="button"
            onClick={() => navigate('/host')}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
          >
            返回工作台
          </button>
        </div>

        <header className="space-y-3">
          <h1 className="font-display text-3xl font-black text-white">
            {editId ? '编辑测验' : '创建题库'}
          </h1>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="测验标题"
            className="w-full rounded-xl border-0 bg-white px-4 py-3 text-lg font-black text-kahoot-purple outline-none"
          />
        </header>

        <div className="space-y-4">
          {draft.questions.map((q, qi) => (
            <article
              key={q.id}
              className="animate-pop-in space-y-3 rounded-2xl bg-white p-4 text-kahoot-purple shadow-lg sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black">题目 {qi + 1}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={q.type}
                    onChange={(e) => changeType(qi, e.target.value as QuestionType)}
                    className="rounded-lg border-2 border-kahoot-purple/15 px-2 py-1.5 text-sm font-bold outline-none"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {QUESTION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={draft.questions.length <= 1}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        questions: prev.questions.filter((_, i) => i !== qi),
                      }))
                    }
                    className="rounded-lg bg-answer-red/10 px-3 py-1.5 text-sm font-bold text-answer-red disabled:opacity-40"
                  >
                    删除
                  </button>
                </div>
              </div>

              <textarea
                value={q.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                placeholder="输入题干…"
                rows={2}
                className="w-full resize-y rounded-xl border-2 border-kahoot-purple/15 px-3 py-2 font-bold outline-none focus:border-kahoot-purple"
              />

              {q.type === 'choice' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(q.options ?? ['', '', '', '']).map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={q.correctIndex === oi}
                        onChange={() => updateQuestion(qi, { correctIndex: oi })}
                        className="accent-kahoot-purple"
                      />
                      <span className={`h-3 w-3 shrink-0 rounded-sm ${ANSWER_COLORS[oi].bg}`} />
                      <input
                        value={opt}
                        onChange={(e) => {
                          const options = [...(q.options ?? ['', '', '', ''])]
                          options[oi] = e.target.value
                          updateQuestion(qi, { options })
                        }}
                        placeholder={`选项 ${oi + 1}`}
                        className="min-w-0 flex-1 rounded-lg border-2 border-kahoot-purple/15 px-3 py-2 text-sm font-semibold outline-none focus:border-kahoot-purple"
                      />
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'truefalse' && (
                <div className="flex flex-wrap gap-3">
                  {['正确', '错误'].map((label, oi) => (
                    <label
                      key={label}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-3 font-bold text-white ${
                        oi === 0 ? 'bg-answer-green' : 'bg-answer-red'
                      } ${q.correctIndex === oi ? 'ring-4 ring-kahoot-purple' : 'opacity-80'}`}
                    >
                      <input
                        type="radio"
                        name={`tf-${q.id}`}
                        checked={q.correctIndex === oi}
                        onChange={() => updateQuestion(qi, { correctIndex: oi })}
                        className="accent-white"
                      />
                      {label}（设为正确答案）
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'fill' && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-kahoot-purple/60">
                    可接受的答案（不区分大小写，可设多个同义答案）
                  </p>
                  {(q.acceptAnswers ?? ['']).map((ans, ai) => (
                    <div key={ai} className="flex gap-2">
                      <input
                        value={ans}
                        onChange={(e) => {
                          const acceptAnswers = [...(q.acceptAnswers ?? [])]
                          acceptAnswers[ai] = e.target.value
                          updateQuestion(qi, { acceptAnswers })
                        }}
                        placeholder={`答案 ${ai + 1}`}
                        className="flex-1 rounded-lg border-2 border-kahoot-purple/15 px-3 py-2 font-semibold outline-none focus:border-kahoot-purple"
                      />
                      <button
                        type="button"
                        disabled={(q.acceptAnswers?.length ?? 0) <= 1}
                        onClick={() =>
                          updateQuestion(qi, {
                            acceptAnswers: (q.acceptAnswers ?? []).filter((_, i) => i !== ai),
                          })
                        }
                        className="rounded-lg bg-answer-red/10 px-3 text-sm font-bold text-answer-red disabled:opacity-40"
                      >
                        删
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(qi, {
                        acceptAnswers: [...(q.acceptAnswers ?? []), ''],
                      })
                    }
                    className="text-sm font-bold text-kahoot-purple"
                  >
                    + 添加同义答案
                  </button>
                </div>
              )}

              {q.type === 'order' && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-kahoot-purple/60">
                    按正确顺序填写条目（玩家端会打乱后让其排序）
                  </p>
                  {(q.items ?? []).map((item, ii) => (
                    <div key={ii} className="flex items-center gap-2">
                      <span className="w-6 text-sm font-black text-kahoot-purple/50">{ii + 1}</span>
                      <input
                        value={item}
                        onChange={(e) => {
                          const items = [...(q.items ?? [])]
                          items[ii] = e.target.value
                          updateQuestion(qi, { items })
                        }}
                        placeholder={`条目 ${ii + 1}`}
                        className="flex-1 rounded-lg border-2 border-kahoot-purple/15 px-3 py-2 font-semibold outline-none focus:border-kahoot-purple"
                      />
                      <button
                        type="button"
                        disabled={(q.items?.length ?? 0) <= 2}
                        onClick={() =>
                          updateQuestion(qi, {
                            items: (q.items ?? []).filter((_, i) => i !== ii),
                          })
                        }
                        className="rounded-lg bg-answer-red/10 px-3 text-sm font-bold text-answer-red disabled:opacity-40"
                      >
                        删
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={(q.items?.length ?? 0) >= 8}
                    onClick={() => updateQuestion(qi, { items: [...(q.items ?? []), ''] })}
                    className="text-sm font-bold text-kahoot-purple disabled:opacity-40"
                  >
                    + 添加条目
                  </button>
                </div>
              )}

              <label className="flex flex-wrap items-center gap-2 text-sm font-bold">
                答题倒计时（秒）
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={q.timeLimit}
                  onChange={(e) =>
                    updateQuestion(qi, { timeLimit: Number(e.target.value) || 20 })
                  }
                  className="w-24 rounded-lg border-2 border-kahoot-purple/15 px-3 py-2 outline-none focus:border-kahoot-purple"
                />
              </label>
            </article>
          ))}
        </div>

        {error && <p className="font-bold text-red-200">{error}</p>}

        <div className="sticky bottom-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                questions: [...prev.questions, createEmptyQuestion('choice')],
              }))
            }
            className="flex-1 rounded-xl border-2 border-white/40 bg-white/10 py-3 font-black text-white hover:bg-white/20"
          >
            + 新增题目
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-kahoot-magenta py-3 font-black text-white shadow-lg hover:brightness-110 disabled:opacity-60"
          >
            {saving ? '保存中…' : '保存测验'}
          </button>
        </div>
      </div>
    </div>
  )
}
