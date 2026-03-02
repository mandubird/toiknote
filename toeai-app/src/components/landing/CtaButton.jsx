/**
 * v4.23: 랜딩 CTA 버튼 통일 (3종 + GA/메타 트래킹)
 */
import { useNavigate } from 'react-router-dom'
import { CTA } from '../../constants/cta'

export default function CtaButton({ type, position, size = 'normal' }) {
  const navigate = useNavigate()
  const label = CTA[type] ?? type

  const handleClick = () => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'cta_click', { event_category: 'conversion', event_label: `${type}_${position}` })
    }
    if (typeof window.fbq === 'function') {
      if (type === 'START_PROGRAM') window.fbq('track', 'InitiateCheckout')
      if (type === 'FREE_DIAGNOSIS') window.fbq('track', 'Lead')
    }
    if (type === 'FREE_DIAGNOSIS') navigate('/diagnostic')
    else if (type === 'VIEW_RESULT') navigate('/dashboard')
    else if (type === 'START_PROGRAM') navigate('/upgrade')
  }

  const isLarge = size === 'large'
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-xl font-bold text-gray-900 shadow-lg hover:opacity-95 ${
        type === 'START_PROGRAM'
          ? 'bg-primary-600 text-white'
          : 'bg-amber-400 text-gray-900 hover:bg-amber-300'
      } ${isLarge ? 'w-full py-4 text-lg' : 'px-8 py-4 text-lg'}`}
    >
      {type === 'FREE_DIAGNOSIS' && '→ '}
      {label}
      {(type === 'FREE_DIAGNOSIS' || type === 'VIEW_RESULT') && ' →'}
    </button>
  )
}
