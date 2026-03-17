/**
 * /upgrade — 무료 체험 종료 후 구독 안내 페이지
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProgramPlan } from '../services/programService'

const UpgradePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    getProgramPlan(user.id)
      .then(setPlan)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  if (loading) {
    return (
      <div className="p-4 flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-4">
        <p className="text-gray-600">로그인이 필요해요.</p>
        <button type="button" onClick={() => navigate('/')} className="mt-3 text-primary-600 font-medium">
          홈으로
        </button>
      </div>
    )
  }

  const isExpiredOrCompleted = plan?.status === 'expired' || plan?.status === 'completed'
  const isNone = !plan?.status || plan?.status === 'none'
  const hasActive = plan?.status === 'active'

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Pro 구독</h1>

      {/* 전략 플랜 진행 중 */}
      {hasActive && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-base font-semibold text-gray-800 mb-2">전략 플랜이 진행 중이에요</p>
          <p className="text-sm text-gray-600 mb-4">
            Pro로 업그레이드하면 전체 전략 플랜과 점수 예측 기능을 이용할 수 있어요.
          </p>
          <button
            type="button"
            onClick={() => navigate('/settings?pay=1')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
          >
            Pro 구독하기
          </button>
          <button
            type="button"
            onClick={() => navigate('/program')}
            className="mt-2 w-full py-2 border border-gray-300 text-gray-700 text-sm rounded-lg"
          >
            전략 플랜 보기
          </button>
        </div>
      )}

      {/* 구독 만료 / 완료 */}
      {isExpiredOrCompleted && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-2xl font-bold text-primary-600 mb-2">플랜 종료 🎉</p>
          <p className="text-gray-600 mb-4">구독 기간이 종료되었어요. 다시 시작하거나 연장할 수 있어요.</p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/settings?pay=1')}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
            >
              구독 연장하기
            </button>
            <button
              type="button"
              onClick={() => navigate('/diagnostic')}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg"
            >
              재진단하고 다시 시작하기
            </button>
          </div>
        </div>
      )}

      {/* 아직 시작 안 함 */}
      {isNone && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-700 mb-4">아직 전략 플랜을 시작하지 않으셨어요. 진단을 먼저 완료해 주세요.</p>
          <button
            type="button"
            onClick={() => navigate('/diagnostic')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
          >
            진단하고 시작하기
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings?pay=1')}
            className="w-full mt-2 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg"
          >
            구독 플랜 안내
          </button>
        </div>
      )}
    </div>
  )
}

export default UpgradePage
