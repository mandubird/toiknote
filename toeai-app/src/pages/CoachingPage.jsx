import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardSummary } from '../services/programService'
import { getSubscription } from '../services/subscription'
import { fetchWrongAnswers } from '../services/fetchWrongAnswers'
import { getMasteryBoard } from '../services/masteryService'
import { supabase } from '../lib/supabase'

function buildTodayActions({ top3, weeklyMission }) {
  const pickName = (x) => {
    if (!x) return null
    if (typeof x === 'string') return x
    return x.tag || x.category || null
  }
  const t1 = pickName(top3?.[0])
  const t2 = pickName(top3?.[1])

  const actions = []
  // 1) 가장 안전한 고정 액션(초기 유저도 가능)
  actions.push('Part 5 하루 10문제 — 시간 제한 없이 정확도부터')

  // 2) 약점 태그 기반 액션
  if (t1) actions.push(`${t1} 유형 15문제 집중 풀이`)
  else if (weeklyMission) actions.push(`이번 주 포커스: ${weeklyMission}`)
  else actions.push('가장 자주 틀리는 유형 1개를 골라 15문제 반복')

  // 3) Part7/시간 관련 약점이 있으면 시간 제한 액션
  const part7Hint = [t1, t2].some((t) => typeof t === 'string' && (t.includes('Part7') || t.includes('Part 7') || t.includes('추론') || t.includes('복수') || t.includes('지문') || t.includes('시간')))
  actions.push(part7Hint ? 'Part 7 2지문 시간 제한 풀이 (단일 90초 / 복수 150초)' : '오답 5문제 복습 후 “왜 틀렸는지” 한 줄로 요약')

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

export default function CoachingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [sub, setSub] = useState({ paid: false })
  const [wrongCount, setWrongCount] = useState(0)
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setDashboard(null)
      setSub({ paid: false })
      setWrongCount(0)
      setLoading(false)
      return
    }
    setLoading(true)

    // 코칭 화면 진입 로그 (coaching_logs) — KPI용
    // Supabase 쿼리 빌더는 PostgrestBuilder를 반환하므로, 여기서는 에러를 무시하고 fire-and-forget으로 호출만 한다.
    // (에러가 나더라도 코칭 화면 렌더링에는 영향을 주지 않도록 await/then/catch를 붙이지 않는다.)
    supabase.from('coaching_logs').insert({ user_id: user.id })

    Promise.all([
      getDashboardSummary(user.id).catch(() => null),
      getSubscription(user.id).catch(() => ({ paid: false })),
      fetchWrongAnswers(user.id).then((list) => list?.length ?? 0).catch(() => 0),
      getMasteryBoard(user.id).catch(() => []),
    ])
      .then(async ([d, s, wc, board]) => {
        setDashboard(d)
        setSub(s)
        setWrongCount(wc)
        setChecklist(Array.isArray(board) ? board : [])

        // 활성화 조건 체크:
        // ① 약점 TOP3 확인 가능 (dashboard.weakness_top3 존재)
        // ② 오늘 할 일 3개 확인 가능 (checklist 또는 fallback)
        // ③ 오답 1개 이상 등록 (wrongCount > 0)
        if (wc > 0 && (d?.weakness_top3?.length ?? 0) > 0) {
          // 이미 활성화된 유저는 업데이트하지 않음
          await supabase
            .from('users')
            .update({ activated_at: new Date().toISOString() })
            .eq('id', user.id)
            .is('activated_at', null)
            .catch(() => {})
        }
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  const dday = useMemo(() => formatDday(dashboard?.examDate), [dashboard?.examDate])
  const top3 = useMemo(() => dashboard?.weakness_top3 || [], [dashboard?.weakness_top3])
  const weeklyMission = dashboard?.weekly_mission || null
  const actions = useMemo(() => {
    // 체크리스트 로직 그대로 재활용:
    // TodayAction = Checklist.slice(0, 3)
    if (checklist?.length >= 3) {
      return checklist.slice(0, 3).map((i) => i?.name).filter(Boolean)
    }
    return buildTodayActions({ top3, weeklyMission })
  }, [checklist, top3, weeklyMission])

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

  return (
    <div className="p-4 pb-8 space-y-4">
      {/* 헤드라인 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">오늘의 코칭</h1>
        <p className="text-sm text-gray-500 mt-1">
          지금 상태 → 오늘 할 일 → 약점 우선순위
        </p>
      </div>

      {/* 점수 요약 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-500">현재 예상 점수</p>
            <p className="text-2xl font-bold text-gray-900">
              {dashboard?.predicted_score != null ? `${dashboard.predicted_score}점` : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">목표 점수</p>
            <p className="text-lg font-bold text-primary-700">
              {dashboard?.target_score != null ? `${dashboard.target_score}점` : '900점'}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>오답 {wrongCount}개</span>
          {dday != null && dday >= 0 && <span>시험까지 D-{dday}</span>}
        </div>
        {dday == null && (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="mt-3 text-xs font-medium text-primary-600 underline"
          >
            시험일 입력하면 압축 모드가 계산돼요 →
          </button>
        )}
      </div>

      {/* 오늘 할 일 3개 */}
      <div className="bg-primary-50 rounded-xl border border-primary-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-primary-900">오늘 할 일 3개</h2>
          {!sub.paid && (
            <button
              type="button"
              onClick={() => navigate('/settings?pay=1')}
              className="text-xs font-semibold text-primary-700 underline"
            >
              Pro로 더 정확히 →
            </button>
          )}
        </div>
        <ul className="space-y-2">
          {actions.map((a, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-primary-900">
              <span className="text-primary-600 font-bold">{idx + 1}</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
        {checklist?.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/stats')}
            className="mt-2 text-xs font-medium text-primary-700 underline"
          >
            체크리스트 근거 보기 →
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/strategy')}
          className="mt-3 w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold"
        >
          이번 주 전략 보기 →
        </button>
      </div>

      {/* 약점 TOP3 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">가장 위험한 약점 TOP3</h2>
          <button type="button" onClick={() => navigate('/stats')} className="text-xs text-primary-600 font-medium">
            근거 보기 →
          </button>
        </div>
        {top3.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">오답을 쌓으면 약점 우선순위가 자동으로 잡혀요.</p>
        ) : (
          <div className="space-y-2">
            {top3.slice(0, 3).map((w, idx) => {
              const name = typeof w === 'string' ? w : w?.tag || w?.category || `약점 ${idx + 1}`
              const hasTime = typeof w === 'object' && w ? !!w.hasTimePressure : false
              const count = typeof w === 'object' && w ? w.count : null
              return (
              <div key={name || idx} className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <span className="text-sm font-medium text-gray-800">
                  {idx + 1}. {name}
                </span>
                <span className="text-xs text-gray-500">
                  {hasTime ? '⏱ 시간' : '오답'} · {count ?? '-'}회
                </span>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pro 미리보기 */}
      {!sub.paid && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <p className="text-sm font-semibold text-amber-900 mb-1">Pro에서 달라지는 것</p>
          <ul className="text-sm text-amber-800 space-y-1 mb-3">
            <li>• 구간 리포트/PDF로 “내가 오르는 근거”를 기록</li>
            <li>• D-day 압축 전략으로 “지금 버릴 것/할 것”을 명확히</li>
            <li>• 무제한 오답 분석 + AI 코치 심화</li>
          </ul>
          <button
            type="button"
            onClick={() => navigate('/settings?pay=1')}
            className="w-full py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600"
          >
            Pro로 업그레이드하기
          </button>
        </div>
      )}

      {/* 노트로 이동 */}
      <button
        type="button"
        onClick={() => navigate('/notes')}
        className="w-full py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        내 오답노트(노트)로 가기 →
      </button>
    </div>
  )
}

