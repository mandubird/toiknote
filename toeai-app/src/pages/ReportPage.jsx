/**
 * v4.1: 주간 리포트 상세 /report/:weekNumber
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getWeeklyReports } from '../services/programService'
import { downloadWeeklyReportAsPdf } from '../services/weeklyReportPdf'
import { getSnapshotsForWeek } from '../services/snapshotService'
import { fetchTagStats, calculateEstimatedScore } from '../services/fetchTagStats'

function formatDelta(n) {
  if (n == null || Number.isNaN(Number(n))) return null
  const v = Number(n)
  return `${v >= 0 ? '+' : ''}${v}`
}

function pickTopTags(tagCounts = {}, topN = 3) {
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count: Number(count) || 0 }))
    .filter((x) => x.tag && x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

function buildRuleComment({ topTag, scoreDelta, hasCompare }) {
  if (!topTag) return '오답을 더 쌓으면 약점이 더 정확하게 잡혀요.'
  const base = `${topTag}가 현재 가장 큰 약점이에요. 이 유형을 먼저 줄이는 게 점수 효율이 높아요.`
  if (!hasCompare) return base
  if (scoreDelta != null && scoreDelta >= 20) return `좋은 흐름이에요. 점수 상승을 만들었던 포인트를 유지하면서 ${topTag}를 더 압축해서 줄이세요.`
  if (scoreDelta != null && scoreDelta > 0) return `조금씩 오르고 있어요. 이번 구간은 ${topTag}를 고정 약점으로 잡고 반복이 필요해요.`
  if (scoreDelta != null && scoreDelta < 0) return `점수가 흔들리고 있어요. 이번 구간은 ${topTag}를 먼저 안정화하는 게 우선이에요.`
  return base
}

function buildNextActions(topTags = []) {
  const t1 = topTags[0]?.tag
  const t2 = topTags[1]?.tag
  const t3 = topTags[2]?.tag

  // 매우 단순한 rule 기반 액션 (베타)
  const actions = []
  actions.push('Part 5 하루 10문제 (시간 제한 없이 정확도부터)')

  if (t1) actions.push(`${t1} 유형 15문제 집중 풀이`)
  else actions.push('가장 자주 틀린 태그 1개를 골라 15문제 반복')

  const part7Hint = [t1, t2, t3].some((t) => typeof t === 'string' && (t.includes('Part7') || t.includes('Part 7') || t.includes('추론') || t.includes('복수') || t.includes('지문') || t.includes('시간')))
  actions.push(part7Hint ? 'Part 7 2지문 시간 제한 풀이 (단일 90초 / 복수 150초 기준)' : '오답 5문제 복습 후 "왜 틀렸는지" 한 줄로 요약')

  return actions.slice(0, 3)
}

function buildAvoidList(topTags = []) {
  const t1 = topTags[0]?.tag || ''
  const hasTimePressure =
    [t1, topTags[1]?.tag, topTags[2]?.tag]
      .filter(Boolean)
      .some((t) => String(t).includes('시간') || String(t).includes('Part 7') || String(t).includes('Part7'))

  const list = []
  if (hasTimePressure) {
    list.push('지금은 새로운 지문 유형을 처음부터 많이 늘리지 말고, 이미 틀린 지문만 다시 보는 공부는 피하세요.')
    list.push('시험 직전에 전범위 모의고사만 반복하기보다는, 시간 부족을 유발한 파트만 따로 모아두는 것도 오늘은 하지 마세요.')
  } else {
    list.push('이미 안정적인 영역(오답이 거의 없는 파트)에 시간을 더 쓰는 공부는 오늘은 피하세요.')
    list.push('설명 영상이나 이론 정리만 오래 보는 공부보다, 실제 문제 풀이 없이 이론만 소비하는 행동은 줄이세요.')
  }
  return list
}

const ReportPage = () => {
  const { weekNumber } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const week = Math.max(1, Math.min(8, parseInt(weekNumber, 10) || 1))
  const [report, setReport] = useState(null)
  const [beta, setBeta] = useState(null)
  const [totalWrong, setTotalWrong] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      getWeeklyReports(user.id)
        .then((reports) => (reports && reports.find((r) => r.week === week)) || null)
        .catch(() => null),
      getSnapshotsForWeek(user.id, week).catch(() => []),
      fetchTagStats(user.id).catch(() => null),
    ])
      .then(([weeklyReport, snaps, tagStats]) => {
        setReport(weeklyReport)

        const safeTagStats = tagStats || { tagCounts: {}, lcWrong: 0, rcWrong: 0, totalWrong: 0 }
        setTotalWrong(Number(safeTagStats.totalWrong) || 0)
        const currentScore = calculateEstimatedScore({ lcWrong: safeTagStats.lcWrong, rcWrong: safeTagStats.rcWrong }, 100, 100)
        const currentTop3 = pickTopTags(safeTagStats.tagCounts, 3)

        const startSnap = (snaps || []).find((s) => s.snapshot_type === 'week_start') || null
        const endSnap = (snaps || []).find((s) => s.snapshot_type === 'week_end') || null

        // CASE1: 데이터 1개(또는 비교 불가) → 현재 상태 중심
        if (!startSnap || (!endSnap && !weeklyReport?.estimated_score_start)) {
          setBeta({
            mode: 'single',
            currentScore,
            startScore: null,
            scoreDelta: null,
            top3: currentTop3,
            top3Changes: null,
            comment: buildRuleComment({ topTag: currentTop3[0]?.tag, scoreDelta: null, hasCompare: false }),
            actions: buildNextActions(currentTop3),
          })
          return
        }

        // CASE2: 비교 가능(시작 스냅샷 vs 현재)
        const startScore = startSnap.estimated_score != null ? Number(startSnap.estimated_score) : null
        const scoreDelta = (startScore != null) ? currentScore - startScore : null

        const startTagCounts = (startSnap.tag_wrong_counts && typeof startSnap.tag_wrong_counts === 'object')
          ? startSnap.tag_wrong_counts
          : {}

        const top3Changes = currentTop3.map((t) => {
          const prev = Number(startTagCounts?.[t.tag]) || 0
          const delta = (t.count || 0) - prev
          const trend = delta < 0 ? 'down' : delta > 0 ? 'up' : 'same'
          return { ...t, prev, delta, trend }
        })

        setBeta({
          mode: 'compare',
          currentScore,
          startScore,
          scoreDelta,
          top3: currentTop3,
          top3Changes,
          comment: buildRuleComment({ topTag: currentTop3[0]?.tag, scoreDelta, hasCompare: true }),
          actions: buildNextActions(currentTop3),
        })
      })
      .finally(() => setLoading(false))
  }, [user?.id, week])

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
        <p className="text-gray-600">로그인이 필요해요.</p>
      </div>
    )
  }

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Week {week} 리포트</h1>
        <button type="button" onClick={() => navigate('/dashboard')} className="text-sm text-primary-600">
          대시보드
        </button>
      </div>

      {beta && (
        <div className="space-y-4">
          {/* 현재 상태 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">현재 상태</h2>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500">현재 예상 점수</p>
                <p className="text-xl font-bold text-gray-900">{beta.currentScore}점</p>
              </div>
              {beta.startScore != null && beta.mode === 'compare' && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">이번 구간 점수 변화</p>
                  <p className={`text-sm font-semibold ${beta.scoreDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {beta.startScore} → {beta.currentScore}{' '}
                    {beta.scoreDelta != null && `(${formatDelta(beta.scoreDelta)})`}
                  </p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">약점 TOP3 (가장 많이 틀린 태그)</p>
              {beta.top3.length ? (
                <ul className="space-y-1 text-sm text-gray-800">
                  {beta.top3.map((t, idx) => (
                    <li key={t.tag || idx} className="flex items-center justify-between">
                      <span>{idx + 1}. {t.tag}</span>
                      <span className="text-xs text-gray-400">{t.count}개</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">아직 약점 태그 데이터가 부족해요.</p>
              )}
            </div>
          </div>

          {/* 오늘 할 일 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">오늘 할 일</h2>
            <ul className="space-y-2">
              {beta.actions.map((a, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-gray-800">
                  <button
                    type="button"
                    className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-400 active:scale-95"
                  >
                    ✓
                  </button>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 하지 말 것 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">오늘 하지 말 것</h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {buildAvoidList(beta.top3).map((txt, idx) => (
                <li key={idx}>{txt}</li>
              ))}
            </ul>
          </div>

          {/* 변화 리포트: 오답 10개 이상일 때만 */}
          {totalWrong >= 10 && beta.mode === 'compare' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">변화 리포트</h2>
              <p className="text-xs text-gray-500 mb-2">
                이번 주 시작 대비 약점과 점수 변화를 요약했어요.
              </p>
              {beta.top3Changes && (
                <ul className="space-y-1 text-sm text-gray-800">
                  {beta.top3Changes.map((t) => (
                    <li key={t.tag} className="flex items-center justify-between">
                      <span>{t.tag}</span>
                      <span className="text-xs text-gray-500">
                        {t.trend === 'down' ? '↓' : t.trend === 'up' ? '↑' : '유지'}{' '}
                        {t.delta !== 0 ? `(${formatDelta(t.delta)})` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportPage
