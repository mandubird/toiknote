/**
 * v4.23: 희소성 — 가격 섹션 위, 잔여 30자리 이하 시 표시
 */
import { useState, useEffect } from 'react'
import { getRemainingSlots } from '../../services/landingService'

export default function ScarcityCounter() {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    getRemainingSlots().then(setRemaining).catch(() => setRemaining(0))
  }, [])

  if (remaining === null) return null
  if (remaining <= 0) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-center text-red-800 font-medium">
        베타 마감 — 다음 기수 대기 신청
      </div>
    )
  }
  if (remaining > 30) return null

  const isUrgent = remaining <= 10
  return (
    <div
      className={
        isUrgent
          ? 'mx-auto max-w-xl rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-red-800'
          : 'mx-auto max-w-xl rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-center text-amber-900'
      }
    >
      <span className="mr-2">🔥</span>
      <strong>현재 베타 {remaining}자리 남음</strong>
      <p className="mt-1 text-xs opacity-90">베타 100명 한정 · 이후 정가 적용</p>
    </div>
  )
}
