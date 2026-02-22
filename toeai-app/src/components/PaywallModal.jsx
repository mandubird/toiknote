const PaywallModal = ({ open, onClose }) => {
  const paymentUrl = import.meta.env.VITE_PAYMENT_URL || ''

  const handlePayment = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank', 'noopener,noreferrer')
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-2">무료 5회를 모두 사용했어요</h2>
          <p className="text-sm text-gray-600 mb-3">
            무료는 오답 5문제 + 기본 분석(OCR, 파트 분류, 해설)만 제공해요.
          </p>

          <div className="space-y-2 mb-3 text-xs text-gray-600">
            <p className="font-medium text-gray-700">요금 안내</p>
            <p>· 무료: 오답 5문제, 기본 분석만</p>
            <p>· 정규: 1개월 9,900원 / 2개월 16,900원 ⭐ BEST / 5개월 39,900원</p>
            <p>· 얼리버드: 첫 달 4,900원 (선착순 100명), 이후 정상 요금</p>
          </div>

          <div className="bg-primary-50 rounded-xl p-4 mb-4">
            <p className="text-2xl font-bold text-primary-700">얼리버드 첫 달 4,900원</p>
            <p className="text-xs text-gray-600 mt-1">선착순 100명 한정 · 이후 정상 요금 (취소 가능)</p>
          </div>

          {!paymentUrl && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">
              결제 페이지 연동 예정이에요. 문의: support@toeai.com
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handlePayment}
              className="flex-1 py-3 px-4 rounded-lg bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 disabled:opacity-50"
              disabled={!paymentUrl}
            >
              결제하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaywallModal
