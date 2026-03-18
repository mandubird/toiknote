function pickModeTitle(mode) {
  if (mode === 'survival') return '이번 주는 "생존 루틴"으로 갑니다'
  if (mode === 'high_compressed') return '이번 주는 "고압축 루틴"으로 갑니다'
  if (mode === 'compressed') return '이번 주는 "압축 루틴"으로 갑니다'
  if (mode === 'normal') return '이번 주는 "균형 루틴"으로 갑니다'
  return '이번 주 루틴을 세팅해요'
}

export default function WeeklyPlanCard({ mode, weakness3 = [], actions = [] }) {
  const w1 = weakness3?.[0]
  const topName = typeof w1 === 'string' ? w1 : w1?.tag || w1?.category || null

  return (
    <div className="bg-primary-50 rounded-xl border border-primary-100 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-1">Weekly Plan</p>
          <h3 className="text-base font-bold text-primary-900">{pickModeTitle(mode)}</h3>
          <p className="text-sm text-primary-800 mt-1">
            {topName ? `핵심 약점: ${topName}부터 고칩니다.` : '오답을 쌓으면 핵심 약점이 자동으로 잡혀요.'}
          </p>
        </div>
      </div>

      {actions?.length > 0 && (
        <ul className="mt-3 space-y-2">
          {actions.slice(0, 3).map((a, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-primary-900">
              <span className="text-primary-600 font-bold">{idx + 1}</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

