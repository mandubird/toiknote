import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { fetchTagStats, calculateEstimatedScore } from '../services/fetchTagStats'

const PART_LABELS = { 1: 'Part 1', 2: 'Part 2', 3: 'Part 3', 4: 'Part 4', 5: 'Part 5', 6: 'Part 6', 7: 'Part 7' }
const CHART_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a']

const StatsPage = () => {
  const { user } = useAuth()
  const [tagStats, setTagStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTagStats(null)
      setLoading(false)
      return
    }
    fetchTagStats(user.id)
      .then(setTagStats)
      .catch(() => setTagStats(null))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) {
    return (
      <div className="p-4 flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    )
  }

  const totalWrong = tagStats?.totalWrong ?? 0
  const lcWrong = tagStats?.lcWrong ?? 0
  const rcWrong = tagStats?.rcWrong ?? 0
  const estimatedScore = totalWrong > 0 ? calculateEstimatedScore({ lcWrong, rcWrong }) : null

  const partChartData = tagStats
    ? [1, 2, 3, 4, 5, 6, 7]
        .map((p) => ({ name: PART_LABELS[p], value: tagStats.partCounts[p] || 0 }))
        .filter((d) => d.value > 0)
    : []

  const tagChartData = tagStats
    ? Object.entries(tagStats.tagCounts)
        .map(([name, value]) => ({ name, count: value }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    : []

  const lcPct = totalWrong > 0 ? Math.round((lcWrong / totalWrong) * 100) : 50
  const rcPct = totalWrong > 0 ? Math.round((rcWrong / totalWrong) * 100) : 50

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">학습 통계</h2>
        <p className="text-sm text-gray-600">나의 토익 학습 현황을 한눈에 확인하세요</p>
        {totalWrong > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            아래 통계는 <strong>저장한 오답 {totalWrong}개 기준</strong>으로 집계한 결과예요.
          </p>
        )}
        <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded px-2 py-1">
          자주 틀리는 포인트 TOP 3·AI 전략 추천은 유료 구독 시 이용할 수 있어요.
        </p>
      </div>

      {/* 추정 점수 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
        <p className="text-sm text-gray-600 mb-1">총 오답 수</p>
        <p className="text-4xl font-bold text-primary-600 mb-3">{totalWrong}개</p>
        {estimatedScore != null && totalWrong > 0 && (
          <>
            <p className="text-sm text-gray-600 mb-1">추정 점수 (오답 비율 기반)</p>
            <p className="text-3xl font-bold text-gray-900">{estimatedScore}점</p>
            <p className="text-xs text-gray-500 mt-1">
              저장한 오답 {totalWrong}개 기준, LC/RC 오답 비율로 산출한 참고용 점수예요.
            </p>
          </>
        )}
      </div>

      {/* Part별 오답 분포 (원형) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">파트별 오답 분포</h3>
        {totalWrong > 0 && (
          <p className="text-xs text-gray-500 mb-3">저장한 오답 {totalWrong}개 기준</p>
        )}
        {partChartData.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">아직 데이터가 없어요</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={partChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name} ${value}`}
              >
                {partChartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 취약 태그 TOP 5 (막대) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">취약 태그 TOP 5</h3>
        {tagChartData.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">아직 데이터가 없어요</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tagChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* LC vs RC */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">LC vs RC</h3>
        {totalWrong === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">아직 데이터가 없어요</p>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-700 w-16">LC</span>
              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden flex">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${lcPct}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-12">{lcWrong}개 ({lcPct}%)</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-700 w-16">RC</span>
              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden flex">
                <div
                  className="bg-primary-600 h-full"
                  style={{ width: `${rcPct}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-12">{rcWrong}개 ({rcPct}%)</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {rcPct > 60 ? 'RC 오답 비중이 커요. 독해 집중 훈련을 추천해요.' : lcPct > 60 ? 'LC 오답 비중이 커요. 청해 집중 훈련을 추천해요.' : 'LC/RC 균형을 맞춰 보세요.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatsPage
