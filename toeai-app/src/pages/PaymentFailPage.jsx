import { useNavigate, useSearchParams } from 'react-router-dom'

const PaymentFailPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const message = searchParams.get('message') || '결제에 실패했어요.'
  const code = searchParams.get('code')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <p className="text-lg font-semibold text-gray-900">결제 실패</p>
      <p className="text-sm text-gray-600 mt-2 text-center">{message}</p>
      {code && <p className="text-xs text-gray-400 mt-1">코드: {code}</p>}
      <button
        type="button"
        onClick={() => navigate('/', { replace: true })}
        className="mt-6 py-2 px-4 bg-primary-600 text-white rounded-lg"
      >
        홈으로
      </button>
    </div>
  )
}

export default PaymentFailPage
