/**
 * v4.27 #7: WeaknessRemovalRoadmap
 * "가장 점수 영향 큰 약점 3개"를 우선순위 로드맵으로 표시
 * 단순 오답수 정렬이 아닌 weaknessScore(정확도×비출도+시간압박) 기반
 */

const PART_LABEL = {
  P5: 'Part 5',
  P6: 'Part 6',
  P7: 'Part 7',
  LC: 'LC',
}

const RANK_STYLE = [
  { ring: 'ring-red-400', badge: 'bg-red-100 text-red-700', label: '1순위' },
  { ring: 'ring-orange-400', badge: 'bg-orange-100 text-orange-700', label: '2순위' },
  { ring: 'ring-yellow-400', badge: 'bg-yellow-100 text-yellow-700', label: '3순위' },
]

function getFreqLabel(fw) {
  if (fw >= 1.6) return { text: '고빈출', color: 'text-red-500' }
  if (fw >= 1.3) return { text: '빈출', color: 'text-orange-500' }
  return { text: '일반', color: 'text-gray-400' }
}

export default function WeaknessRoadmapCard({ weaknesses = [] }) {
  if (!weaknesses.length) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-800">🎯 약점 제거 로드맵</h3>
        <span className="text-xs text-gray-400">점수 영향 큰 순</span>
      </div>

      <div className="space-y-3">
        {weaknesses.slice(0, 3).map((w, idx) => {
          const style = RANK_STYLE[idx]
          const freqInfo = getFreqLabel(w.frequencyWeight ?? 1.0)
          const accuracyPct = w.accuracyRate != null
            ? Math.round((1 - w.accuracyRate) * 100)
            : w.rate ?? 0

          return (
            <div
              key={w.tag}
              className={`flex items-start gap-3 rounded-lg border p-3 ring-1 ${style.ring} bg-white`}
            >
              {/* 순위 뱃지 */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                  {style.label}
                </span>
              </div>

              {/* 태그 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{w.tag}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {w.part && (
                    <span className="text-xs text-gray-500">
                      {PART_LABEL[w.part] ?? w.part}
                    </span>
                  )}
                  <span className={`text-xs font-medium ${freqInfo.color}`}>
                    {freqInfo.text}
                  </span>
                  {w.hasTimePressure && (
                    <span className="text-xs text-blue-500">⏱ 시간 압박</span>
                  )}
                </div>
              </div>

              {/* 오답률 */}
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-red-600">{accuracyPct}%</p>
                <p className="text-xs text-gray-400">오답률</p>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        💡 정확도 · 출제빈도 · 시간압박을 종합해 우선순위를 산출해요
      </p>
    </div>
  )
}
