import OnboardingCtaBar from './OnboardingCtaBar'

export default function OnboardingResult({
  coaching,
  exampleMode = false,
  onRegisterWrong3,
  onGoPayment,
  onDirectDiagnose,
}) {
  const label = '📋 간단 진단 기반 결과입니다'

  const weaknessTop3 = coaching?.weaknessTop3 || []
  const today3 = coaching?.today3 || []
  const discard1 = coaching?.discard1 || ''

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-surface-200 bg-yellow-50 p-4">
        <p className="text-xs font-bold text-yellow-800 mb-2">{label}</p>
        {exampleMode && (
          <p className="text-xs text-yellow-700">
            🔍 이것은 예시입니다. 내 점수를 입력하면 실제 결과가 나와요.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-surface-200 p-4">
          <h3 className="text-sm font-black text-surface-900 mb-2">약점 TOP3</h3>
          <ul className="space-y-1">
            {weaknessTop3.map((t) => (
              <li key={t} className="text-sm text-surface-700">
                - {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 p-4">
          <h3 className="text-sm font-black text-surface-900 mb-2">오늘 해야 할 공부 3개</h3>
          <ul className="space-y-1">
            {today3.map((t) => (
              <li key={t} className="text-sm text-surface-700">
                - {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 p-4">
          <h3 className="text-sm font-black text-surface-900 mb-2">지금 버려야 할 공부</h3>
          <p className="text-sm text-surface-700">- {discard1}</p>
        </div>
      </div>

      <OnboardingCtaBar
        exampleMode={exampleMode}
        onRegisterWrong3={onRegisterWrong3}
        onGoPayment={onGoPayment}
        onDirectDiagnose={onDirectDiagnose}
      />
    </div>
  )
}

