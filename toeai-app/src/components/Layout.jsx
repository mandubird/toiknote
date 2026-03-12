import { useState, useCallback, useEffect } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { recordReferral } from '../services/referralService'
import CameraButton from './CameraButton'
import UploadProgressOverlay from './UploadProgressOverlay'
import AnalysisConfirmModal from './AnalysisConfirmModal'
import { analyzeToeicImage } from '../services/analyzeImage'
import { saveWrongNoteWithStats } from '../services/saveWrongNoteWithStats'
import { getSubscription, getFreeLimit, getTrialStatus } from '../services/subscription'
import { useRefreshList } from '../contexts/RefreshListContext'
import PaywallModal from './PaywallModal'
import OnboardingModal from './OnboardingModal'

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisQueue, setAnalysisQueue] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [confirmImageUrl, setConfirmImageUrl] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [saving, setSaving] = useState(false)
  const refreshList = useRefreshList()
  const freeLimit = getFreeLimit()

  // 무료 체험 상태
  const [trialInfo, setTrialInfo] = useState(null)
  const [isPaid, setIsPaid] = useState(false)

  // 무료 체험 상태 + 구독 조회
  const refreshTrialInfo = useCallback(async () => {
    if (!user) return
    const [sub, trial] = await Promise.all([
      getSubscription(user.id),
      getTrialStatus(user.id),
    ])
    setIsPaid(sub.paid)
    if (!sub.paid) setTrialInfo(trial)
    else setTrialInfo(null)
  }, [user])

  useEffect(() => {
    refreshTrialInfo()
  }, [refreshTrialInfo])

  const handleUploadComplete = useCallback(
    async (url) => {
      if (!user) return
      setAnalysisError(null)
      setAnalyzing(true)
      try {
        const { questions } = await analyzeToeicImage(url)
        if (!questions || !questions.length) {
          throw new Error('이미지에서 토익 문제를 찾지 못했어요.')
        }
        setAnalysisQueue(questions)
        setCurrentQuestionIndex(0)
        setAnalysisResult(questions[0])
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
        const [subscription, trial] = await Promise.all([
          getSubscription(user.id),
          getTrialStatus(user.id),
        ])
        // 미결제 + (문제 5개 초과 OR 7일 만료) → paywall
        if (!subscription.paid && trial.trialExpired) {
          setShowPaywall(true)
          setSaving(false)
          return
        }

        const result = await saveWrongNoteWithStats(user.id, data)
        if (result.success) {
          const nextIndex = currentQuestionIndex + 1
          const hasNext = nextIndex < analysisQueue.length

          if (hasNext) {
            setCurrentQuestionIndex(nextIndex)
            setAnalysisResult(analysisQueue[nextIndex])
            setAnalysisError(null)
            refreshList()
            refreshTrialInfo()
            alert('오답이 저장되었어요. 다음 문제도 이어서 저장할게요.')
          } else {
            setShowConfirmModal(false)
            setAnalysisResult(null)
            setConfirmImageUrl(null)
            setAnalysisError(null)
            setAnalysisQueue([])
            setCurrentQuestionIndex(0)
            refreshList()
            refreshTrialInfo()
            alert('오답이 저장되었어요.')
          }
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
    [user, refreshList, refreshTrialInfo, analysisQueue, currentQuestionIndex, freeLimit]
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
    { path: '/',          label: '홈',     icon: HomeIcon      },
    { path: '/dashboard', label: '대시보드', icon: DashboardIcon },
    { path: '/stats',     label: '약점',   icon: WeaknessIcon  },
    { path: '/strategy',  label: '전략',   icon: StrategyIcon  },
    { path: '/settings',  label: '설정',   icon: SettingsIcon  },
  ]

  const isHome = location.pathname === '/'

  // 비로그인 사용자 접근 제어 (홈 제외 — HomeOrLanding이 처리)
  if (!authLoading && !user && location.pathname !== '/') {
    return <Navigate to="/landing" replace />
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 safe-area-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-baseline gap-1.5">
              <span className="text-primary-600">토답</span>
              <span className="text-sm font-medium text-gray-500">
                — <span className="text-primary-600 font-bold">토</span>익 성적 향상의 정<span className="text-primary-600 font-bold">답</span>
              </span>
            </h1>
            <p className="text-xs text-gray-400">약점 진단 · 점수 손실 분석 · 압축 전략</p>
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

      {/* 무료 체험 상태 배너 (미결제 사용자) */}
      {user && !isPaid && trialInfo && (
        <div className={`px-4 py-2.5 text-center text-sm ${
          trialInfo.trialExpired
            ? 'bg-red-50 border-b border-red-200 text-red-700'
            : 'bg-amber-50 border-b border-amber-200 text-amber-800'
        }`}>
          {trialInfo.trialExpired ? (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span>무료 체험이 종료되었습니다</span>
              <button
                type="button"
                onClick={() => navigate('/upgrade')}
                className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
              >
                유료 플랜 보기
              </button>
            </div>
          ) : (
            <span>
              무료 체험 <strong>{trialInfo.questionsUsed}/{freeLimit}문제</strong> 사용
              {trialInfo.trialStartedAt && (
                <> · 체험 종료까지 <strong>{trialInfo.daysLeft}일</strong> 남음</>
              )}
            </span>
          )}
        </div>
      )}

      {/* 메인 콘텐츠 — 홈에서는 카메라 버튼 높이만큼 추가 패딩 */}
      <main className={`flex-1 overflow-y-auto ${isHome ? 'pb-40' : 'pb-20'}`}>
        <Outlet />
      </main>

      {/* 카메라 버튼 — 홈 탭에서만 표시 */}
      {isHome && (
        <CameraButton
          user={user}
          onUploadComplete={handleUploadComplete}
          onLoginRequired={handleLoginRequired}
        />
      )}

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
          setAnalysisQueue([])
          setCurrentQuestionIndex(0)
        }}
        initialData={analysisResult}
        multiTotal={analysisQueue.length || 1}
        multiIndex={currentQuestionIndex}
        imageUrl={confirmImageUrl}
        onSave={handleConfirmSave}
        saving={saving}
      />

      {/* 첫 방문 온보딩 */}
      <OnboardingModal />

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
        <div className="grid grid-cols-5 h-16">
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
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)

// 약점 탭 아이콘 — 타겟(과녁) 형태
const WeaknessIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <circle cx="12" cy="12" r="9" strokeWidth={2} />
    <circle cx="12" cy="12" r="5" strokeWidth={2} />
    <circle cx="12" cy="12" r="1" strokeWidth={2} />
  </svg>
)

const StrategyIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)


const SettingsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

export default Layout
