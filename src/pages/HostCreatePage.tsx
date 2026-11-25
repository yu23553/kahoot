import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useUiLanguage } from '../context/UiLanguageContext'
import {
  ANSWER_COLORS,
  createEmptyQuestion,
  DEFAULT_QUIZ,
  emptyLocale,
  ensureQuestionLocales,
} from '../data/mock'
import { api } from '../lib/api'
import type { Question, QuestionLocale, QuestionType, QuizDraft, QuizLanguage } from '../types'
import { PRESET_LANGUAGES } from '../types'

const TYPE_OPTIONS: QuestionType[] = ['choice', 'truefalse', 'fill', 'order']

function hydrateDraft(raw: {
  title: string
  questions: Question[]
  languages?: QuizLanguage[]
  defaultLanguage?: string
}): QuizDraft {
  const languages: QuizLanguage[] =
    raw.languages && raw.languages.length > 0
      ? raw.languages
      : [{ code: 'zh', label: '中文' }]
  const defaultLanguage =
    raw.defaultLanguage && languages.some((l) => l.code === raw.defaultLanguage)
      ? raw.defaultLanguage
      : languages[0].code
  return {
    title: raw.title,
    languages,
    defaultLanguage,
    questions: raw.questions.map((q) => {
      // 兼容旧数据：无 locales 时塞进默认语言
      if (!q.locales || Object.keys(q.locales).length === 0) {
        const legacy = q as Question & {
          text?: string
          options?: string[]
          acceptAnswers?: string[]
          items?: string[]
        }
        const locales: Record<string, QuestionLocale> = {}
        for (const lang of languages) {
          locales[lang.code] = emptyLocale(q.type || 'choice', lang.code)
        }
        locales[defaultLanguage] = {
          text: legacy.text || '',
          options: legacy.options,
          acceptAnswers: legacy.acceptAnswers,
          items: legacy.items,
        }
        return ensureQuestionLocales(
          {
            id: q.id,
            type: q.type || 'choice',
            timeLimit: q.timeLimit,
            points: Number.isFinite(q.points) ? q.points : 1000,
            correctIndex: q.correctIndex,
            locales,
          },
          languages,
        )
      }
      return ensureQuestionLocales(
        {
          ...q,
          points: Number.isFinite(q.points) ? q.points : 1000,
        },
        languages,
      )
    }),
  }
}

export default function HostCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('id')
  const { user, loading: authLoading } = useAuth()
  const { t, questionTypeLabel } = useUiLanguage()
  const [draft, setDraft] = useState<QuizDraft>(() => structuredClone(DEFAULT_QUIZ))
  const [editLang, setEditLang] = useState('zh')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(!editId)
  const [customCode, setCustomCode] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const tfFallback = [t('tf.true'), t('tf.false')]

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
        const next = hydrateDraft(quiz)
        setDraft(next)
        setEditLang(next.defaultLanguage)
        setLoaded(true)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t('common.loadFailed'))
        setLoaded(true)
      })
  }, [user, authLoading, editId, navigate, t])

  const activeLang = draft.languages.find((l) => l.code === editLang) || draft.languages[0]

  const canSave = useMemo(() => {
    if (!draft.title.trim() || draft.questions.length === 0 || draft.languages.length === 0) {
      return false
    }
    return draft.questions.every((q) => {
      if (q.timeLimit < 5 || q.timeLimit > 120) return false
      for (const lang of draft.languages) {
        const loc = q.locales?.[lang.code]
        if (!loc?.text?.trim()) return false
        if (q.type === 'choice') {
          if (!loc.options?.length || loc.options.some((o) => !o.trim())) return false
        }
        if (q.type === 'truefalse') {
          if (!loc.options || loc.options.length < 2 || loc.options.some((o) => !o.trim())) {
            return false
          }
        }
        if (q.type === 'fill') {
          if (!(loc.acceptAnswers ?? []).some((a) => a.trim())) return false
        }
        if (q.type === 'order') {
          const items = loc.items ?? []
          if (items.length < 2 || items.some((i) => !i.trim())) return false
        }
      }
      if (q.type === 'order') {
        const counts = draft.languages.map((l) => q.locales[l.code]?.items?.length ?? 0)
        if (counts.some((c) => c !== counts[0])) return false
      }
      if (q.type === 'choice' || q.type === 'truefalse') {
        if (q.correctIndex === undefined) return false
      }
      return true
    })
  }, [draft])

  const setLanguages = (languages: QuizLanguage[]) => {
    if (languages.length === 0) return
    const defaultLanguage = languages.some((l) => l.code === draft.defaultLanguage)
      ? draft.defaultLanguage
      : languages[0].code
    setDraft((prev) => ({
      ...prev,
      languages,
      defaultLanguage,
      questions: prev.questions.map((q) => ensureQuestionLocales(q, languages)),
    }))
    if (!languages.some((l) => l.code === editLang)) {
      setEditLang(defaultLanguage)
    }
  }

  const addPresetLanguage = (lang: QuizLanguage) => {
    if (draft.languages.some((l) => l.code === lang.code)) return
    setLanguages([...draft.languages, lang])
    setEditLang(lang.code)
  }

  const addCustomLanguage = () => {
    const code = customCode.trim().toLowerCase().slice(0, 16)
    const label = customLabel.trim().slice(0, 32)
    if (!code || !label) {
      setError(t('create.needCustom'))
      return
    }
    if (draft.languages.some((l) => l.code === code)) {
      setError(t('create.codeExists'))
      return
    }
    setError('')
    setLanguages([...draft.languages, { code, label }])
    setEditLang(code)
    setCustomCode('')
    setCustomLabel('')
  }

  const removeLanguage = (code: string) => {
    if (draft.languages.length <= 1) return
    setLanguages(draft.languages.filter((l) => l.code !== code))
  }

  const updateLocale = (qi: number, patch: Partial<QuestionLocale>) => {
    const code = activeLang?.code
    if (!code) return
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qi) return q
        return {
          ...q,
          locales: {
            ...q.locales,
            [code]: { ...q.locales[code], ...patch },
          },
        }
      }),
    }))
  }

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
        return ensureQuestionLocales({ ...q, type, correctIndex: 0 }, prev.languages, type)
      }),
    }))
  }

  const onSave = async () => {
    if (!user || !canSave) {
      setError(t('create.validate'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: draft.title.trim(),
        languages: draft.languages,
        defaultLanguage: draft.defaultLanguage,
        questions: draft.questions,
      }
      if (editId) await api.updateQuiz(user.token, editId, payload)
      else await api.createQuiz(user.token, payload)
      navigate('/host')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (!loaded || authLoading) {
    return (
      <div className="bg-kahoot-gradient flex min-h-dvh items-center justify-center text-white">
        {t('common.loading')}
      </div>
    )
  }

  const langCode = activeLang?.code || 'zh'

  return (
    <div className="bg-kahoot-gradient min-h-dvh px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pr-28">
          <Logo size="sm" />
          <button
            type="button"
            onClick={() => navigate('/host')}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
          >
            {t('create.back')}
          </button>
        </div>

        <header className="space-y-3">
          <h1 className="font-display text-3xl font-black text-white">
            {editId ? t('create.editTitle') : t('create.newTitle')}
          </h1>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder={t('create.titlePlaceholder')}
            className="w-full rounded-xl border-0 bg-white px-4 py-3 text-lg font-black text-kahoot-purple outline-none"
          />
        </header>

        {/* 语言管理 — 题库答题语言，与网站界面语言无关 */}
        <section className="space-y-3 rounded-2xl bg-white/10 p-4 text-white backdrop-blur">
          <h2 className="font-black">{t('create.quizLangTitle')}</h2>
          <p className="text-xs text-white/70">{t('create.quizLangHint')}</p>
          <div className="flex flex-wrap gap-2">
            {draft.languages.map((lang) => (
              <div
                key={lang.code}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${
                  draft.defaultLanguage === lang.code
                    ? 'bg-kahoot-magenta text-white'
                    : 'bg-white/20'
                }`}
              >
                <button type="button" onClick={() => setDraft((d) => ({ ...d, defaultLanguage: lang.code }))}>
                  {lang.label}
                  {draft.defaultLanguage === lang.code ? t('create.default') : ''}
                </button>
                {draft.languages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLanguage(lang.code)}
                    className="opacity-80 hover:opacity-100"
                    aria-label={t('create.removeLang', { label: lang.label })}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_LANGUAGES.filter((p) => !draft.languages.some((l) => l.code === p.code)).map(
              (p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => addPresetLanguage(p)}
                  className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25"
                >
                  + {p.label}
                </button>
              ),
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder={t('create.codePlaceholder')}
              className="w-24 rounded-lg border-0 px-2 py-1.5 text-sm font-bold text-kahoot-purple"
            />
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder={t('create.labelPlaceholder')}
              className="w-28 rounded-lg border-0 px-2 py-1.5 text-sm font-bold text-kahoot-purple"
            />
            <button
              type="button"
              onClick={addCustomLanguage}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-black text-kahoot-purple"
            >
              {t('create.addCustom')}
            </button>
          </div>
        </section>

        {/* 编辑语言切换 */}
        <div className="flex flex-wrap gap-2">
          {draft.languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setEditLang(lang.code)}
              className={`rounded-xl px-4 py-2 text-sm font-black ${
                editLang === lang.code
                  ? 'bg-white text-kahoot-purple'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {t('create.editing', { label: lang.label })}
            </button>
          ))}
        </div>
        <p className="text-sm font-bold text-white/80">
          {t('create.editingHint', { label: activeLang?.label || '' })}
        </p>

        <div className="space-y-4">
          {draft.questions.map((q, qi) => {
            const loc = q.locales?.[langCode] || emptyLocale(q.type, langCode)
            return (
              <article
                key={q.id}
                className="animate-pop-in space-y-3 rounded-2xl bg-white p-4 text-kahoot-purple shadow-lg sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black">
                    {t('create.questionLabel', { n: qi + 1, lang: activeLang?.label || '' })}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={q.type}
                      onChange={(e) => changeType(qi, e.target.value as QuestionType)}
                      className="rounded-lg border-2 border-kahoot-purple/15 px-2 py-1.5 text-sm font-bold outline-none"
                    >
                      {TYPE_OPTIONS.map((qt) => (
                        <option key={qt} value={qt}>
                          {questionTypeLabel(qt)}
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
                      {t('create.delete')}
                    </button>
                  </div>
                </div>

                <textarea
                  value={loc.text}
                  onChange={(e) => updateLocale(qi, { text: e.target.value })}
                  placeholder={t('create.textPlaceholder', { lang: activeLang?.label || '' })}
                  rows={2}
                  className="w-full resize-y rounded-xl border-2 border-kahoot-purple/15 px-3 py-2 font-bold outline-none focus:border-kahoot-purple"
                />

                {q.type === 'choice' && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(loc.options ?? ['', '', '', '']).map((opt, oi) => (
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
                            const options = [...(loc.options ?? ['', '', '', ''])]
                            options[oi] = e.target.value
                            updateLocale(qi, { options })
                          }}
                          placeholder={t('create.optionPlaceholder', {
                            lang: activeLang?.label || '',
                            n: oi + 1,
                          })}
                          className="min-w-0 flex-1 rounded-lg border-2 border-kahoot-purple/15 px-3 py-2 text-sm font-semibold outline-none focus:border-kahoot-purple"
                        />
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'truefalse' && (
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(loc.options ?? tfFallback).slice(0, 2).map((label, oi) => (
                        <input
                          key={oi}
                          value={label}
                          onChange={(e) => {
                            const options = [...(loc.options ?? tfFallback)]
                            options[oi] = e.target.value
                            updateLocale(qi, { options })
                          }}
                          placeholder={
                            oi === 0 ? t('create.truePlaceholder') : t('create.falsePlaceholder')
                          }
                          className="rounded-lg border-2 border-kahoot-purple/15 px-3 py-2 text-sm font-semibold outline-none"
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {(loc.options ?? tfFallback).slice(0, 2).map((label, oi) => (
                        <label
                          key={oi}
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
                          {t('create.setCorrect', {
                            label: label || (oi === 0 ? t('tf.true') : t('tf.false')),
                          })}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {q.type === 'fill' && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-kahoot-purple/60">
                      {t('create.acceptAnswers', { lang: activeLang?.label || '' })}
                    </p>
                    {(loc.acceptAnswers ?? ['']).map((ans, ai) => (
                      <div key={ai} className="flex gap-2">
                        <input
                          value={ans}
                          onChange={(e) => {
                            const acceptAnswers = [...(loc.acceptAnswers ?? [])]
                            acceptAnswers[ai] = e.target.value
                            updateLocale(qi, { acceptAnswers })
                          }}
                          placeholder={t('create.answerN', { n: ai + 1 })}
                          className="flex-1 rounded-lg border-2 border-kahoot-purple/15 px-3 py-2 font-semibold outline-none focus:border-kahoot-purple"
                        />
                        <button
                          type="button"
                          disabled={(loc.acceptAnswers?.length ?? 0) <= 1}
                          onClick={() =>
                            updateLocale(qi, {
                              acceptAnswers: (loc.acceptAnswers ?? []).filter((_, i) => i !== ai),
                            })
                          }
                          className="rounded-lg bg-answer-red/10 px-3 text-sm font-bold text-answer-red disabled:opacity-40"
                        >
                          {t('create.remove')}
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateLocale(qi, {
                          acceptAnswers: [...(loc.acceptAnswers ?? []), ''],
                        })
                      }
                      className="text-sm font-bold text-kahoot-purple"
                    >
                      {t('create.addSynonym')}
                    </button>
                  </div>
                )}

                {q.type === 'order' && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-kahoot-purple/60">
                      {activeLang?.label} {t('create.orderHint')}
                    </p>
                    {(loc.items ?? []).map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2">
                        <span className="w-6 text-sm font-black text-kahoot-purple/50">{ii + 1}</span>
                        <input
                          value={item}
                          onChange={(e) => {
                            const items = [...(loc.items ?? [])]
                            items[ii] = e.target.value
                            updateLocale(qi, { items })
                          }}
                          placeholder={t('create.itemN', { n: ii + 1 })}
                          className="flex-1 rounded-lg border-2 border-kahoot-purple/15 px-3 py-2 font-semibold outline-none focus:border-kahoot-purple"
                        />
                        <button
                          type="button"
                          disabled={(loc.items?.length ?? 0) <= 2}
                          onClick={() => {
                            setDraft((prev) => ({
                              ...prev,
                              questions: prev.questions.map((qq, i) => {
                                if (i !== qi) return qq
                                const locales = { ...qq.locales }
                                for (const lang of prev.languages) {
                                  const L = locales[lang.code]
                                  if (!L?.items) continue
                                  locales[lang.code] = {
                                    ...L,
                                    items: L.items.filter((_, idx) => idx !== ii),
                                  }
                                }
                                return { ...qq, locales }
                              }),
                            }))
                          }}
                          className="rounded-lg bg-answer-red/10 px-3 text-sm font-bold text-answer-red disabled:opacity-40"
                        >
                          {t('create.remove')}
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={(loc.items?.length ?? 0) >= 8}
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          questions: prev.questions.map((qq, i) => {
                            if (i !== qi) return qq
                            const locales = { ...qq.locales }
                            for (const lang of prev.languages) {
                              const L = locales[lang.code] || emptyLocale('order', lang.code)
                              locales[lang.code] = {
                                ...L,
                                items: [...(L.items ?? []), ''],
                              }
                            }
                            return { ...qq, locales }
                          }),
                        }))
                      }}
                      className="text-sm font-bold text-kahoot-purple disabled:opacity-40"
                    >
                      {t('create.addItem')}
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-4">
                  <label className="flex flex-wrap items-center gap-2 text-sm font-bold">
                    {t('create.timeLimit')}
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
                  <label className="flex flex-wrap items-center gap-2 text-sm font-bold">
                    {t('create.points')}
                    <input
                      type="number"
                      min={100}
                      max={5000}
                      step={50}
                      value={q.points ?? 1000}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        updateQuestion(qi, {
                          points: Number.isFinite(n) ? Math.round(n) : 1000,
                        })
                      }}
                      className="w-28 rounded-lg border-2 border-kahoot-purple/15 px-3 py-2 outline-none focus:border-kahoot-purple"
                    />
                  </label>
                </div>
              </article>
            )
          })}
        </div>

        {error && <p className="font-bold text-red-200">{error}</p>}

        <div className="sticky bottom-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                questions: [...prev.questions, createEmptyQuestion('choice', prev.languages)],
              }))
            }
            className="flex-1 rounded-xl border-2 border-white/40 bg-white/10 py-3 font-black text-white hover:bg-white/20"
          >
            {t('create.addQuestion')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-kahoot-magenta py-3 font-black text-white shadow-lg hover:brightness-110 disabled:opacity-60"
          >
            {saving ? t('create.saving') : t('create.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
