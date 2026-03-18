function pickImpact(pct) {
  if (pct >= 35) return '+80점 가능 구간'
  if (pct >= 25) return '+50점 가능 구간'
  if (pct >= 15) return '+30점 가능 구간'
  return '+10~20점 가능 구간'
}

export default function WeaknessInsightCard({ totalWrong = 0, topTagName = null, topTagCount = 0 }) {
  if (!totalWrong || !topTagName) return null

  const pct = Math.max(1, Math.min(99, Math.round((topTagCount / Math.max(1, totalWrong)) * 100)))
  const impact = pickImpact(pct)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">약점 인사이트</p>
      <h3 className="text-base font-bold text-gray-900">
        {topTagName}에서 {pct}% 오류
      </h3>
      <p className="text-sm text-gray-600 mt-1">현재 가장 큰 감점 요인입니다. 이 영역부터 줄이면 점수가 가장 빨리 올라요.</p>
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-50 border border-primary-100 px-3 py-1">
        <span className="text-xs font-semibold text-primary-700">{impact}</span>
        <span className="text-xs text-primary-600">우선 교정 추천</span>
      </div>
    </div>
  )
}

