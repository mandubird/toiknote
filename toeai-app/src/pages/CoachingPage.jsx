import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useListVersion } from '../contexts/RefreshListContext'
import { getDashboardSummary } from '../services/programService'
import { getSubscription } from '../services/subscription'
import { fetchWrongAnswerCount } from '../services/fetchWrongAnswers'
import { getMasteryBoard } from '../services/masteryService'
import { supabase } from '../lib/supabase'
import {
  fetchMyProofReview,
  getPublicProofReviewCount,
  fetchPublicProofReviews,
} from '../services/proofReviewService'
import { getOnboardingCoaching } from '../services/getOnboardingCoaching'
import OnboardingResult from '../components/OnboardingResult'
import ReviewStep2Modal from '../components/review/ReviewStep2Modal'
import ProofReviewCard from '../components/review/ProofReviewCard'

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const CURRENT_SCORE_OPTIONS = [700, 750, 800, 850, 900]
const TARGET_SCORE_OPTIONS = [750, 850, 900]
const DAYS_LEFT_OPTIONS = [7, 14, 30, 60]
const WEAK_PART_OPTIONS = [
  { key: 'LC', label: 'LC (듣기)' },
  { key: 'RC', label: 'RC (읽기)' },
  { key: 'Part5', label: 'Part 5 (문법/어휘)' },
  { key: 'Part7', label: 'Part 7 (독해)' },
]

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────
function formatDday(examDate) {
  if (!examDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(examDate)
  exam.setHours(0, 0, 0, 0)
  const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24))
  return Number.isFinite(diff) ? diff : null
}

/** loadUserProfile 행 → getDashboardSummary에 넘길 getUserProfile 형태 */
function coachingRowToDashboardProfile(row) {
  if (!row) return null
  const cur = Number(row.current_score)
  const tgt = Number(row.target_score)
  return {
    currentScore: cur >= 200 && cur <= 990 ? cur : 0,
    targetScore: tgt >= 200 && tgt <= 990 ? tgt : 900,
    lcScore: null,
    rcScore: null,
    usageCount: 0,
  }
}

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

// ─── 코칭 준비 현황 대시보드 ──────────────────────────────────────────────────
function CheckItem({ label, value, filled }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
      <span className="text-sm text-surface-700">{label}</span>
      <span className={`text-sm font-semibold ${filled ? 'text-surface-900' : 'text-surface-400'}`}>
        {filled ? value : '미입력'}
        <span className="ml-2">{filled ? '✅' : '⬜'}</span>
      </span>
    </div>
  )
}

// ─── 인라인 프로필 입력 폼 ────────────────────────────────────────────────────
function ProfileForm({ initial, onSave, onCancel }) {
  const [currentScore, setCurrentScore] = useState(
    String(initial?.current_score || CURRENT_SCORE_OPTIONS[1]),
  )
  const [targetScore, setTargetScore] = useState(
    String(initial?.target_score || TARGET_SCORE_OPTIONS[1]),
  )
  const [daysLeft, setDaysLeft] = useState(String(DAYS_LEFT_OPTIONS[1]))
  const [weakPart, setWeakPart] = useState(initial?.onboarding_weak_part || 'Part7')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      current_score: Number(currentScore),
      target_score: Number(targetScore),
      days_left: Number(daysLeft),
      weak_part: weakPart,
    })
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-4 space-y-4">
      <h3 className="text-sm font-bold text-surface-900">코칭 정보 입력</h3>

      <label className="block">
        <span className="text-xs font-semibold text-surface-700">현재 점수</span>
        <select
          className="w-full mt-1 border border-surface-200 rounded-xl px-3 py-2 text-sm bg-white"
          value={currentScore}
          onChange={(e) => setCurrentScore(e.target.value)}
        >
          {CURRENT_SCORE_OPTIONS.map((v) => (
            <option key={v} value={String(v)}>{v}점</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-surface-700">목표 점수</span>
        <select
          className="w-full mt-1 border border-surface-200 rounded-xl px-3 py-2 text-sm bg-white"
          value={targetScore}
          onChange={(e) => setTargetScore(e.target.value)}
        >
          {TARGET_SCORE_OPTIONS.map((v) => (
            <option key={v} value={String(v)}>{v}점</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-surface-700">시험까지 남은 기간</span>
        <select
          className="w-full mt-1 border border-surface-200 rounded-xl px-3 py-2 text-sm bg-white"
          value={daysLeft}
          onChange={(e) => setDaysLeft(e.target.value)}
        >
          {DAYS_LEFT_OPTIONS.map((v) => (
            <option key={v} value={String(v)}>{v}일</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-surface-700">가장 막히는 파트</span>
        <select
          className="w-full mt-1 border border-surface-200 rounded-xl px-3 py-2 text-sm bg-white"
          value={weakPart}
          onChange={(e) => setWeakPart(e.target.value)}
        >
          {WEAK_PART_OPTIONS.map((x) => (
            <option key={x.key} value={x.key}>{x.label}</option>
          ))}
        </select>
      </label>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-bold text-sm disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장하기'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 rounded-xl border border-surface-200 text-sm text-surface-600"
          >
            취소
          </button>
        )}
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function CoachingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const listVersion = useListVersion()

  const [userProfile, setUserProfile] = useState(null) // users 테이블 데이터
  const [wrongCount, setWrongCount] = useState(0)
  const [dashboard, setDashboard] = useState(null)
  const [sub, setSub] = useState({ paid: false })
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading] = useState(true)
  const [showProfileForm, setShowProfileForm] = useState(false)

  // 소셜 증거
  const [myProofReview, setMyProofReview] = useState(null)
  const [showReviewStep2, setShowReviewStep2] = useState(false)
  const [socialProofList, setSocialProofList] = useState([])
  const [socialProofCount, setSocialProofCount] = useState(0)

  // ─── DB 함수 ───────────────────────────────────────────────────────────────

  const loadUserProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('current_score, target_score, exam_date, onboarding_weak_part')
        .eq('id', userId)
        .maybeSingle()
      return data || null
    } catch {
      return null
    }
  }

  const saveUserProfile = async (userId, inputs) => {
    const examDate = new Date()
    examDate.setDate(examDate.getDate() + inputs.days_left)
    const examDateStr = examDate.toISOString().split('T')[0]
    const { error } = await supabase.from('users').upsert(
      {
        id: userId,
        current_score: inputs.current_score,
        target_score: inputs.target_score,
        exam_date: examDateStr,
        onboarding_weak_part: inputs.weak_part,
      },
      { onConflict: 'id' },
    )
    if (error) throw error
    // 백그라운드: quick_diagnosis_results에도 저장
    try {
      const coaching = getOnboardingCoaching({
        current_score: inputs.current_score,
        target_score: inputs.target_score,
        days_left: inputs.days_left,
        weak_part: inputs.weak_part,
      })
      await supabase.from('quick_diagnosis_results').insert({
        user_id: userId,
        current_score: inputs.current_score,
        target_score: inputs.target_score,
        hardest_part: inputs.weak_part,
        result_payload: {
          diagnosis_basis: {
            current_score: inputs.current_score,
            target_score: inputs.target_score,
            hardest_part: inputs.weak_part,
          },
          weakness_top3: coaching.weaknessTop3,
          today_tasks: coaching.today3,
          skip_task: coaching.discard1,
          version: 1,
        },
      })
    } catch {
      // 비필수 — 실패해도 무시
    }
    return {
      current_score: inputs.current_score,
      target_score: inputs.target_score,
      exam_date: examDateStr,
      onboarding_weak_part: inputs.weak_part,
    }
  }

  // ─── 메인 useEffect ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      setWrongCount(0)
      setDashboard(null)
      setSub({ paid: false })
      setChecklist([])
      setShowProfileForm(false)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setShowProfileForm(false)

    supabase.from('coaching_logs').insert({ user_id: user.id }).then(() => {}).catch(() => {})

    ;(async () => {
      try {
        // 1차: 오답 개수(head) · 구독 · 프로필 — 병렬 (전체 wrong_answers SELECT 제거)
        const [wc, s, profile] = await Promise.all([
          fetchWrongAnswerCount(user.id).catch(() => 0),
          getSubscription(user.id).catch(() => ({ paid: false })),
          loadUserProfile(user.id),
        ])
        if (cancelled) return

        setSub(s)
        setWrongCount(wc)
        setUserProfile(profile)

        // 2차: 오답 3개 이상일 때만 대시보드·마스터리 (프로필 주입으로 getUserProfile 중복 제거)
        if (wc >= 3) {
          const dashProfile = coachingRowToDashboardProfile(profile)
          const [d, board] = await Promise.all([
            getDashboardSummary(user.id, dashProfile ? { profile: dashProfile } : {}).catch(() => null),
            getMasteryBoard(user.id).catch(() => []),
          ])
          if (cancelled) return
          setDashboard(d)
          setChecklist(Array.isArray(board) ? board : [])

          if (wc > 0 && (d?.weakness_top3?.length ?? 0) > 0) {
            await supabase
              .from('users')
              .update({ activated_at: new Date().toISOString() })
              .eq('id', user.id)
              .is('activated_at', null)
              .catch(() => {})
          }
        } else {
          setDashboard(null)
          setChecklist([])
        }
      } catch (e) {
        console.error('[CoachingPage] error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [user?.id, listVersion])

  useEffect(() => {
    if (!user?.id) {
      setMyProofReview(null)
      return
    }
    fetchMyProofReview(user.id).then(setMyProofReview)
  }, [user?.id])

  useEffect(() => {
    if (!user || wrongCount < 3) return
    getPublicProofReviewCount().then((n) => {
      setSocialProofCount(n)
      if (n >= 3) fetchPublicProofReviews(8, { reviewStage2Only: true }).then(setSocialProofList)
      else setSocialProofList([])
    })
  }, [user?.id, wrongCount])

  // ─── 파생 데이터 ────────────────────────────────────────────────────────────

  const dday = useMemo(() => formatDday(dashboard?.examDate), [dashboard?.examDate])
  const profileDday = useMemo(() => formatDday(userProfile?.exam_date), [userProfile?.exam_date])
  const top3 = useMemo(() => dashboard?.weakness_top3 || [], [dashboard?.weakness_top3])
  const weeklyMission = dashboard?.weekly_mission || null
  const actions = useMemo(() => {
    if (checklist?.length >= 3) return checklist.slice(0, 3).map((i) => i?.name).filter(Boolean)
    return buildTodayActions({ top3, weeklyMission })
  }, [checklist, top3, weeklyMission])

  const daysSinceSignup = useMemo(() => {
    const t = user?.created_at
    if (!t) return 0
    const ms = Date.now() - new Date(t).getTime()
    return Math.floor(ms / (86400 * 1000))
  }, [user?.created_at])

  /** 스펙: 오답 ≥5 또는 가입 3일 이상, 후기 행 없을 때 */
  const showReviewCollectionBanner =
    !!user && myProofReview == null && (wrongCount >= 5 || daysSinceSignup >= 3)

  const profileComplete =
    userProfile?.current_score &&
    userProfile?.target_score &&
    userProfile?.onboarding_weak_part

  const quickCoachingInputs = profileComplete
    ? {
        current_score: userProfile.current_score,
        target_score: userProfile.target_score,
        days_left: profileDday != null ? profileDday : 30,
        weak_part: userProfile.onboarding_weak_part,
      }
    : null

  const quickCoaching = useMemo(
    () => (quickCoachingInputs ? getOnboardingCoaching(quickCoachingInputs) : null),
    [userProfile?.current_score, userProfile?.target_score, userProfile?.onboarding_weak_part, profileDday],
  )

  // ─── 렌더링 ────────────────────────────────────────────────────────────────

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
        <button type="button" onClick={() => navigate('/landing')} className="mt-3 text-primary-600 font-medium">
          랜딩으로 이동
        </button>
      </div>
    )
  }

  // ── 상태 D: 정밀 코칭 (오답 3개+) ──────────────────────────────────────────
  if (wrongCount >= 3) {
    return (
      <div className="p-4 pb-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">오늘의 코칭</h1>
          <p className="text-sm text-surface-500 mt-1">지금 상태 → 오늘 할 일 → 약점 우선순위</p>
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
              <><span>·</span><span className="text-accent-400 font-bold">D-{dday}</span></>
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

        {showReviewCollectionBanner && (
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
            <p className="text-sm text-surface-800 mb-3">
              사용 경험을 남겨주시면 더 정확한 전략 개선에 반영됩니다.
            </p>
            <button
              type="button"
              onClick={() => navigate('/review/write')}
              className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold"
            >
              후기 남기기
            </button>
          </div>
        )}

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
              <button type="button" onClick={() => navigate('/settings?pay=1')} className="text-xs font-semibold text-primary-600 underline">
                Pro로 더 정확히 →
              </button>
            )}
          </div>
          <ul className="space-y-3">
            {actions.map((a, idx) => (
              <li key={idx} className="flex items-start gap-3 pl-3 border-l-2 border-accent-400">
                <span className="text-accent-500 font-black text-base leading-none mt-0.5 w-4 shrink-0">{idx + 1}</span>
                <span className="text-sm text-surface-900 leading-snug">{a}</span>
              </li>
            ))}
          </ul>
          {checklist?.length > 0 && (
            <button type="button" onClick={() => navigate('/stats')} className="mt-3 text-xs font-medium text-primary-600 underline">
              체크리스트 근거 보기 →
            </button>
          )}
          <button type="button" onClick={() => navigate('/strategy')} className="mt-4 w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors">
            이번 주 전략 보기 →
          </button>
        </div>

        {/* 약점 TOP3 */}
        <div className="bg-white rounded-2xl border border-surface-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-surface-900">가장 위험한 약점 TOP3</h2>
            <button type="button" onClick={() => navigate('/stats')} className="text-xs text-primary-600 font-medium">근거 보기 →</button>
          </div>
          {top3.length === 0 ? (
            <p className="text-sm text-surface-400 py-2">오답을 쌓으면 약점 우선순위가 자동으로 잡혀요.</p>
          ) : (
            <div className="space-y-2">
              {top3.slice(0, 3).map((w, idx) => {
                const name = typeof w === 'string' ? w : w?.tag || w?.category || `약점 ${idx + 1}`
                const hasTime = typeof w === 'object' && w ? !!w.hasTimePressure : false
                const count = typeof w === 'object' && w ? w.count : null
                return (
                  <div key={name || idx} className={`flex items-center justify-between rounded-xl px-3 py-2.5 border-l-4 ${idx === 0 ? 'bg-accent-50 border-l-accent-500 border border-accent-100' : 'bg-surface-50 border-l-surface-300 border border-surface-200'}`}>
                    <span className={`text-sm font-semibold ${idx === 0 ? 'text-surface-900' : 'text-surface-700'}`}>{idx + 1}. {name}</span>
                    <span className="text-xs text-surface-500">{hasTime ? '⏱ 시간' : '오답'} · {count ?? '-'}회</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pro 업그레이드 */}
        {!sub.paid && (
          <div className="rounded-2xl bg-primary-900 text-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-accent-400 font-black text-xs uppercase tracking-widest">Pro</span>
              <span className="text-primary-400 text-xs">에서 달라지는 것</span>
            </div>
            <ul className="space-y-2 mb-4">
              <li className="text-sm text-primary-200 flex items-start gap-2"><span className="text-score-500 shrink-0">✓</span>구간 리포트로 "내가 오르는 근거" 기록</li>
              <li className="text-sm text-primary-200 flex items-start gap-2"><span className="text-score-500 shrink-0">✓</span>D-day 압축 전략 — 지금 버릴 것/할 것 명확히</li>
              <li className="text-sm text-primary-200 flex items-start gap-2"><span className="text-score-500 shrink-0">✓</span>무제한 오답 분석 + AI 코치 심화</li>
            </ul>
            <button type="button" onClick={() => navigate('/settings?pay=1')} className="w-full py-3 rounded-xl bg-accent-500 text-white text-sm font-bold hover:bg-accent-600 transition-colors">
              Pro로 업그레이드하기
            </button>
          </div>
        )}

        <button type="button" onClick={() => navigate('/notes')} className="w-full py-3 rounded-xl border border-surface-200 bg-white text-sm font-semibold text-surface-700 hover:bg-surface-50">
          내 오답노트(노트)로 가기 →
        </button>
      </div>
    )
  }

  // ── 상태 A/B/C: 대시보드 홈 (오답 0~2개) ────────────────────────────────────
  return (
    <div className="p-4 pb-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">코칭 홈</h1>
        <p className="text-sm text-surface-500 mt-1">정보를 채울수록 코칭이 정밀해져요</p>
      </div>

      {showReviewCollectionBanner && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
          <p className="text-sm text-surface-800 mb-3">
            사용 경험을 남겨주시면 더 정확한 전략 개선에 반영됩니다.
          </p>
          <button
            type="button"
            onClick={() => navigate('/review/write')}
            className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold"
          >
            후기 남기기
          </button>
        </div>
      )}

      {/* 코칭 준비 현황 카드 */}
      <div className="bg-white rounded-2xl border border-surface-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-surface-900">코칭 준비 현황</h2>
          <button
            type="button"
            onClick={() => setShowProfileForm((v) => !v)}
            className="text-xs text-primary-600 font-semibold underline"
          >
            {showProfileForm ? '닫기' : (profileComplete ? '수정하기' : '입력하기')}
          </button>
        </div>

        <CheckItem
          label="현재 점수"
          value={`${userProfile?.current_score}점`}
          filled={!!userProfile?.current_score}
        />
        <CheckItem
          label="목표 점수"
          value={`${userProfile?.target_score}점`}
          filled={!!userProfile?.target_score}
        />
        <CheckItem
          label="시험일"
          value={profileDday != null ? `D-${profileDday}` : '—'}
          filled={!!userProfile?.exam_date}
        />
        <CheckItem
          label="막히는 파트"
          value={userProfile?.onboarding_weak_part}
          filled={!!userProfile?.onboarding_weak_part}
        />

        {/* 오답 진행 바 */}
        <div className="mt-3 pt-3 border-t border-surface-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-surface-700">오답 등록</span>
            <span className={`text-sm font-semibold ${wrongCount > 0 ? 'text-surface-900' : 'text-surface-400'}`}>
              {wrongCount}/3개
              <span className="ml-2">{wrongCount >= 3 ? '✅' : '⬜'}</span>
            </span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i < wrongCount ? 'bg-primary-500' : 'bg-surface-200'
                }`}
              />
            ))}
          </div>
          {wrongCount < 3 && (
            <p className="text-xs text-surface-500 mt-1.5">
              오답 3개가 등록되면 정밀 코칭이 시작돼요
            </p>
          )}
        </div>
      </div>

      {/* 점수 교정 넛지 배너
          드롭다운 선택값(50 배수)은 대략 입력된 값으로 판단 → 설정에서 정밀 수정 유도 */}
      {profileComplete &&
        !showProfileForm &&
        userProfile.current_score % 50 === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <span className="text-amber-500 text-base shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">점수를 정확히 입력하면 코칭이 더 정밀해져요</p>
              <p className="text-xs text-amber-700 mt-0.5">
                현재 입력된 {userProfile.current_score}점은 대략적인 값이에요.
                실제 성적표 기준으로 수정하면 약점 분석이 훨씬 정확해져요.
              </p>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="mt-2 text-xs font-bold text-amber-800 underline"
              >
                설정에서 정확한 점수 입력하기 →
              </button>
            </div>
          </div>
        )}

      {/* 인라인 입력 폼 */}
      {showProfileForm && (
        <ProfileForm
          initial={userProfile}
          onSave={async (inputs) => {
            const saved = await saveUserProfile(user.id, inputs)
            setUserProfile(saved)
            setShowProfileForm(false)
          }}
          onCancel={() => setShowProfileForm(false)}
        />
      )}

      {/* 액션 버튼 */}
      <div className="space-y-2">
        {!profileComplete && (
          <button
            type="button"
            onClick={() => setShowProfileForm(true)}
            className="w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold"
          >
            점수 / 시험 정보 입력하기
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/notes')}
          className="w-full py-3 rounded-xl border border-surface-200 bg-white text-sm font-semibold text-surface-700 hover:bg-surface-50"
        >
          오답 등록하러 가기 →
        </button>
        {wrongCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/strategy')}
            className="w-full py-3 rounded-xl border border-primary-200 bg-primary-50 text-sm font-semibold text-primary-700"
          >
            이번 주 전략 보기 →
          </button>
        )}
      </div>

      {/* 간단 코칭 결과 (프로필 입력된 경우) */}
      {profileComplete && quickCoaching && !showProfileForm && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-surface-500">
              {userProfile.current_score}점 / 목표 {userProfile.target_score}점
              {profileDday != null ? ` / D-${profileDday}` : ''} 기준 간단 결과
            </p>
          </div>
          <OnboardingResult
            coaching={quickCoaching}
            exampleMode={false}
            onRegisterWrong3={() => navigate('/notes')}
            onGoPayment={() => navigate('/settings?pay=1')}
            onDirectDiagnose={() => setShowProfileForm(true)}
          />
        </div>
      )}

      {/* Pro 업그레이드 */}
      {!sub.paid && (
        <div className="rounded-2xl bg-primary-900 text-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent-400 font-black text-xs uppercase tracking-widest">Pro</span>
            <span className="text-primary-400 text-xs">에서 달라지는 것</span>
          </div>
          <ul className="space-y-2 mb-4">
            <li className="text-sm text-primary-200 flex items-start gap-2"><span className="text-score-500 shrink-0">✓</span>구간 리포트로 "내가 오르는 근거" 기록</li>
            <li className="text-sm text-primary-200 flex items-start gap-2"><span className="text-score-500 shrink-0">✓</span>D-day 압축 전략 — 지금 버릴 것/할 것 명확히</li>
            <li className="text-sm text-primary-200 flex items-start gap-2"><span className="text-score-500 shrink-0">✓</span>무제한 오답 분석 + AI 코치 심화</li>
          </ul>
          <button type="button" onClick={() => navigate('/settings?pay=1')} className="w-full py-3 rounded-xl bg-accent-500 text-white text-sm font-bold hover:bg-accent-600 transition-colors">
            Pro로 업그레이드하기
          </button>
        </div>
      )}
    </div>
  )
}
