import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isLikelyInAppWebView, openInExternalBrowser } from '../utils/inAppWebView'

const DISMISS_KEY = 'toeai_hide_oauth_webview_banner'

export default function OAuthWebViewBanner() {
  const { user, loading } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [isWebView, setIsWebView] = useState(false)

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
    setIsWebView(isLikelyInAppWebView())
  }, [])

  if (loading || user || dismissed || !isWebView) return null

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] border-b border-amber-800/20 bg-amber-500 px-3 py-2.5 text-center text-amber-950 shadow-md sm:px-4"
      role="region"
      aria-label="외부 브라우저 안내"
    >
      <p className="mx-auto max-w-lg text-xs font-semibold leading-snug sm:text-sm">
        앱 내 브라우저로 보고 있어요. <strong>구글 로그인</strong>은 Safari 또는 Chrome에서만 안정적으로 됩니다.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => openInExternalBrowser(window.location.href)}
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800 sm:text-sm"
        >
          외부 브라우저에서 열기
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs font-medium text-amber-950/80 underline underline-offset-2 hover:text-amber-950"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
