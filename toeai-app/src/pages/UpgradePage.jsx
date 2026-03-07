/**
 * v4.1: 프로그램 만료/미가입 시 연장·재도전 안내 /upgrade
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

  const isExpired = plan?.status === 'expired' || plan?.status === 'completed'
  const isNone = plan?.status === 'none'
  const hasActive = plan?.status === 'active'

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-bold text-gray-900 mb-4">프로젝트 종료</h1>

      {hasActive && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-700">현재 100일 프로젝트가 진행 중이에요.</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-4 w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
          >
            대시보드로 이동
          </button>
        </div>
      )}

      {isExpired && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-2xl font-bold text-primary-600 mb-2">Day 60 완료! 🎉</p>
          <p className="text-gray-600 mb-4">100일 프로젝트을 모두 마치셨어요.</p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="w-full py-3 border border-primary-600 text-primary-600 font-medium rounded-lg"
            >
              30일 연장 (설정에서 결제)
            </button>
            <button
              type="button"
              onClick={() => navigate('/diagnostic')}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg"
            >
              재도전 프로그램 신청
            </button>
          </div>
        </div>
      )}

      {isNone && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-700 mb-4">100일 프로젝트에 아직 참여하지 않으셨어요. 진단 후 결제하면 시작할 수 있어요.</p>
          <button
            type="button"
            onClick={() => navigate('/diagnostic')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
          >
            진단하고 시작하기
          </button>
          <button
            type="button"
            onClick={() => navigate('/program')}
            className="w-full mt-2 py-2 border border-gray-300 text-gray-700 rounded-lg"
          >
            100일 프로젝트 안내
          </button>
        </div>
      )}
    </div>
  )
}

export default UpgradePage
