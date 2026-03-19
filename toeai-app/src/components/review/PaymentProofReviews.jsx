import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPublicProofReviews } from '../../services/proofReviewService'
import ScoreBadge from './ScoreBadge'

/**
 * 결제 시트 상단 — 공개 후기 가로 스크롤 (스펙 6.1)
 */
export default function PaymentProofReviews() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPublicProofReviews(8, { reviewStage2Only: true })
      .then((rows) => {
        if (!cancelled) setItems(rows.slice(0, 3))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || items.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-surface-800">실제 사용자 후기</p>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1">
        {items.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-xl border border-surface-200 p-3 min-w-[calc(100vw-2rem)] max-w-sm snap-center shrink-0"
            style={{ width: 'min(calc(100vw - 2rem), 300px)' }}
          >
            <div className="mb-2">
              <ScoreBadge start={r.start_score} current={r.current_score} />
            </div>
            {r.usage_days != null && (
              <p className="text-[11px] text-surface-500 mb-1">{r.usage_days}일 사용</p>
            )}
            <p className="text-sm font-semibold text-surface-900 leading-snug line-clamp-3">
              {r.headline || (r.content && String(r.content).slice(0, 80)) || '토답 후기'}
            </p>
            {r.best_feature && (
              <span className="inline-block mt-2 text-[10px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                {r.best_feature}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-surface-500 text-center">
        나와 비슷한 상황이라면 아래 플랜으로 시작해 보세요
      </p>
      <button
        type="button"
        onClick={() => navigate('/settings?pay=1')}
        className="w-full py-2.5 rounded-xl bg-accent-500 text-white text-xs font-black"
      >
        30일 표준 코칭 시작하기
      </button>
    </div>
  )
}
