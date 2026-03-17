import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchWrongAnswers } from '../services/fetchWrongAnswers'
import { getSubscription, getFreeLimit, PLAN_LABELS } from '../services/subscription'
import { getUserProfile, updateUserProfile } from '../services/userProfile'
import { PLANS } from '../services/portonePayment'
import { siteBusinessInfo } from '../config/siteBusinessInfo'
import { updateExamDate } from '../services/programService'
import { supabase } from '../lib/supabase'
import PaymentSheet from '../components/PaymentSheet'

const POLICY_LINKS = [
  { label: '이용약관',         path: '/terms'          },
  { label: '개인정보처리방침', path: '/privacy'        },
  { label: '환불 규정',        path: '/refund-policy'  },
  { label: '고객문의',         path: '/contact'        },
]

// 플랜 카드 정의 (30일이 메인)
const PLAN_CARDS = [
  {
    key:    'd15',
    badge:  '시험 임박자용',
    title:  '15일 초압축',
    desc:   '시험일까지 시간이 많지 않은 수험생을 위한 단기 압축 플랜',
    main:   false,
  },
  {
    key:    'd30',
    badge:  '가장 많이 선택',
    title:  '30일 집중',
    desc:   '약점 진단부터 집중 교정까지 가장 균형 있게 사용할 수 있는 추천 플랜',
    main:   true,
  },
  {
    key:    'd60',
    badge:  '장기 준비용',
    title:  '60일 안정',
    desc:   '시간 여유가 있는 수험생을 위한 안정형 플랜',
    main:   false,
  },
]

const PLAN_BENEFITS = [
  'AI 약점 진단',
  '무제한 오답 분석',
  'D-day 압축 전략',
  'AI 코치 멘트',
  '약점 우선순위 로드맵',
]

const SettingsPage = () => {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [authError, setAuthError]       = useState(null)
  const [savedCount, setSavedCount]     = useState(0)
  const [subscribed, setSubscribed]     = useState(false)
  const [plan, setPlan]                 = useState('free')
  const [daysLeft, setDaysLeft]         = useState(null)
  const [currentScore, setCurrentScore] = useState('')
  const [targetScore, setTargetScore]   = useState('900')
  const [lcScore, setLcScore]           = useState('')
  const [rcScore, setRcScore]           = useState('')
  const [examDate, setExamDate]         = useState('')
  const [examSaving, setExamSaving]     = useState(false)
  const [scoreSaving, setScoreSaving]   = useState(false)
  const [sheetOpen, setSheetOpen]       = useState(false)
  const freeLimit = getFreeLimit()

  // ?pay=1 파라미터로 진입 시 자동으로 결제 시트 열기
  useEffect(() => {
    if (searchParams.get('pay') === '1') setSheetOpen(true)
  }, [searchParams])

  useEffect(() => {
    if (!user) {
      setSavedCount(0)
      setSubscribed(false)
      setCurrentScore('')
      setTargetScore('900')
      setLcScore('')
      setRcScore('')
      setExamDate('')
      return
    }
    Promise.all([
      fetchWrongAnswers(user.id),
      getSubscription(user.id),
      getUserProfile(user.id),
      supabase.from('users').select('exam_date').eq('id', user.id).maybeSingle(),
    ]).then(([list, sub, profile, { data: userRow }]) => {
      setSavedCount(list.length)
      setSubscribed(sub.paid)
      setPlan(sub.plan || 'free')
      setDaysLeft(sub.daysLeft)
      setCurrentScore(profile.currentScore ? String(profile.currentScore) : '')
      setTargetScore(profile.targetScore  ? String(profile.targetScore)  : '900')
      setLcScore(profile.lcScore != null ? String(profile.lcScore) : '')
      setRcScore(profile.rcScore != null ? String(profile.rcScore) : '')
      setExamDate(userRow?.exam_date ?? '')
    })
  }, [user])

  const handleSaveScores = async () => {
    if (!user) return
    const curRaw = currentScore.trim() === '' ? null : parseInt(currentScore, 10)
    const tgt    = parseInt(targetScore, 10)
    const lcRaw  = lcScore.trim() === ''  ? null : parseInt(lcScore, 10)
    const rcRaw  = rcScore.trim() === ''  ? null : parseInt(rcScore, 10)

    if (curRaw !== null && (Number.isNaN(curRaw) || curRaw < 200 || curRaw > 990)) {
      alert('현재 점수는 200~990 사이로 입력해 주세요.')
      return
    }
    if (Number.isNaN(tgt) || tgt < 200 || tgt > 990) {
      alert('목표 점수는 200~990 사이로 입력해 주세요.')
      return
    }
    if (lcRaw !== null && (Number.isNaN(lcRaw) || lcRaw < 5 || lcRaw > 495)) {
      alert('LC 점수는 5~495 사이로 입력해 주세요.')
      return
    }
    if (rcRaw !== null && (Number.isNaN(rcRaw) || rcRaw < 5 || rcRaw > 495)) {
      alert('RC 점수는 5~495 사이로 입력해 주세요.')
      return
    }

    setScoreSaving(true)
    try {
      await updateUserProfile(user.id, {
        currentScore: curRaw ?? 0,
        targetScore:  tgt,
        lcScore:      lcRaw,
        rcScore:      rcRaw,
      })
      alert('저장되었어요.')
    } catch (err) {
      console.error('[SettingsPage] updateUserProfile error:', err)
      alert(`저장에 실패했어요.\n${err?.message || JSON.stringify(err)}`)
    } finally {
      setScoreSaving(false)
    }
  }

  const handlePaymentSuccess = (planKey) => {
    setSubscribed(true)
    setPlan(planKey)
    setDaysLeft(PLANS[planKey]?.days ?? null)
  }

  const handleSaveExamDate = async () => {
    if (!user || !examDate) return
    setExamSaving(true)
    try {
      await updateExamDate(user.id, examDate)
      alert('시험일이 저장되었어요.')
    } catch (err) {
      console.error('[SettingsPage] updateExamDate error:', err)
      alert(`저장에 실패했어요.\n${err?.message || JSON.stringify(err)}`)
    } finally {
      setExamSaving(false)
    }
  }

  const handleGoogleLogin = async () => {
    setAuthError(null)
    try { await signInWithGoogle() }
    catch (err) { setAuthError(err?.message || '로그인에 실패했어요.') }
  }

  const handleSignOut = async () => {
    setAuthError(null)
    await signOut()
  }

  return (
    <>
    <PaymentSheet
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      user={user}
      onSuccess={handlePaymentSuccess}
    />
    <div className="p-4 pb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">설정</h2>
      </div>

      {/* ── 계정 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">계정</h3>
        {loading ? (
          <div className="py-4 text-center text-gray-500 text-sm">불러오는 중…</div>
        ) : user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-semibold text-lg">
                  {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{user.displayName || '사용자'}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            <button type="button" onClick={handleSignOut} className="text-sm text-red-500 hover:text-red-600">
              로그아웃
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-4">로그인이 필요합니다</p>
            {authError && <p className="text-sm text-red-600 mb-3">{authError}</p>}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg hover:bg-primary-700"
            >
              구글로 로그인
            </button>
          </div>
        )}
      </div>

      {/* ── 점수 입력 ── */}
      {user && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">점수 정보</h3>
          <p className="text-xs text-gray-500 mb-3">AI 약점 분석과 전략 제안에 사용해요</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">현재 총점</label>
              <input
                type="number" min={200} max={990} value={currentScore}
                onChange={(e) => setCurrentScore(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">목표 점수</label>
              <input
                type="number" min={200} max={990} value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">LC 점수 <span className="text-gray-400">(선택)</span></label>
              <input
                type="number" min={5} max={495} value={lcScore}
                onChange={(e) => setLcScore(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="350"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RC 점수 <span className="text-gray-400">(선택)</span></label>
              <input
                type="number" min={5} max={495} value={rcScore}
                onChange={(e) => setRcScore(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="350"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">LC·RC 점수를 입력하면 파트별 손실 원인을 더 정확하게 분석해요</p>
          <button
            type="button"
            onClick={handleSaveScores}
            disabled={scoreSaving}
            className="w-full py-2 px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {scoreSaving ? '저장 중…' : '저장'}
          </button>
        </div>
      )}

      {/* ── 시험일 ── */}
      {user && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">시험일</h3>
          <p className="text-xs text-gray-500 mb-3">입력하면 D-day 압축 전략 모드가 자동으로 계산돼요</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={examDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setExamDate(e.target.value)}
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleSaveExamDate}
              disabled={examSaving || !examDate}
              className="shrink-0 py-2 px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {examSaving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* ── 구독 현황 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">구독 현황</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-700">현재 플랜</span>
          <span className="text-sm font-semibold text-primary-600">{PLAN_LABELS[plan] ?? 'FREE'}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-700">오답 저장</span>
          <span className="text-sm text-gray-900">
            {subscribed ? `무제한 (${savedCount}개 저장됨)` : `${freeLimit}개 중 ${savedCount}개 사용`}
          </span>
        </div>
        {subscribed && daysLeft != null && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">남은 기간</span>
            <span className={`text-sm font-medium ${daysLeft <= 7 ? 'text-red-500' : 'text-gray-900'}`}>
              {daysLeft}일 남음
            </span>
          </div>
        )}
        <p className="text-xs text-gray-500">
          {subscribed
            ? `${PLAN_LABELS[plan]} 이용 중 — 무제한 오답 분석 + AI 전략 코치 활성`
            : 'FREE: 오답 5문제 체험. 유료 플랜: 무제한 분석 + D-day 압축 전략 + AI 코치'}
        </p>
      </div>

      {/* ── 요금제 (미구독 시) ── */}
      {!subscribed && (
        <div id="payment-section" className="mb-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-1">요금제</h3>
          <p className="text-xs text-gray-500 mb-3">15일 · 30일 · 60일 플랜 중 선택하세요</p>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full py-3 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition"
          >
            플랜 선택하기
          </button>
        </div>
      )}

      {/* ── 정책 링크 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">서비스 정책</h3>
        <div className="divide-y divide-gray-100">
          {POLICY_LINKS.map(({ label, path }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="w-full flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-primary-600 transition-colors"
            >
              <span>{label}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* ── 사업자 정보 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">사업자 정보</h3>
        <div className="space-y-1.5 text-sm">
          {[
            { label: '상호',               value: siteBusinessInfo.businessName      },
            { label: '대표자',             value: siteBusinessInfo.ceoName           },
            { label: '사업자등록번호',      value: siteBusinessInfo.businessRegNo     },
            { label: '통신판매업 신고번호', value: siteBusinessInfo.ecommerceLicenseNo },
            { label: '이메일',             value: siteBusinessInfo.supportEmail      },
            { label: '전화',               value: siteBusinessInfo.supportPhone      },
            { label: '주소',               value: siteBusinessInfo.businessAddress   },
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-2">
              <span className="text-gray-500 w-32 flex-shrink-0">{label}</span>
              <span className="text-gray-800 break-all">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 앱 정보 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">앱 정보</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">버전</span>
            <span className="text-gray-900">v4.34</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">문의</span>
            <a href={`mailto:${siteBusinessInfo.supportEmail}`} className="text-primary-600">
              {siteBusinessInfo.supportEmail}
            </a>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default SettingsPage
