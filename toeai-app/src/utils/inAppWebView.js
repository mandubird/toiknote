/**
 * 인앱 브라우저(WebView) 휴리스틱 — 100% 정확하지 않으나 OAuth 이슈 완화용
 */

const IN_APP_UA_PATTERNS = [
  /FBAN|FBAV|FB_IAB/i,
  /Instagram/i,
  /Line\//i,
  /KAKAOTALK/i,
  /Twitter/i,
  /; wv\)/i,
  /NAVER\(/i,
  /DaumApps/i,
]

export function isLikelyInAppWebView() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (!ua) return false
  return IN_APP_UA_PATTERNS.some((re) => re.test(ua))
}

/**
 * 현재 URL을 시스템 브라우저에서 열도록 시도 (iOS Safari / Android Chrome 우선)
 * @param {string} url 기본값: 현재 페이지 전체 URL
 */
export function openInExternalBrowser(url) {
  if (typeof window === 'undefined') return
  const target = url || window.location.href
  const ua = navigator.userAgent || ''

  if (/iPhone|iPad|iPod/i.test(ua)) {
    window.location.href = target.replace(/^https:/i, 'x-safari-https:')
    return
  }

  if (/Android/i.test(ua)) {
    try {
      const u = new URL(target)
      const path = `${u.pathname}${u.search}${u.hash}` || '/'
      const intent = `intent://${u.host}${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(target)};end`
      window.location.href = intent
    } catch {
      window.open(target, '_blank', 'noopener,noreferrer')
    }
    return
  }

  window.open(target, '_blank', 'noopener,noreferrer')
}
