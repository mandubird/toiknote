/**
 * v4.21: 후기 카드 (목록/랜딩용)
 */
const BADGE_INFO = {
  none: null,
  challenger: { emoji: '🥉', name: 'Challenger' },
  elite: { emoji: '🥈', name: 'Elite' },
  '900': { emoji: '🥇', name: '900 달성' },
}

export default function ReviewCard({ review }) {
  const scoreBefore = review.score_before ?? 0
  const scoreAfter = review.score_after ?? 0
  const scoreGain = scoreAfter - scoreBefore
  const badgeLevel = review.users?.badge_level ?? 'none'
  const badge = badgeLevel && badgeLevel !== 'none' ? BADGE_INFO[badgeLevel] : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-medium text-gray-800">{review.nickname}</span>
        {badge && (
          <span className="shrink-0 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
            {badge.emoji} {badge.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 text-sm mb-2">
        <span className="text-gray-500">{scoreBefore}점</span>
        <span className="text-gray-400">→</span>
        <span className="font-semibold text-gray-800">{scoreAfter}점</span>
        <span className={scoreGain > 0 ? 'text-green-600' : 'text-gray-500'}>
          ({scoreGain > 0 ? '+' : ''}{scoreGain})
        </span>
      </div>
      <div className="text-amber-500 text-sm mb-2">{'⭐'.repeat(review.rating)}</div>
      <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
        {review.content.length > 100 ? `${review.content.slice(0, 100)}...` : review.content}
      </p>
      {review.helpful_feature && (
        <p className="mt-2 text-xs text-gray-500">👍 {review.helpful_feature}</p>
      )}
      <p className="mt-2 text-xs text-gray-400">
        {new Date(review.created_at).toLocaleDateString('ko-KR')}
      </p>
    </div>
  )
}
