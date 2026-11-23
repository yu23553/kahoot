import { UI_LANGUAGES } from '../i18n/translations'
import { useUiLanguage } from '../context/UiLanguageContext'

type Props = {
  /** light = on purple/dark bg; dark = on white card */
  variant?: 'light' | 'dark'
  className?: string
}

export function UiLanguageSwitcher({ variant = 'light', className = '' }: Props) {
  const { lang, setLang, t } = useUiLanguage()
  const isLight = variant === 'light'

  return (
    <label
      className={`inline-flex items-center gap-2 text-xs font-bold ${
        isLight ? 'text-white/80' : 'text-kahoot-purple/70'
      } ${className}`}
    >
      <span className="hidden sm:inline">{t('lang.site')}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as typeof lang)}
        aria-label={t('lang.site')}
        className={`rounded-lg border px-2 py-1.5 text-xs font-bold outline-none ${
          isLight
            ? 'border-white/30 bg-white/15 text-white'
            : 'border-kahoot-purple/20 bg-white text-kahoot-purple'
        }`}
      >
        {UI_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="text-kahoot-purple">
            {l.native}
          </option>
        ))}
      </select>
    </label>
  )
}
