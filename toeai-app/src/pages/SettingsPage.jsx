import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchWrongAnswers } from '../services/fetchWrongAnswers'
import { getSubscription, getFreeLimit } from '../services/subscription'
import { getUserProfile, updateUserProfile } from '../services/userProfile'

const SettingsPage = () => {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const [authError, setAuthError] = useState(null)
  const [savedCount, setSavedCount] = useState(0)
  const [subscribed, setSubscribed] = useState(false)
  const [currentScore, setCurrentScore] = useState('')
  const [targetScore, setTargetScore] = useState('900')
  const [scoreSaving, setScoreSaving] = useState(false)
  const freeLimit = getFreeLimit()

  useEffect(() => {
    if (!user) {
      setSavedCount(0)
      setSubscribed(false)
      setCurrentScore('')
      setTargetScore('900')
      return
    }
    Promise.all([
      fetchWrongAnswers(user.id),
      getSubscription(user.id),
      getUserProfile(user.id),
    ]).then(([list, sub, profile]) => {
      setSavedCount(list.length)
      setSubscribed(sub.paid)
      setCurrentScore(profile.currentScore ? String(profile.currentScore) : '')
      setTargetScore(profile.targetScore ? String(profile.targetScore) : '900')
    })
  }, [user])

  const handleSaveScores = async () => {
    if (!user) return
    const cur = parseInt(currentScore, 10)
    const tgt = parseInt(targetScore, 10)
    if (Number.isNaN(cur) || cur < 0 || cur > 990) {
      alert('현재 점수는 0~990 사이로 입력해 주세요.')
      return
    }
    if (Number.isNaN(tgt) || tgt < 0 || tgt > 990) {
      alert('목표 점수는 0~990 사이로 입력해 주세요.')
      return
    }
    setScoreSaving(true)
    try {
      await updateUserProfile(user.id, { currentScore: cur, targetScore: tgt })
      alert('저장되었어요.')
    } catch (err) {
      alert('저장에 실패했어요.')
    } finally {
      setScoreSaving(false)
    }
  }

  const handleGoogleLogin = async () => {
    setAuthError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setAuthError(err?.message || '로그인에 실패했어요. 다시 시도해 주세요.')
    }
  }

  const handleSignOut = async () => {
    setAuthError(null)
    await signOut()
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">설정</h2>
      </div>

      {/* 로그인 상태 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">계정</h3>
        {loading ? (
          <div className="py-4 text-center text-gray-500 text-sm">계정 정보 불러오는 중...</div>
        ) : user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-semibold">
                  {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.displayName || '사용자'}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm text-red-600 hover:text-red-700"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-4">로그인이 필요합니다</p>
            {authError && (
              <p className="text-sm text-red-600 mb-3">{authError}</p>
            )}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
            >
              구글로 로그인
            </button>
          </div>
        )}
      </div>

      {/* 목표 점수 (로그인 시) */}
      {user && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">목표 점수</h3>
          <p className="text-xs text-gray-500 mb-3">전략 분석에서 참고해요 (0~990)</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">현재 점수</label>
              <input
                type="number"
                min={0}
                max={990}
                value={currentScore}
                onChange={(e) => setCurrentScore(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">목표 점수</label>
              <input
                type="number"
                min={0}
                max={990}
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="900"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveScores}
              disabled={scoreSaving}
              className="w-full py-2 px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {scoreSaving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* 구독 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">구독 현황</h3>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-700">무료 체험</span>
          <span className="text-sm font-semibold text-primary-600">
            {freeLimit}개 중 {savedCount}개 사용
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          무료: 오답 5문제 + 기본 분석(OCR, LC/RC·파트 분류, 해설)만 제공
        </p>
        {subscribed ? (
          <p className="text-sm text-green-600 font-medium">유료 구독 중이에요</p>
        ) : (
          <p className="text-xs text-gray-500 mb-3">
            {savedCount >= freeLimit ? '무료 한도를 다 썼어요. 결제 후 계속 이용할 수 있어요.' : '오답 5개까지 무료로 저장할 수 있어요.'}
          </p>
        )}

        <div className="border-t border-gray-100 pt-3 mt-3 space-y-1 text-xs text-gray-600">
          <p className="font-medium text-gray-700">요금</p>
          <p>· 정규: 1개월 9,900원 / 2개월 16,900원 ⭐ / 5개월 39,900원</p>
          <p>· 얼리버드: 첫 달 4,900원 (선착순 100명), 이후 정상 요금</p>
        </div>
        {!subscribed && (
          <button className="w-full mt-3 bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors text-sm">
            얼리버드 첫 달 4,900원
          </button>
        )}
      </div>

      {/* 앱 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">앱 정보</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">버전</span>
            <span className="text-gray-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">문의</span>
            <a href="mailto:support@toeicodap.com" className="text-primary-600">
              support@toeicodap.com
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
