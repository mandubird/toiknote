import { useNavigate } from 'react-router-dom'
import ScoreBadge from './ScoreBadge'
import { getCtaForProofReview } from '../../services/proofReviewService'

/**
 * 공개 후기 카드 (proof_assets, 스펙 7.1)
 */
export default function ProofReviewCard({
  review,
  showCta = true,
  compact = false,
  onCta,
}) {
  const navigate = useNavigate()
  const headline = review.headline || '토답 이용 후기'
  const usageDays = review.usage_days
  const cta = getCtaForProofReview(review)

  const handleCta = () => {
    if (onCta) {
      onCta(cta.planKey)
      return
    }
    navigate(`/settings?pay=1`)
  }

  return (
    <div
      className={`bg-white rounded-xl border border-surface-200 shadow-sm flex flex-col ${
        compact ? 'p-3 min-w-[calc(100vw-2rem)] max-w-sm snap-center' : 'p-4'
      }`}
      style={compact ? { width: 'min(calc(100vw - 2rem), 320px)' } : undefined}
    >
      <div className="mb-2">
        <ScoreBadge start={review.start_score} current={review.current_score} />
      </div>
      {usageDays != null && (
        <p className="text-xs text-surface-500 mb-2">{usageDays}일 사용</p>
      )}
      <p className="text-sm font-semibold text-surface-900 leading-snug mb-2">{headline}</p>
      {!compact && review.content && !String(review.content).trim().startsWith('{') && (
        <p className="text-sm text-surface-600 leading-relaxed line-clamp-4 mb-2">{review.content}</p>
      )}
      {review.best_feature && (
        <span className="text-[11px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full w-fit mb-3">
          {review.best_feature}
        </span>
      )}
      {showCta && (
        <button
          type="button"
          onClick={handleCta}
          className="mt-auto w-full py-2.5 rounded-lg bg-primary-600 text-white text-xs font-bold"
        >
          {cta.text}
        </button>
      )}
    </div>
  )
}
