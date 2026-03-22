import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useListVersion } from '../contexts/RefreshListContext'
import { getDashboardSummary } from '../services/programService'
import { getSubscription } from '../services/subscription'
import { fetchWrongAnswers } from '../services/fetchWrongAnswers'
import { getMasteryBoard } from '../services/masteryService'
import { supabase } from '../lib/supabase'
import {
  fetchMyProofReview,
  getPublicProofReviewCount,
  fetchPublicProofReviews,
} from '../services/proofReviewService'
import { getOnboardingCoaching } from '../services/getOnboardingCoaching'
import OnboardingDiagnosis from '../components/OnboardingDiagnosis'
import OnboardingResult from '../components/OnboardingResult'
import ReviewStep2Modal from '../components/review/ReviewStep2Modal'
import ProofReviewCard from '../components/review/ProofReviewCard'

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function buildTodayActions({ top3, weeklyMission }) {
  const pickName = (x) => {
    if (!x) return null
    if (typeof x === 'string') return x
    return x.tag || x.category || null
  }
  const t1 = pickName(top3?.[0])
  const t2 = pickName(top3?.[1])

  const actions = []
  actions.push('Part 5 하루 10문제 — 시간 제한 없이 정확도부터')

  if (t1) actions.push(`${t1} 유형 15문제 집중 풀이`)
  else if (weeklyMission) actions.push(`이번 주 포커스: ${weeklyMission}`)
  else actions.push('가장 자주 틀리는 유형 1개를 골라 15문제 반복')

  const part7Hint = [t1, t2].some(
    (t) =>
      typeof t === 'string' &&
      (t.includes('Part7') || t.includes('Part 7') || t.includes('추론') ||
        t.includes('복수') || t.includes('지문') || t.includes('시간')),
  )
  actions.push(
    part7Hint
      ? 'Part 7 2지문 시간 제한 풀이 (단일 90초 / 복수 150초)'
      : '오답 5문제 복습 후 "왜 틀렸는지" 한 줄로 요약',
  )

  return actions.slice(0, 3)
}

function formatDday(examDate) {
  if (!examDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(examDate)
  exam.setHours(0, 0, 0, 0)
  const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24))
  return Number.isFinite(diff) ? diff : null
}

function buildResultPayload(inputs, coaching) {
  return {
    diagnosis_basis: {
      current_score: inputs.current_score,
      target_score: inputs.target_score,
      hardest_part: inputs.weak_part,
    },
    weakness_top3: coaching.weaknessTop3,
    today_tasks: coaching.today3,
    skip_task: coaching.discard1,
    summary_text: `현재 ${inputs.current_score}점 기준, ${inputs.weak_part} 집중 개선이 우선입니다.`,
    version: 1,
  }
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function CoachingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const listVersion = useListVersion()

  // ── 공통 상태
  const [dashboard, setDashboard] = useState(null)
  const [sub, setSub] = useState({ paid: false })
  const [wrongCount, setWrongCount] = useState(0)
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading] = useState(true)

  // ── 소셜 증거
  const [myProofReview, setMyProofReview] = useState(null)
  const [showReviewStep2, setShowReviewStep2] = useState(false)
  const [socialProofList, setSocialProofList] = useState([])
  const [socialProofCount, setSocialProofCount] = useState(0)

  // ── v2 코칭 상태머신
  // coachingMode: null(로딩중) | 'none' | 'quick' | 'quick_progress' | 'full'
  const [coachingMode, setCoachingMode] = useState(null)
  const [latestQuickDiagnosis, setLatestQuickDiagnosis] = useState(null)
  const [onboardingInputs, setOnboardingInputs] = useState(null)
  const [onboardingExampleMode, setOnboardingExampleMode] = useState(false)
  const [showDiagnosisForm, setShowDiagnosisForm] = useState(false) // "다시 진단하기"

  // ─── DB 함수 ─────────────────────────────────────────────────────────────

  const loadLatestQuickDiagnosis = async (userId) => {
    try {
      const { data } = await supabase
        .from('quick_diagnosis_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data || null
    } catch {
      return null
    }
  }

  const saveQuickDiagnosis = async (userId, inputs, coaching) => {
    try {
      const result_payload = buildResultPayload(inputs, coaching)
      await supabase.from('quick_diagnosis_results').insert({
        user_id: userId,
        current_score: inputs.current_score,
        target_score: inputs.target_score,
        hardest_part: inputs.weak_part,
        result_payload,
      })
    } catch (e) {
      console.warn('[quickDiagnosis] DB 저장 실패:', e)
    }
  }

  const saveOnboardingInputsToDB = async (userId, inputs) => {
    try {
      const examDate = new Date()
      examDate.setDate(examDate.getDate() + inputs.days_left)
      const examDateStr = examDate.toISOString().split('T')[0]
      await supabase.from('users').upsert(
        {
          id: userId,
          current_score: inputs.current_score,
          target_score: inputs.target_score,
          exam_date: examDateStr,
          onboarding_weak_part: inputs.weak_part,
        },
        { onConflict: 'id' },
      )
    } catch (e) {
      console.warn('[onboarding] users 테이블 저장 실패:', e)
    }
  }

  const loadExamDaysLeft = async (userId) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('exam_date')
        .eq('id', userId)
        .maybeSingle()
      if (!data?.exam_date) return 30
      const diff = Math.ceil((new Date(data.exam_date) - new Date()) / (1000 * 60 * 60 * 24))
      return diff > 0 ? diff : 7
    } catch {
      return 30
    }
  }

  // localStorage 폴백
  const ONBOARDING_INPUTS_KEY = 'todap_onboarding_inputs'
  const loadOnboardingInputsFromStorage = () => {
    try {
      const raw = localStorage.getItem(ONBOARDING_INPUTS_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return null
      if (!['LC', 'RC', 'Part5', 'Part7'].includes(parsed.weak_part)) return null
      return parsed
    } catch {
      return null
    }
  }

  // onSubmit 핸들러 공통 로직
  const handleDiagnosisSubmit = async (inputs) => {
    const coaching = getOnboardingCoaching(inputs)
    const result_payload = buildResultPayload(inputs, coaching)
    // 낙관적 업데이트 — DB 응답 대기 없이 즉시 결과 표시
    const optimisticQuick = {
      current_score: inputs.current_score,
      target_score: inputs.target_score,
      hardest_part: inputs.weak_part,
      result_payload,
    }
    setOnboardingInputs(inputs)
    setOnboardingExampleMode(false)
    setLatestQuickDiagnosis(optimisticQuick)
    setShowDiagnosisForm(false)
    setCoachingMode(wrongCount >= 1 ? 'quick_progress' : 'quick')
    // DB 저장 (백그라운드)
    if (user?.id) {
      saveOnboardingInputsToDB(user.id, inputs)
      saveQuickDiagnosis(user.id, inputs, coaching)
    }
  }

  // ─── 메인 useEffect ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) {
      setDashboard(null)
      setSub({ paid: false })
      setWrongCount(0)
      setChecklist([])
      setMyProofReview(null)
      setCoachingMode(null)
      setLatestQuickDiagnosis(null)
      setOnboardingInputs(null)
      setOnboardingExampleMode(false)
      setShowDiagnosisForm(false)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setShowDiagnosisForm(false) // 탭 재진입 시 form 강제 노출 해제

    supabase.from('coaching_logs').insert({ user_id: user.id }).then(() => {}).catch(() => {})

    ;(async () => {
      try {
        const [wcList, s] = await Promise.all([
          fetchWrongAnswers(user.id).catch(() => []),
          getSubscription(user.id).catch(() => ({ paid: false })),
        ])

        const wc = wcList?.length ?? 0
        setSub(s)
        setWrongCount(wc)

        if (wc >= 3) {
          // ── 상태 D: full coaching ───────────────────────────────────────
          const [d, board] = await Promise.all([
            getDashboardSummary(user.id).catch(() => null),
            getMasteryBoard(user.id).catch(() => []),
          ])
          if (cancelled) return

          setDashboard(d)
          setChecklist(Array.isArray(board) ? board : [])
          setCoachingMode('full')
          setLatestQuickDiagnosis(null)
          setOnboardingInputs(null)
          setOnboardingExampleMode(false)

          // 활성화 조건 체크
          if (wc > 0 && (d?.weakness_top3?.length ?? 0) > 0) {
            await supabase
              .from('users')
              .update({ activated_at: new Date().toISOString() })
              .eq('id', user.id)
              .is('activated_at', null)
              .catch(() => {})
          }
        } else {
          // ── 상태 A/B/C: quick 계열 ─────────────────────────────────────
          setDashboard(null)
          setChecklist([])

          // 1순위: quick_diagnosis_results
          const latestQuick = await loadLatestQuickDiagnosis(user.id)
          if (cancelled) return

          if (latestQuick) {
            const daysLeft = await loadExamDaysLeft(user.id)
            if (cancelled) return
            setLatestQuickDiagnosis(latestQuick)
            setOnboardingInputs({
              current_score: latestQuick.current_score,
              target_score: latestQuick.target_score,
              weak_part: latestQuick.hardest_part,
              days_left: daysLeft,
            })
            setOnboardingExampleMode(false)
            setCoachingMode(wc >= 1 ? 'quick_progress' : 'quick')
          } else {
            // 2순위: users 테이블 폴백 (기존 사용자)
            const fallbackInputs = await (async () => {
              try {
                const { data } = await supabase
                  .from('users')
                  .select('current_score, target_score, exam_date, onboarding_weak_part')
                  .eq('id', user.id)
                  .maybeSingle()
                if (data?.current_score && data?.target_score && data?.onboarding_weak_part) {
                  const diff = data.exam_date
                    ? Math.ceil(
                        (new Date(data.exam_date) - new Date()) / (1000 * 60 * 60 * 24),
                      )
                    : 30
                  return {
                    current_score: data.current_score,
                    target_score: data.target_score,
                    weak_part: data.onboarding_weak_part,
                    days_left: diff > 0 ? diff : 7,
                  }
                }
                return null
              } catch {
                return null
              }
            })() || loadOnboardingInputsFromStorage()

            if (cancelled) return

            if (fallbackInputs) {
              // users 테이블 데이터 → quick_diagnosis_results로 마이그레이션 (백그라운드)
              const coaching = getOnboardingCoaching(fallbackInputs)
              const result_payload = buildResultPayload(fallbackInputs, coaching)
              setLatestQuickDiagnosis({
                current_score: fallbackInputs.current_score,
                target_score: fallbackInputs.target_score,
                hardest_part: fallbackInputs.weak_part,
                result_payload,
              })
              setOnboardingInputs(fallbackInputs)
              setOnboardingExampleMode(false)
              setCoachingMode(wc >= 1 ? 'quick_progress' : 'quick')
              // 백그라운드 저장
              saveQuickDiagnosis(user.id, fallbackInputs, coaching)
            } else {
              // 상태 A: 최초 진입
              setLatestQuickDiagnosis(null)
              setOnboardingInputs(null)
              setOnboardingExampleMode(false)
              setCoachingMode('none')
            }
          }
        }
      } catch (e) {
        console.error('[CoachingPage] error:', e)
        if (!cancelled) setCoachingMode('none')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, listVersion])

  // ── 소셜 증거 effect
  useEffect(() => {
    if (!user?.id || coachingMode !== 'full') {
      setMyProofReview(null)
      return
    }
    fetchMyProofReview(user.id).then(setMyProofReview)
  }, [user?.id, coachingMode])

  useEffect(() => {
    if (!user || coachingMode !== 'full') return
    getPublicProofReviewCount().then((n) => {
      setSocialProofCount(n)
      if (n >= 3) {
        fetchPublicProofReviews(8, { reviewStage2Only: true }).then(setSocialProofList)
      } else {
        setSocialProofList([])
      }
    })
  }, [user?.id, coachingMode])

  // ─── 파생 데이터 ──────────────────────────────────────────────────────────

  const dday = useMemo(() => formatDday(dashboard?.examDate), [dashboard?.examDate])
  const top3 = useMemo(() => dashboard?.weakness_top3 || [], [dashboard?.weakness_top3])
  const weeklyMission = dashboard?.weekly_mission || null
  const actions = useMemo(() => {
    if (checklist?.length >= 3) {
      return checklist.slice(0, 3).map((i) => i?.name).filter(Boolean)
    }
    return buildTodayActions({ top3, weeklyMission })
  }, [checklist, top3, weeklyMission])

  // quick result에서 사용할 coaching 데이터
  const quickCoaching = useMemo(() => {
    if (latestQuickDiagnosis?.result_payload) {
      const p = latestQuickDiagnosis.result_payload
      return {
        weaknessTop3: p.weakness_top3 || [],
        today3: p.today_tasks || [],
        discard1: p.skip_task || '',
      }
    }
    return getOnboardingCoaching(onboardingInputs)
  }, [latestQuickDiagnosis, onboardingInputs])

  // ─── 렌더링 ───────────────────────────────────────────────────────────────

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
        <p className="text-gray-700">로그인하면 코칭 화면을 볼 수 있어요.</p>
        <button
          type="button"
          onClick={() => navigate('/landing')}
          className="mt-3 text-primary-600 font-medium"
        >
          랜딩으로 이동
        </button>
      </div>
    )
  }

  // ── 진단 폼 (상태 A + "다시 진단하기") ────────────────────────────────────
  if (coachingMode === 'none' || showDiagnosisForm) {
    return (
      <div className="p-4 pb-8">
        {showDiagnosisForm && (
          <button
            type="button"
            onClick={() => setShowDiagnosisForm(false)}
            className="mb-4 text-xs text-surface-500 flex items-center gap-1"
          >
            ← 결과로 돌아가기
          </button>
        )}
        <OnboardingDiagnosis
          onSubmit={handleDiagnosisSubmit}
          onExample={(exampleInputs) => {
            setOnboardingInputs(exampleInputs)
            setOnboardingExampleMode(true)
            setLatestQuickDiagnosis(null)
            setShowDiagnosisForm(false)
            setCoachingMode('quick')
          }}
          disabled={false}
        />
      </div>
    )
  }

  // ── 상태 B/C: quick / quick_progress ──────────────────────────────────────
  if (coachingMode === 'quick' || coachingMode === 'quick_progress') {
    const basisText =
      onboardingInputs && !onboardingExampleMode
        ? `현재 ${onboardingInputs.current_score}점 / 목표 ${onboardingInputs.target_score}점 / 시험 ${onboardingInputs.days_left}일 기준 결과입니다`
        : null

    return (
      <div className="p-4 pb-8 space-y-3">
        {/* 기준 문구 + 다시 진단하기 */}
        {basisText && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-surface-500">{basisText}</p>
            <button
              type="button"
              onClick={() => setShowDiagnosisForm(true)}
              className="text-xs text-primary-600 font-medium underline shrink-0 ml-2"
            >
              다시 진단하기
            </button>
          </div>
        )}

        {/* quick_progress 진행 배너 */}
        {coachingMode === 'quick_progress' && (
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-3">
            <p className="text-sm font-bold text-primary-800">
              정밀 코칭까지 {3 - wrongCount}문제 남았어요
            </p>
            <div className="flex items-center gap-2 mt-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full ${
                    i < wrongCount ? 'bg-primary-500' : 'bg-primary-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-primary-600 mt-1">
              현재 {wrongCount}/3 등록됨 — 오답을 3개 등록하면 메인 코칭이 개인화돼요
            </p>
          </div>
        )}

        <OnboardingResult
          coaching={quickCoaching}
          exampleMode={onboardingExampleMode}
          onRegisterWrong3={() => navigate('/notes')}
          onGoPayment={() => navigate('/settings?pay=1')}
          onDirectDiagnose={() => setShowDiagnosisForm(true)}
        />
      </div>
    )
  }

  // ── 상태 D: full coaching ──────────────────────────────────────────────────
  return (
    <div className="p-4 pb-8 space-y-4">
      {/* 헤드라인 */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">오늘의 코칭</h1>
        <p className="text-sm text-surface-500 mt-1">
          지금 상태 → 오늘 할 일 → 약점 우선순위
        </p>
      </div>

      {/* Hero Score 카드 */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-900 to-primary-700 p-5 text-white shadow-lg">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs text-primary-300 font-medium mb-1">현재 예상 점수</p>
            <p className="text-4xl font-black text-white leading-none">
              {dashboard?.predicted_score != null ? dashboard.predicted_score : '—'}
              <span className="text-lg font-medium text-primary-300 ml-1">점</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-primary-300 mb-1">목표</p>
            <p className="text-2xl font-bold text-accent-400">
              {dashboard?.target_score != null ? `${dashboard.target_score}점` : '900점'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-primary-300">
          <span>오답 {wrongCount}개</span>
          {dday != null && dday >= 0 && (
            <>
              <span>·</span>
              <span className="text-accent-400 font-bold">D-{dday}</span>
            </>
          )}
          {dashboard?.predicted_score != null && dashboard?.target_score != null && (
            <span className="ml-auto text-score-500 font-bold text-sm">
              +{dashboard.target_score - dashboard.predicted_score}점 필요
            </span>
          )}
        </div>
        {dday == null && (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="mt-3 text-xs font-medium text-primary-300 underline hover:text-white"
          >
            시험일 입력하면 D-day 압축 전략이 계산돼요 →
          </button>
        )}
      </div>

      {/* 2단계 후기 유도 */}
      {myProofReview?.review_stage === 1 && (
        <div className="rounded-2xl border-2 border-accent-300 bg-accent-50 p-4">
          <p className="text-sm font-bold text-surface-900 mb-1">한 번 더 후기를 남겨 주세요</p>
          <p className="text-xs text-surface-600 mb-3">
            공개 후기를 작성하고 동의하면 이용 기간 <strong>+5일</strong>이 더 연장돼요.
          </p>
          <button
            type="button"
            onClick={() => setShowReviewStep2(true)}
            className="w-full py-3 rounded-xl bg-accent-500 text-white text-sm font-black"
          >
            공개 후기 작성하기 (+5일)
          </button>
        </div>
      )}

      {/* 사회적 증거 배너 */}
      {socialProofCount >= 3 && socialProofList.length > 0 && (
        <div className="rounded-2xl border border-surface-200 bg-white p-4 overflow-hidden">
          <p className="text-xs font-black text-surface-500 uppercase tracking-wide mb-2">
            함께 쓰는 사람들의 변화
          </p>
          <div className="flex gap-3 overflow-x-auto snap-x pb-1 -mx-1 px-1">
            {socialProofList.map((r) => (
              <ProofReviewCard key={r.id} review={r} compact showCta={false} />
            ))}
          </div>
        </div>
      )}

      <ReviewStep2Modal
        open={showReviewStep2}
        userId={user?.id}
        assetId={myProofReview?.id}
        onClose={() => setShowReviewStep2(false)}
        onComplete={() => user?.id && fetchMyProofReview(user.id).then(setMyProofReview)}
      />

      {/* 오늘 할 일 3개 */}
      <div className="bg-surface-50 rounded-2xl border border-surface-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-surface-900">오늘 할 일 3개</h2>
          {!sub.paid && (
            <button
              type="button"
              onClick={() => navigate('/settings?pay=1')}
              className="text-xs font-semibold text-primary-600 underline"
            >
              Pro로 더 정확히 →
            </button>
          )}
        </div>
        <ul className="space-y-3">
          {actions.map((a, idx) => (
            <li key={idx} className="flex items-start gap-3 pl-3 border-l-2 border-accent-400">
              <span className="text-accent-500 font-black text-base leading-none mt-0.5 w-4 shrink-0">
                {idx + 1}
              </span>
              <span className="text-sm text-surface-900 leading-snug">{a}</span>
            </li>
          ))}
        </ul>
        {checklist?.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/stats')}
            className="mt-3 text-xs font-medium text-primary-600 underline"
          >
            체크리스트 근거 보기 →
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/strategy')}
          className="mt-4 w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors"
        >
          이번 주 전략 보기 →
        </button>
      </div>

      {/* 약점 TOP3 */}
      <div className="bg-white rounded-2xl border border-surface-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-surface-900">가장 위험한 약점 TOP3</h2>
          <button
            type="button"
            onClick={() => navigate('/stats')}
            className="text-xs text-primary-600 font-medium"
          >
            근거 보기 →
          </button>
        </div>
        {top3.length === 0 ? (
          <p className="text-sm text-surface-400 py-2">
            오답을 쌓으면 약점 우선순위가 자동으로 잡혀요.
          </p>
        ) : (
          <div className="space-y-2">
            {top3.slice(0, 3).map((w, idx) => {
              const name =
                typeof w === 'string' ? w : w?.tag || w?.category || `약점 ${idx + 1}`
              const hasTime = typeof w === 'object' && w ? !!w.hasTimePressure : false
              const count = typeof w === 'object' && w ? w.count : null
              return (
                <div
                  key={name || idx}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 border-l-4 ${
                    idx === 0
                      ? 'bg-accent-50 border-l-accent-500 border border-accent-100'
                      : 'bg-surface-50 border-l-surface-300 border border-surface-200'
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      idx === 0 ? 'text-surface-900' : 'text-surface-700'
                    }`}
                  >
                    {idx + 1}. {name}
                  </span>
                  <span className="text-xs text-surface-500">
                    {hasTime ? '⏱ 시간' : '오답'} · {count ?? '-'}회
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pro 업그레이드 카드 */}
      {!sub.paid && (
        <div className="rounded-2xl bg-primary-900 text-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent-400 font-black text-xs uppercase tracking-widest">Pro</span>
            <span className="text-primary-400 text-xs">에서 달라지는 것</span>
          </div>
          <ul className="space-y-2 mb-4">
            <li className="text-sm text-primary-200 flex items-start gap-2">
              <span className="text-score-500 shrink-0">✓</span>
              구간 리포트로 "내가 오르는 근거" 기록
            </li>
            <li className="text-sm text-primary-200 flex items-start gap-2">
              <span className="text-score-500 shrink-0">✓</span>
              D-day 압축 전략 — 지금 버릴 것/할 것 명확히
            </li>
            <li className="text-sm text-primary-200 flex items-start gap-2">
              <span className="text-score-500 shrink-0">✓</span>
              무제한 오답 분석 + AI 코치 심화
            </li>
          </ul>
          <button
            type="button"
            onClick={() => navigate('/settings?pay=1')}
            className="w-full py-3 rounded-xl bg-accent-500 text-white text-sm font-bold hover:bg-accent-600 transition-colors"
          >
            Pro로 업그레이드하기
          </button>
        </div>
      )}

      {/* 노트로 이동 */}
      <button
        type="button"
        onClick={() => navigate('/notes')}
        className="w-full py-3 rounded-xl border border-surface-200 bg-white text-sm font-semibold text-surface-700 hover:bg-surface-50"
      >
        내 오답노트(노트)로 가기 →
      </button>
    </div>
  )
}
