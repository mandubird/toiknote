/**
 * v4.22: D-1 전체 화면 모달 (내일/오늘 만료)
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDaysUntilExpiry } from '../utils/expiryUtils'

export default function ExpiryModal({ programEndDate, programStatus }) {
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()

  if (programStatus !== 'active' || !programEndDate || dismissed) return null

  const daysLeft = getDaysUntilExpiry(programEndDate)
  if (daysLeft > 1) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
        <div className="text-4xl mb-4">🚨</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {daysLeft <= 0 ? '오늘 프로그램이 만료됩니다' : '내일 프로그램이 만료됩니다'}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          지금까지 쌓아온 학습 데이터와 점수 예측이<br />
          만료 후 접근 제한됩니다.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/upgrade')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
          >
            지금 바로 30일 연장하기
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-sm text-gray-500 py-2"
          >
            오늘 하루 닫기
          </button>
        </div>
      </div>
    </div>
  )
}
