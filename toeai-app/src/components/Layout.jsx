import { useState, useCallback, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { recordReferral } from '../services/referralService'
import CameraButton from './CameraButton'
import UploadProgressOverlay from './UploadProgressOverlay'
import AnalysisConfirmModal from './AnalysisConfirmModal'
import { analyzeToeicImage } from '../services/analyzeImage'
import { saveWrongNoteWithStats } from '../services/saveWrongNoteWithStats'
import { fetchWrongAnswers } from '../services/fetchWrongAnswers'
import { getSubscription, getFreeLimit } from '../services/subscription'
import { useRefreshList } from '../contexts/RefreshListContext'
import PaywallModal from './PaywallModal'

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [confirmImageUrl, setConfirmImageUrl] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [saving, setSaving] = useState(false)
  const refreshList = useRefreshList()
  const freeLimit = getFreeLimit()

  const handleUploadComplete = useCallback(
    async (url) => {
      if (!user) return
      setAnalysisError(null)
      setAnalyzing(true)
      try {
        const data = await analyzeToeicImage(url)
        setAnalysisResult(data)
        setConfirmImageUrl(url)
        setShowConfirmModal(true)
      } catch (err) {
        setAnalysisError(err?.message || 'AI 분석에 실패했어요.')
        alert(err?.message || 'AI 분석에 실패했어요. 다시 시도해 주세요.')
      } finally {
        setAnalyzing(false)
      }
    },
    [user]
  )

  const handleConfirmSave = useCallback(
    async (data) => {
      if (!user) return
      setSaving(true)
      try {
        const [list, subscription] = await Promise.all([
          fetchWrongAnswers(user.id),
          getSubscription(user.id),
        ])
        if (list.length >= freeLimit && !subscription.paid) {
          setShowPaywall(true)
          setSaving(false)
          return
        }

        const result = await saveWrongNoteWithStats(user.id, data)
        if (result.success) {
          setShowConfirmModal(false)
          setAnalysisResult(null)
          setConfirmImageUrl(null)
          setAnalysisError(null)
          refreshList()
          alert('오답이 저장되었어요.')
        } else {
          alert(
            result.error +
              '\n\n오프라인이거나 서버 오류일 수 있어요. 내용은 이 기기에 임시 저장돼 있어요. 나중에 다시 시도해 주세요.'
          )
        }
      } catch (err) {
        alert('저장 중 오류가 났어요. 다시 시도해 주세요.')
      } finally {
        setSaving(false)
      }
    },
    [user, refreshList]
  )

  const handleLoginRequired = () => {
    navigate('/settings')
  }

  const refCode = new URLSearchParams(location.search).get('ref')
  useEffect(() => {
    if (!user?.id || !refCode) return
    const key = 'ref_done_' + user.id
    if (sessionStorage.getItem(key)) return
    recordReferral(refCode, user.id).then(() => sessionStorage.setItem(key, '1'))
  }, [user?.id, refCode])

  const tabs = [
    { path: '/', label: '홈', icon: HomeIcon },
    { path: '/dashboard', label: '대시보드', icon: DashboardIcon },
    { path: '/stats', label: '통계', icon: StatsIcon },
    { path: '/strategy', label: '전략', icon: StrategyIcon },
    { path: '/program', label: '8주', icon: ProgramIcon },
    { path: '/settings', label: '설정', icon: SettingsIcon }
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 safe-area-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary-600">토답</h1>
            <p className="text-xs text-gray-500">사진 한 장으로 끝내는 오답 정리</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/reviews')}
              className="text-sm font-medium text-gray-600 hover:underline"
            >
              후기
            </button>
            <button
              type="button"
              onClick={() => navigate('/landing')}
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              900 점프
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* 중앙 하단 카메라 버튼 */}
      <CameraButton
        user={user}
        onUploadComplete={handleUploadComplete}
        onLoginRequired={handleLoginRequired}
      />

      {/* AI 분석 중 오버레이 */}
      {analyzing && (
        <UploadProgressOverlay
          message="AI가 문제 유형을 분석하고 있어요…"
          hideProgress
        />
      )}

      {/* 2단계 확인 모달 */}
      <AnalysisConfirmModal
        open={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false)
          setAnalysisResult(null)
          setConfirmImageUrl(null)
        }}
        initialData={analysisResult}
        imageUrl={confirmImageUrl}
        onSave={handleConfirmSave}
        saving={saving}
      />

      {/* 결제 유도 모달 (5회 초과 시) */}
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        userId={user?.id}
        userEmail={user?.email}
        userDisplayName={user?.displayName}
        onPaymentSuccess={() => setShowPaywall(false)}
      />

      {/* 하단 탭바 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="grid grid-cols-6 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = location.pathname === tab.path || (tab.path === '/dashboard' && (location.pathname.startsWith('/week') || location.pathname.startsWith('/report')))
            
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  isActive ? 'text-primary-600' : 'text-gray-400'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

// 아이콘 컴포넌트들
const HomeIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const DashboardIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const StatsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const StrategyIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const ProgramIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const SettingsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

export default Layout
