import { useNavigate } from 'react-router-dom'

export default function OnboardingCtaBar({
  exampleMode,
  onRegisterWrong3,
  onGoPayment,
  onDirectDiagnose,
}) {
  const navigate = useNavigate()

  const goNotes = () => {
    if (onRegisterWrong3) return onRegisterWrong3()
    navigate('/notes')
  }

  const goPayment = () => {
    if (onGoPayment) return onGoPayment()
    navigate('/settings?pay=1')
  }

  const goDirectDiagnose = () => {
    if (onDirectDiagnose) return onDirectDiagnose()
    // fallback: notes로 보내지 않고, 화면만 되돌리는 동작이 없으므로 diagnosis로 간다는 의미로 처리
    navigate('/diagnostic')
  }

  return (
    <div className="pt-2">
      {exampleMode ? (
        <button
          type="button"
          onClick={goDirectDiagnose}
          className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm"
        >
          직접 진단하기
        </button>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={goNotes}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm"
          >
            오답 3개만 등록하면 정밀 코칭으로 바뀌어요
          </button>
          <button
            type="button"
            onClick={goPayment}
            className="w-full py-3 rounded-xl bg-amber-400 text-gray-900 font-black text-sm"
          >
            매일 코칭 + 전략 분석 받기 · 15일 29,900원 &rarr;
          </button>
        </div>
      )}
    </div>
  )
}

