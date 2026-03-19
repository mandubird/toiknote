import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getSubscription } from '../services/subscription'
import { analyzeStrategy } from '../services/analyzeStrategy'
import { getDashboardSummary } from '../services/programService'
import PriorityWeaknessSection from '../components/strategy/PriorityWeaknessSection'
import { fetchPublicProofReviews } from '../services/proofReviewService'
import ProofReviewCard from '../components/review/ProofReviewCard'

const CACHE_MS = 24 * 60 * 60 * 1000

// ── 헬퍼 ──────────────────────────────────────────

function calcDday(examDate) {
  if (!examDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(examDate)
  exam.setHours(0, 0, 0, 0)
  const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24))
  return diff
}

function getMode(dday) {
  if (dday === null) return 'unknown'
  if (dday > 56) return 'normal'
  if (dday >= 35) return 'compressed'
  if (dday >= 21) return 'high_compressed'
  return 'survival'
}

const MODE_CONFIG = {
  unknown: {
    label: '모드 미설정',
    icon: '📅',
    bg: 'bg-surface-50',
    border: 'border-surface-200',
    text: 'text-surface-700',
    badge: 'bg-surface-100 text-surface-600',
    desc: '설정에서 시험일을 입력하면 D-day 압축 모드가 계산돼요.',
    reason:
      '시험일까지 남은 시간이 확인되지 않아, 아직 전략 모드를 고정하지 않았어요. 먼저 시험일을 입력해 주세요.',
  },
  normal: {
    label: '일반 모드',
    icon: '📘',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
    desc: (n) => `D-${n} — 시험까지 여유가 있어요. 균형 잡힌 약점 교정으로 꾸준히 쌓아가세요.`,
    reason:
      '시험까지 여유가 있어 약점 전반을 균형 있게 교정할 수 있어요. 지금은 점수 기반을 안정적으로 쌓는 구간입니다.',
  },
  compressed: {
    label: '압축 모드',
    icon: '🤖',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-900',
    badge: 'bg-blue-200 text-blue-800',
    desc: (n) => `D-${n} 압축 모드 — 핵심 약점 위주로 집중 공략하세요.`,
    reason:
      '핵심 약점에만 집중할 시간이에요. 분산 투자보다 상위 약점 2개 공략이 점수 상승에 효과적입니다.',
  },
  high_compressed: {
    label: '고압축 모드',
    icon: '⚡',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-900',
    badge: 'bg-orange-100 text-orange-700',
    desc: (n) => `D-${n} 고압축 모드 — 시험일까지 가장 손실 큰 약점부터 압축 배치해요.`,
    reason:
      '시험일이 다가왔어요. 균형보다 "손실 큰 약점 1개 압축"이 우선입니다.',
  },
  survival: {
    label: '생존 모드',
    icon: '🚨',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-700',
    desc: (n) => `D-${n} 생존 모드 — 핵심 파트 미션만 집중해요. 범위를 줄이고 반복하세요.`,
    reason:
      '새 학습은 오히려 역효과예요. 이미 아는 것을 안정적으로 유지하는 것이 지금 전략입니다.',
  },
}

function formatLastAnalyzed(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60 * 1000) return '방금 전'
  if (ms < 60 * 60 * 1000) return `${Math.floor(ms / 60000)}분 전`
  if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / 3600000)}시간 전`
  return `${Math.floor(ms / 86400000)}일 전`
}

// ── 컴포넌트 ──────────────────────────────────────

const StrategyPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [strategy, setStrategy] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState(null)
  const [relatedProofReviews, setRelatedProofReviews] = useState([])

  useEffect(() => {
    if (!user) {
      setSubscribed(false)
      setStrategy(null)
      setDashboard(null)
      setLoading(false)
      return
    }
    const uid = user.id
    Promise.all([
      getSubscription(uid),
      getDashboardSummary(uid),
      supabase.from('score_analytics').select('*').eq('user_id', uid).maybeSingle(),
    ]).then(([sub, dash, { data: d }]) => {
      setSubscribed(sub.paid)
      setDashboard(dash)
      if (sub.paid && d) {
        const lastAt = d.last_analyzed_at ? new Date(d.last_analyzed_at).getTime() : 0
        if (lastAt && Date.now() - lastAt < CACHE_MS) {
          setStrategy({
            priorityFocus: d.priority_focus,
            dailyPlan: d.daily_plan,
            weeklyGoal: d.weekly_goal,
            expectedImprovement: d.expected_improvement,
            specificTips: Array.isArray(d.specific_tips) ? d.specific_tips : [],
            rcTimeAllocation: d.rc_time_allocation || { part5: 15, part6: 8, part7: 52 },
            rcStrategyText: d.rc_strategy_text || '',
            grammarWeaknessSummary: d.grammar_weakness_summary || '',
            weakGrammarTop3: Array.isArray(d.weak_grammar_top3) ? d.weak_grammar_top3 : [],
            avgPart7TimeSeconds: d.avg_part7_time ?? null,
            lastAnalyzedAt: d.last_analyzed_at,
          })
        }
      }
      setLoading(false)
    }).catch((err) => {
      console.error('[StrategyPage] init error:', err)
      setLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (!user || !dashboard?.target_score) {
      setRelatedProofReviews([])
      return
    }
    const tgt = Number(dashboard.target_score) || 850
    fetchPublicProofReviews(2, {
      reviewStage2Only: true,
      minTargetScore: tgt,
      maxTargetScore: tgt,
    }).then(setRelatedProofReviews)
  }, [user?.id, dashboard?.target_score])

  const handleAnalyze = async () => {
    if (!user || !subscribed) return
    setError(null)
    setAnalyzing(true)
    try {
      const result = await analyzeStrategy(user.id)
      setStrategy(result)
    } catch (err) {
      setError(err?.message || '전략 분석에 실패했어요.')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    )
  }

  // D-day 및 모드 계산
  const dday = calcDday(dashboard?.examDate)
  const mode = getMode(dday)
  const modeConf = MODE_CONFIG[mode]
  const modeDesc = typeof modeConf.desc === 'function' ? modeConf.desc(dday) : modeConf.desc
  const modeReason = modeConf.reason

  const weakness3 = dashboard?.weakness_top3 ?? []

  return (
    <div className="p-4 space-y-4">

      {/* ── 섹션1: StrategyHero ── */}
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-surface-900">D-day 압축 전략</h2>
        <p className="text-sm text-surface-500 mt-1">
          이번 주에 "무엇을/얼마나" 할지 정해서, 점수 손실부터 줄입니다
        </p>
      </div>

      {/* ── 섹션2: 현재 모드 카드 ── */}
      <div className={`rounded-2xl border-2 p-5 ${modeConf.bg} ${modeConf.border}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{modeConf.icon}</span>
          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${modeConf.badge}`}>
            {modeConf.label}
          </span>
          {dday !== null && (
            <span className="text-2xl font-black text-surface-900 ml-auto">D-{dday}</span>
          )}
        </div>
        <p className={`text-sm font-semibold ${modeConf.text} mb-2`}>{modeDesc}</p>
        <p className="text-xs text-surface-500 leading-relaxed">{modeReason}</p>
        {weakness3[0] && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60">
            <span className="text-xs text-surface-500">우선 교정</span>
            <span className="text-xs font-bold text-surface-900">
              {weakness3[0]?.tag || weakness3[0]}
            </span>
          </div>
        )}
        {mode === 'unknown' && (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="mt-3 text-xs font-medium text-primary-600 underline"
          >
            설정에서 시험일 입력하기 →
          </button>
        )}
      </div>

      {/* ── CTA 버튼: 모드 카드 바로 아래 ── */}
      {subscribed && (
        <div>
          {strategy?.lastAnalyzedAt && (
            <p className="text-xs text-surface-400 mb-1.5 text-right">
              마지막 분석: {formatLastAnalyzed(strategy.lastAnalyzedAt)}
            </p>
          )}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full py-4 rounded-2xl bg-primary-600 text-white font-bold text-base disabled:opacity-50 hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
          >
            {analyzing ? '분석 중…' : strategy ? '🔄 전략 새로고침' : '⚡ AI 전략 분석 시작'}
          </button>
          {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
        </div>
      )}

      {/* ── 비구독자 안내 ── */}
      {!subscribed && (
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4 text-center">
          <p className="text-sm font-medium text-surface-700 mb-2">
            AI 집중 블록 분석은 유료 구독 후 이용할 수 있어요
          </p>
          <button
            type="button"
            onClick={() => navigate('/settings?pay=1')}
            className="text-xs font-bold text-primary-600 underline"
          >
            설정에서 결제하기 →
          </button>
        </div>
      )}

      {/* ── 약점 코칭 카드 섹션 ── */}
      {user && (
        <div className="bg-white rounded-2xl border border-surface-200 p-4">
          <p className="text-xs font-black text-surface-400 uppercase tracking-wide mb-3">
            지금 우선 교정할 약점
          </p>
          <PriorityWeaknessSection userId={user.id} />
        </div>
      )}

      {/* 비슷한 목표 점수대 후기 (스펙 6.3) */}
      {relatedProofReviews.length > 0 && (
        <div className="bg-surface-50 rounded-2xl border border-surface-200 p-4">
          <p className="text-xs font-black text-surface-500 uppercase tracking-wide mb-2">
            비슷한 목표를 둔 사람들의 후기
          </p>
          <div className="space-y-3">
            {relatedProofReviews.map((r) => (
              <ProofReviewCard key={r.id} review={r} showCta />
            ))}
          </div>
        </div>
      )}

      {/* ── 구독자 전용: AI 분석 결과 ── */}
      {subscribed && strategy && (
            <div className="space-y-4">

              {/* ── 섹션4: 집중 블록 ── */}

              {/* Part 5 문법 약점 블록 */}
              {strategy.grammarWeaknessSummary && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
                    Part 5 문법 교정 블록
                  </p>
                  <p className="text-amber-900 text-sm font-medium">{strategy.grammarWeaknessSummary}</p>
                </div>
              )}

              {/* 핵심 약점 교정 블록 */}
              {strategy.priorityFocus && (
                <div className="bg-white rounded-xl border border-surface-200 p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    핵심 약점 교정 블록
                  </p>
                  <p className="text-surface-900 text-sm font-medium">{strategy.priorityFocus}</p>
                </div>
              )}

              {/* RC 시간 압축 블록 */}
              {strategy.rcTimeAllocation && (
                <div className="bg-white rounded-xl border border-surface-200 p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    RC 시간 손실 압축 블록
                  </p>
                  {strategy.rcStrategyText && (
                    <p className="text-sm text-surface-800 mb-3">{strategy.rcStrategyText}</p>
                  )}
                  <div className="space-y-2">
                    {[
                      { label: 'Part 5', key: 'part5', color: 'bg-primary-500' },
                      { label: 'Part 6', key: 'part6', color: 'bg-primary-400' },
                      { label: 'Part 7', key: 'part7', color: 'bg-primary-600' },
                    ].map(({ label, key, color }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-sm text-surface-700 w-14">{label}</span>
                        <div className="flex-1 h-5 bg-surface-100 rounded overflow-hidden">
                          <div
                            className={`h-full ${color}`}
                            style={{ width: `${((strategy.rcTimeAllocation[key] || 0) / 75) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-surface-900 w-10">
                          {strategy.rcTimeAllocation[key]}분
                        </span>
                      </div>
                    ))}
                  </div>
                  {!strategy.rcStrategyText && (
                    <p className="text-xs text-surface-400 mt-2">
                      Part 5·6에서 시간 확보 후 Part 7에 충분히 배분하세요.
                    </p>
                  )}
                </div>
              )}

              {/* 학습 루틴 블록 */}
              {strategy.dailyPlan && (
                <div className="bg-white rounded-xl border border-surface-200 p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    학습 루틴 블록
                  </p>
                  <p className="text-surface-800 text-sm whitespace-pre-wrap leading-relaxed">
                    {strategy.dailyPlan}
                  </p>
                </div>
              )}

              {/* 실전 팁 */}
              {strategy.specificTips && strategy.specificTips.length > 0 && (
                <div className="bg-white rounded-xl border border-surface-200 p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    실전 핵심 팁
                  </p>
                  <ul className="space-y-2">
                    {strategy.specificTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-surface-800">
                        <span className="text-primary-400 mt-0.5 flex-shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 예상 개선 */}
              {strategy.expectedImprovement && (
                <div className="bg-primary-50 rounded-xl border border-primary-100 p-4">
                  <p className="text-xs font-bold text-primary-600 uppercase tracking-wide mb-1">
                    예상 점수 개선
                  </p>
                  <p className="text-primary-900 text-sm font-medium">{strategy.expectedImprovement}</p>
                </div>
              )}

              {/* ── 섹션5: AI 코치 한 줄 ── */}
              {strategy.weeklyGoal && (
                <div className="bg-surface-50 rounded-xl border border-surface-200 p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">💬</span>
                    <p className="text-sm text-surface-700 leading-relaxed">{strategy.weeklyGoal}</p>
                  </div>
                </div>
              )}
            </div>
      )}

      {/* 위 버튼을 눌러서... 안내는 구독 중이고 분석 결과가 없을 때만 */}
      {subscribed && !strategy && !analyzing && (
        <p className="text-sm text-surface-400 text-center py-2">
          위 버튼을 눌러 AI 전략을 분석해 보세요
        </p>
      )}
    </div>
  )
}

export default StrategyPage
