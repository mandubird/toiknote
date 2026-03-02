/**
 * v4.23: 손실 회피 트리거 — Hero 바로 아래
 */
export default function LossAversionBanner() {
  return (
    <div className="bg-amber-50 border-y border-amber-200 px-4 py-3">
      <div className="mx-auto max-w-3xl flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <p className="text-sm text-gray-800">
          시험 한 번으로 <strong>3개월이 날아갈 수 있습니다.</strong>
          <br />
          <span className="text-gray-600">
            전략 없이 반복 응시하는 비용: 응시료 × 시간 × 기회비용
          </span>
        </p>
      </div>
    </div>
  )
}
