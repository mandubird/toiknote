/**
 * v4.22: 900까지 남은 점수 시각화 (가로 게이지 + 색상 구간)
 */
export default function ScoreGaugeCard({
  currentScore,
  targetScore = 900,
  maxScore = 990,
}) {
  const current = Number(currentScore) || 0
  const target = Number(targetScore) || 900
  const max = Number(maxScore) || 990
  const gap = Math.max(0, target - current)
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0

  const getGaugeColor = () => {
    if (gap <= 50) return { bar: '#22c55e', text: '#16a34a', label: '거의 다 왔어요!' }
    if (gap <= 100) return { bar: '#f59e0b', text: '#d97706', label: '조금만 더!' }
    return { bar: '#ef4444', text: '#dc2626', label: '집중 훈련이 필요해요' }
  }
  const color = getGaugeColor()
  const targetMarkerPercent = (target / max) * 100

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-gray-700">900까지 남은 점수</span>
        <span className="text-xs font-medium" style={{ color: color.text }}>
          {color.label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">현재</p>
          <p className="font-bold text-gray-900">{current}점</p>
        </div>
        <span className="text-gray-400">→</span>
        <div>
          <p className="text-xs text-gray-500">목표</p>
          <p className="font-bold text-primary-600">{target}점</p>
        </div>
        <div className="ml-auto rounded-lg bg-gray-100 px-3 py-1.5">
          <p className="text-xs text-gray-500">남은 점수</p>
          <p className="font-bold" style={{ color: color.text }}>-{gap}점</p>
        </div>
      </div>
      <div className="relative h-3 bg-gray-200 rounded-full overflow-visible">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: color.bar }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gray-700 rounded"
          style={{ left: `${Math.min(100, targetMarkerPercent)}%` }}
          title={`${target}점`}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>200</span>
        <span>990</span>
      </div>
    </div>
  )
}
