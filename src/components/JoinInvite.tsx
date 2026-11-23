import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useUiLanguage } from '../context/UiLanguageContext'
import { buildJoinUrl, fetchJoinInfo, type JoinInfo } from '../lib/joinUrl'

type Props = {
  pin: string
}

export function JoinInvite({ pin }: Props) {
  const { t } = useUiLanguage()
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null)
  const [selectedIp, setSelectedIp] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = () => {
      void fetchJoinInfo().then((info) => {
        if (!alive || !info) return
        setJoinInfo(info)
        if (info.ips?.length) {
          setSelectedIp((prev) => prev || info.ips[0].address)
        }
      })
    }
    load()
    const timer = window.setInterval(load, 4000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  const cloudHosted = Boolean(joinInfo?.cloudHosted)
  const siteUrl = useMemo(
    () => buildJoinUrl(joinInfo?.publicOrigin || window.location.origin, pin),
    [joinInfo?.publicOrigin, pin],
  )

  const lanOrigin = useMemo(() => {
    if (selectedIp) {
      const port = joinInfo?.frontendPort || 5173
      return `http://${selectedIp}:${port}`
    }
    return joinInfo?.preferredOrigin || window.location.origin
  }, [joinInfo, selectedIp])

  const lanUrl = useMemo(() => buildJoinUrl(lanOrigin, pin), [lanOrigin, pin])
  const tunnelUrl = useMemo(
    () => (joinInfo?.publicOrigin ? buildJoinUrl(joinInfo.publicOrigin, pin) : null),
    [joinInfo?.publicOrigin, pin],
  )
  const tunnelOn = Boolean(tunnelUrl)

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      // ignore
    }
  }

  if (cloudHosted) {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm font-bold text-white/80">{t('invite.cloudHint')}</p>
        <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 text-center text-kahoot-purple shadow-xl">
            <p className="text-sm font-bold text-kahoot-purple/60">{t('invite.pinLabel')}</p>
            <div className="animate-pulse-pin my-4 font-display text-4xl font-black tracking-[0.2em] sm:text-5xl">
              {pin}
            </div>
            <button
              type="button"
              onClick={() => void copy('pin', pin)}
              className="rounded-xl bg-kahoot-purple px-4 py-2 text-sm font-black text-white hover:bg-kahoot-purple-light"
            >
              {copied === 'pin' ? t('common.copied') : t('invite.copyPin')}
            </button>
          </div>
          <div className="rounded-2xl bg-white p-5 text-center text-kahoot-purple shadow-xl">
            <p className="text-sm font-bold text-kahoot-purple/60">{t('invite.scanJoin')}</p>
            <div className="mx-auto mt-3 inline-flex flex-col items-center rounded-2xl border-2 border-kahoot-purple/20 bg-kahoot-purple/5 p-3">
              <QRCodeSVG value={siteUrl} size={168} level="M" bgColor="#ffffff" fgColor="#1a1a1a" />
            </div>
            <p className="mt-2 break-all px-1 text-[11px] text-kahoot-purple/60">{siteUrl}</p>
            <button
              type="button"
              onClick={() => void copy('site', siteUrl)}
              className="mt-2 rounded-xl bg-kahoot-purple px-3 py-2 text-xs font-black text-white"
            >
              {copied === 'site' ? t('common.copied') : t('invite.copyLink')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm font-bold text-white/80">{t('invite.dualHint')}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 text-center text-kahoot-purple shadow-xl">
          <p className="text-sm font-bold text-kahoot-purple/60">{t('invite.pinLabel')}</p>
          <div className="animate-pulse-pin my-4 font-display text-4xl font-black tracking-[0.2em] sm:text-5xl">
            {pin}
          </div>
          <p className="mb-4 text-xs text-kahoot-purple/70">{t('invite.pinHelp')}</p>
          <button
            type="button"
            onClick={() => void copy('pin', pin)}
            className="rounded-xl bg-kahoot-purple px-4 py-2 text-sm font-black text-white hover:bg-kahoot-purple-light"
          >
            {copied === 'pin' ? t('common.copied') : t('invite.copyPin')}
          </button>
        </div>

        <div className="rounded-2xl bg-white p-5 text-center text-kahoot-purple shadow-xl">
          <p className="text-sm font-bold text-kahoot-purple/60">{t('invite.wifiLabel')}</p>
          <div className="mx-auto mt-3 inline-flex flex-col items-center rounded-2xl border-2 border-kahoot-purple/20 bg-kahoot-purple/5 p-3">
            <div className="mb-2 text-xs font-black text-kahoot-purple">{t('invite.wifiScan')}</div>
            <QRCodeSVG value={lanUrl} size={148} level="M" bgColor="#ffffff" fgColor="#1a1a1a" />
          </div>
          <p className="mt-2 break-all px-1 text-[11px] text-kahoot-purple/60">{lanUrl}</p>
          <button
            type="button"
            onClick={() => void copy('lan', lanUrl)}
            className="mt-2 rounded-xl bg-kahoot-purple px-3 py-2 text-xs font-black text-white"
          >
            {copied === 'lan' ? t('common.copied') : t('invite.copyWifi')}
          </button>
          {(joinInfo?.ips?.length ?? 0) > 0 && (
            <label className="mt-3 block text-left text-[11px] font-bold text-kahoot-purple/70">
              {t('invite.lanNic')}
              <select
                value={selectedIp}
                onChange={(e) => setSelectedIp(e.target.value)}
                className="mt-1 w-full rounded-lg border-2 border-kahoot-purple/15 px-2 py-1.5 text-xs font-bold outline-none"
              >
                {joinInfo!.ips.map((ip) => (
                  <option key={ip.address} value={ip.address}>
                    {ip.address}（{ip.name}）
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 text-center text-kahoot-purple shadow-xl">
          <p className="text-sm font-bold text-kahoot-purple/60">{t('invite.cellularLabel')}</p>
          {tunnelOn ? (
            <>
              <div className="mx-auto mt-3 inline-flex flex-col items-center rounded-2xl border-2 border-[#07c160]/30 bg-[#f7fff9] p-3">
                <div className="mb-2 flex items-center gap-1 text-xs font-black text-[#07c160]">
                  <WechatIcon />
                  {t('invite.cellularScan')}
                </div>
                <QRCodeSVG
                  value={tunnelUrl!}
                  size={148}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                />
              </div>
              <p className="mt-2 break-all px-1 text-[11px] text-kahoot-purple/60">{tunnelUrl}</p>
              <button
                type="button"
                onClick={() => void copy('tunnel', tunnelUrl!)}
                className="mt-2 rounded-xl bg-[#07c160] px-3 py-2 text-xs font-black text-white"
              >
                {copied === 'tunnel' ? t('common.copied') : t('invite.copyCellular')}
              </button>
            </>
          ) : (
            <div className="mt-4 rounded-xl bg-amber-50 px-3 py-6 text-left text-xs leading-relaxed text-amber-900">
              <p className="font-black">{t('invite.noTunnelTitle')}</p>
              <p className="mt-2">{t('invite.noTunnelRun')}</p>
              <code className="mt-1 block rounded bg-white px-2 py-1 font-mono text-[11px]">
                npm run tunnel
              </code>
              <p className="mt-2">{t('invite.noTunnelAfter')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WechatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M9.5 4C5.9 4 3 6.5 3 9.6c0 1.8 1 3.3 2.5 4.4l-.6 2.2 2.4-1.2c.7.2 1.4.3 2.2.3.3 0 .5 0 .8-.1-.2-.6-.3-1.2-.3-1.8 0-3.4 3.2-6.1 7-6.1.2 0 .5 0 .7.1C16.8 5.3 13.5 4 9.5 4zm-2.2 3.2c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9zm4.4 0c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9zM16.2 9c-3.2 0-5.8 2.2-5.8 4.9s2.6 4.9 5.8 4.9c.6 0 1.2-.1 1.8-.2l2 1-.5-1.8c1.2-.9 2-2.2 2-3.9 0-2.7-2.6-4.9-5.3-4.9zm-1.8 2.5c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7zm3.5 0c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7z" />
    </svg>
  )
}
