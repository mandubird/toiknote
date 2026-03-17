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
  actions.push(part7Hint ? 'Part 7 2지문 시간 제한 풀이 (단일 90초 / 복수 150초 기준)' : '오답 5문제 복습 후 “왜 틀렸는지” 한 줄로 요약')

  return actions.slice(0, 3)
}

const ReportPage = () => {
  const { weekNumber } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const week = Math.max(1, Math.min(8, parseInt(weekNumber, 10) || 1))
  const [report, setReport] = useState(null)
  const [beta, setBeta] = useState(null)
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

      {/* ── 베타 최소 리포트 (DB 추가 없이 화면에서 즉시 생성) ── */}
      {beta && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-4">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">이번 구간 요약</h2>
            {beta.mode === 'single' ? (
              <p className="text-sm text-gray-600">현재 상태 기준 리포트예요. 다음 구간부터 변화 리포트가 활성화돼요.</p>
            ) : (
              <p className="text-sm text-gray-600">시작 대비 현재 변화 기준 리포트예요.</p>
            )}
          </div>

          {/* ① 예상 점수 */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">예상 점수</h3>
            {beta.mode === 'single' || beta.startScore == null ? (
              <p className="text-lg font-bold text-gray-900">{beta.currentScore}점</p>
            ) : (
              <div className="flex items-end justify-between">
                <p className="text-lg font-bold text-gray-900">{beta.startScore} → {beta.currentScore}</p>
                {beta.scoreDelta != null && (
                  <p className={`text-sm font-semibold ${beta.scoreDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatDelta(beta.scoreDelta)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ② 약점 TOP3 */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">약점 TOP3</h3>
            {beta.mode === 'compare' && beta.top3Changes ? (
              <div className="space-y-2">
                {beta.top3Changes.map((t) => (
                  <div key={t.tag} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 font-medium">{t.tag}</span>
                    <span className="text-xs text-gray-500">
                      {t.trend === 'down' ? '↓' : t.trend === 'up' ? '↑' : '유지'}{' '}
                      {t.delta !== 0 ? `(${formatDelta(t.delta)})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-1 text-sm text-gray-800">
                {beta.top3.length ? beta.top3.map((t) => (
                  <li key={t.tag} className="flex items-center justify-between">
                    <span>• {t.tag}</span>
                    <span className="text-xs text-gray-400">{t.count}개</span>
                  </li>
                )) : (
                  <li className="text-gray-400">아직 약점 태그 데이터가 부족해요.</li>
                )}
              </ul>
            )}
          </div>

          {/* ③ AI 코멘트 (rule) */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">AI 코멘트</h3>
            <p className="text-sm text-gray-800">{beta.comment}</p>
          </div>

          {/* ④ 다음 액션 3개 */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">다음 구간 액션 3개</h3>
            <ul className="space-y-2">
              {beta.actions.map((a, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="text-primary-600 font-bold">{idx + 1}</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!report && !beta ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-600">이 주의 리포트가 아직 없어요.</p>
          <button type="button" onClick={() => navigate('/program')} className="mt-4 text-primary-600 font-medium">
            프로그램으로 이동
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-500 mb-3">이번 주 성과</h2>
            <ul className="space-y-2 text-sm">
              {report.accuracy_change != null && (
                <li className="flex justify-between">
                  <span>정확도 변화</span>
                  <span className={report.accuracy_change >= 0 ? 'text-green-600' : ''}>
                    {report.accuracy_change >= 0 ? '+' : ''}{report.accuracy_change}%
                  </span>
                </li>
              )}
              {report.part7_time_change != null && (
                <li className="flex justify-between">
                  <span>Part 7 시간</span>
                  <span>{report.part7_time_change >= 0 ? '+' : ''}{report.part7_time_change}초</span>
                </li>
              )}
              {report.estimated_score_end != null && (
                <li className="flex justify-between">
                  <span>예상 점수</span>
                  <span className="font-medium">
                    {report.estimated_score_start != null
                      ? report.estimated_score_start + ' → ' + report.estimated_score_end
                      : report.estimated_score_end + '점'}
                    {report.score_improvement != null && report.score_improvement > 0 && (
                      <span className="text-green-600 ml-1">(+{report.score_improvement})</span>
                    )}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {report.wrong_reduction_rate != null && (
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-500 mb-2">약점 변화</h2>
              <p className="text-sm text-gray-700">오답 감소율 {report.wrong_reduction_rate}%</p>
            </div>
          )}

          {report.ai_feedback && (
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-500 mb-2">다음 주 전략</h2>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{report.ai_feedback}</pre>
            </div>
          )}

          <div className="p-4 flex gap-2">
            <button
              type="button"
              onClick={() => downloadWeeklyReportAsPdf(report)}
              className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-lg"
            >
              PDF 다운로드
            </button>
            <button
              type="button"
              onClick={() => navigate('/program')}
              className="py-3 px-4 border border-gray-300 text-gray-700 rounded-lg"
            >
              프로그램
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportPage
