/**
 * v4.22: 만료 임박 배너 (D-7/D-3/D-1) — 기존 카드 아래 별도 섹션
 */
import { useNavigate } from 'react-router-dom'
import { getDaysUntilExpiry, getExpiryWarningLevel } from '../utils/expiryUtils'

export default function ExpiryWarningBanner({ programEndDate, programStatus }) {
  const navigate = useNavigate()

  if (programStatus !== 'active' || !programEndDate) return null

  const daysLeft = getDaysUntilExpiry(programEndDate)
  const level = getExpiryWarningLevel(daysLeft)
  if (level === 'none') return null

  const config = {
    warning: {
      bg: 'bg-amber-50 border-amber-300',
      icon: '⏳',
      title: `프로그램 종료까지 ${daysLeft}일 남았습니다`,
      message: '지금 연장하면 학습 흐름을 유지할 수 있어요.',
      btnText: '30일 연장하기',
      btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
    },
    urgent: {
      bg: 'bg-orange-50 border-orange-400',
      icon: '🔥',
      title: `D-${daysLeft} 만료 임박!`,
      message: '지금 연장하지 않으면 학습 데이터 접근이 제한됩니다.',
      btnText: '지금 연장하기',
      btnClass: 'bg-orange-500 hover:bg-orange-600 text-white',
    },
    critical: {
      bg: 'bg-red-50 border-red-500',
      icon: '🚨',
      title: daysLeft === 0 ? '오늘 만료됩니다!' : '내일 만료됩니다!',
      message: '850→900 도전이 끊기지 않게 지금 바로 연장하세요.',
      btnText: '지금 바로 연장',
      btnClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
  }[level]

  return (
    <div className={`border rounded-xl p-4 mb-4 ${config.bg}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{config.title}</p>
          <p className="text-sm text-gray-700 mt-0.5">{config.message}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/upgrade')}
          className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium ${config.btnClass}`}
        >
          {config.btnText}
        </button>
      </div>
    </div>
  )
}
