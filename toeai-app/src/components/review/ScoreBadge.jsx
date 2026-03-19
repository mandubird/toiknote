/**
 * 점수 전후 뱃지 (스펙 7.2)
 */
export default function ScoreBadge({ start, current, className = '' }) {
  const s = start != null ? Number(start) : null
  const c = current != null ? Number(current) : null
  if (s != null && c != null && Number.isFinite(s) && Number.isFinite(c)) {
    const diff = c - s
    if (diff > 0) {
      return (
        <span className={`inline-flex items-center gap-1 font-bold text-score-600 ${className}`}>
          <span>{s}</span>
          <span className="text-surface-400 font-normal">→</span>
          <span>{c}</span>
          <span className="text-xs font-black bg-score-50 text-score-700 px-2 py-0.5 rounded-full">
            +{diff}점
          </span>
        </span>
      )
    }
  }
  return (
    <span className={`text-sm font-semibold text-primary-700 ${className}`}>공부 방향 잡힘</span>
  )
}
