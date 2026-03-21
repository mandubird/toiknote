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
import ReviewStep1Modal from './review/ReviewStep1Modal'
import { useReviewTrigger } from '../hooks/useReviewTrigger'

const reviewStep1HideKey = (uid) => (uid ? `toeai_hide_review_step1_${uid}` : '')

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

  const [hideReviewStep1Session, setHideReviewStep1Session] = useState(false)
  const { shouldShowReview } = useReviewTrigger(user?.id)

  useEffect(() => {
    if (!user?.id) {
      setHideReviewStep1Session(false)
      return
    }
    try {
      setHideReviewStep1Session(sessionStorage.getItem(reviewStep1HideKey(user.id)) === '1')
    } catch {
      setHideReviewStep1Session(false)
    }
  }, [user?.id])

  const showReviewStep1Modal = Boolean(user && shouldShowReview && !hideReviewStep1Session)

  const dismissReviewStep1ForSession = useCallback(() => {
    if (!user?.id) return
    try {
      sessionStorage.setItem(reviewStep1HideKey(user.id), '1')
    } catch {
      /* ignore */
    }
    setHideReviewStep1Session(true)
  }, [user?.id])

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
        setAnalysisError(err?.message || '사진 분석에 실패했어요.')
        alert(err?.message || '사진 분석에 실패했어요. 다시 시도해 주세요.')
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
    { path: '/',         label: '코칭', icon: HomeIcon },
    { path: '/notes',    label: '노트', icon: NotesIcon },
    { path: '/stats',    label: '약점', icon: WeaknessIcon },
    { path: '/strategy', label: '전략', icon: StrategyIcon },
    { path: '/settings', label: '설정', icon: SettingsIcon },
  ]

  const showCameraButton =
    location.pathname === '/' ||
    location.pathname === '/notes' ||
    location.pathname.startsWith('/note/')

  // 비로그인 사용자 접근 제어 (홈 제외 — HomeOrLanding이 처리)
  if (!authLoading && !user && location.pathname !== '/') {
    return <Navigate to="/landing" replace />
  }

  return (
    <div className="flex flex-col h-screen bg-surface-50">
      {/* 상단 헤더 — 네이비 다크 */}
      <header className="bg-primary-900 safe-area-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-baseline gap-0.5">
              <span className="text-accent-400">토</span>
              <span className="text-white">답</span>
              <span className="text-xs font-medium text-primary-300 ml-1.5">
                — <span className="text-accent-400">토</span>익 성적 향상의 정<span className="text-accent-400">답</span>
              </span>
            </h1>
            <p className="text-[10px] text-primary-400 tracking-wide mt-0.5">
              약점 진단 · 점수 손실 분석 · 압축 전략
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/reviews')}
              className="text-xs font-medium text-primary-300 hover:text-white transition-colors"
            >
              후기
            </button>
            <button
              type="button"
              onClick={() => navigate('/landing')}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-accent-500 text-white hover:bg-accent-600 transition-colors"
            >
              900 점프
            </button>
          </div>
        </div>
      </header>

      {/* 무료 체험 배너 (미결제 사용자) */}
      {user && !isPaid && trialInfo && (
        trialInfo.trialExpired ? (
          <div className="px-4 py-2.5 bg-accent-500 text-white flex items-center justify-center gap-3">
            <span className="text-sm font-semibold">⏰ 무료 체험이 종료되었어요</span>
            <button
              type="button"
              onClick={() => navigate('/settings?pay=1')}
              className="px-3 py-1 rounded-full bg-white text-accent-600 text-xs font-black"
            >
              지금 시작하기
            </button>
          </div>
        ) : (
          <>
            <div className="h-1 bg-surface-100">
              <div
                className="h-full bg-accent-400 transition-all"
                style={{ width: `${Math.min((trialInfo.questionsUsed / freeLimit) * 100, 100)}%` }}
              />
            </div>
            <div className="px-4 py-1.5 bg-accent-50 text-center text-xs text-surface-600">
              무료 체험{' '}
              <strong className="text-surface-900">{trialInfo.questionsUsed}/{freeLimit}문제</strong>
              {trialInfo.daysLeft != null && (
                <> · <strong className="text-accent-600">{trialInfo.daysLeft}일</strong> 남음</>
              )}
            </div>
          </>
        )
      )}

      {/* 메인 콘텐츠 — 카메라 버튼 표시 화면에서는 추가 패딩 */}
      <main className={`flex-1 overflow-y-auto ${showCameraButton ? 'pb-40' : 'pb-20'}`}>
        <Outlet />
      </main>

      {/* 카메라 버튼 — 코칭/노트에서 표시 */}
      {showCameraButton && (
        <CameraButton
          user={user}
          onUploadComplete={handleUploadComplete}
          onLoginRequired={handleLoginRequired}
        />
      )}

      {/* AI 분석 중 오버레이 */}
      {analyzing && (
        <UploadProgressOverlay
          message="이미지를 분석했습니다. 문제 유형만 선택하면 저장됩니다."
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

      {/* 후기 1단계 자동 요청 (유료 + 트리거) */}
      <ReviewStep1Modal
        open={showReviewStep1Modal}
        userId={user?.id}
        onClose={dismissReviewStep1ForSession}
        onComplete={() => {
          /* 제출 완료 — 다음 방문부터 RPC가 비노출 */
        }}
      />

      {/* 결제 유도 모달 (5회 초과 시) */}
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        userId={user?.id}
        userEmail={user?.email}
        userDisplayName={user?.user_metadata?.full_name}
        userPhone={user?.user_metadata?.phone_number || user?.user_metadata?.phone || user?.phone}
        onPaymentSuccess={() => setShowPaywall(false)}
      />

      {/* 하단 탭바 — 활성 인디케이터 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-surface-200 safe-area-bottom">
        <div className="grid grid-cols-5 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const p = location.pathname
            const isActive =
              (tab.path === '/' && p === '/') ||
              (tab.path === '/notes' && (p === '/notes' || p.startsWith('/note/'))) ||
              (tab.path === '/stats' && p.startsWith('/stats')) ||
              (tab.path === '/strategy' &&
                (p.startsWith('/strategy') || p.startsWith('/program') || p.startsWith('/week') || p.startsWith('/report'))) ||
              (tab.path === '/settings' && p.startsWith('/settings'))

            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-primary-600' : 'text-surface-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 rounded-t-full" />
                )}
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

const NotesIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h8M8 10h8M8 14h5M6 4h12a2 2 0 012 2v14l-4-2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
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
