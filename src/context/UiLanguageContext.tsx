import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  isUiLang,
  translate,
  UI_LANG_STORAGE_KEY,
  type UiLang,
} from '../i18n/translations'
import type { QuestionType } from '../types'

type TFn = (key: string, params?: Record<string, string | number>) => string

type UiLanguageContextValue = {
  lang: UiLang
  setLang: (lang: UiLang) => void
  t: TFn
  questionTypeLabel: (type: QuestionType) => string
  questionTypeHint: (type: QuestionType) => string
}

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null)

function readStoredLang(): UiLang {
  try {
    const raw = localStorage.getItem(UI_LANG_STORAGE_KEY)
    if (raw && isUiLang(raw)) return raw
  } catch {
    // ignore
  }
  const nav = (navigator.language || 'zh').toLowerCase()
  if (nav.startsWith('th')) return 'th'
  if (nav.startsWith('id')) return 'id'
  if (nav.startsWith('en')) return 'en'
  return 'zh'
}

export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UiLang>(() =>
    typeof window === 'undefined' ? 'zh' : readStoredLang(),
  )

  const setLang = useCallback((next: UiLang) => {
    setLangState(next)
    try {
      localStorage.setItem(UI_LANG_STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback<TFn>((key, params) => translate(lang, key, params), [lang])

  const questionTypeLabel = useCallback(
    (type: QuestionType) => t(`qtype.${type}`),
    [t],
  )
  const questionTypeHint = useCallback(
    (type: QuestionType) => t(`qhint.${type}`),
    [t],
  )

  const value = useMemo(
    () => ({ lang, setLang, t, questionTypeLabel, questionTypeHint }),
    [lang, setLang, t, questionTypeLabel, questionTypeHint],
  )

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>
}

export function useUiLanguage() {
  const ctx = useContext(UiLanguageContext)
  if (!ctx) throw new Error('useUiLanguage must be used within UiLanguageProvider')
  return ctx
}
