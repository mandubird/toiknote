import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { fetchTagStats, calculateEstimatedScore } from '../services/fetchTagStats'
import { fetchSegmentStats } from '../services/fetchSegmentStats'
import { getSubscription } from '../services/subscription'
import { getUserProfile } from '../services/userProfile'
import MasteryBoard from '../components/MasteryBoard'

const PART_LABELS = { 1: 'Part 1', 2: 'Part 2', 3: 'Part 3', 4: 'Part 4', 5: 'Part 5', 6: 'Part 6', 7: 'Part 7' }
const CHART_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a']

const StatsPage = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('stats')
  const [tagStats, setTagStats] = useState(null)
  const [segmentStats, setSegmentStats] = useState(null)
  const [subscribed, setSubscribed] = useState(false)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTagStats(null)
      setSegmentStats(null)
      setSubscribed(false)
      setProfile(null)
      setLoading(false)
      return
    }
    Promise.all([fetchTagStats(user.id), fetchSegmentStats(user.id), getSubscription(user.id), getUserProfile(user.id)])
      .then(([tags, segments, sub, prof]) => {
        setTagStats(tags)
        setSegmentStats(segments)
        setSubscribed(sub.paid)
        setProfile(prof)
      })
      .catch(() => {
        setTagStats(null)
        setSegmentStats(null)
        setSubscribed(false)
        setProfile(null)
      })
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
  const currentScore = profile?.currentScore > 0 ? profile.currentScore : null
  // 오답 50개 이상일 때만 추정 점수 의미 있음 (그 이하면 심각하게 왜곡됨)
  const estimatedScore = totalWrong >= 50 ? calculateEstimatedScore({ lcWrong, rcWrong }) : null

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
      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F3F4F6', borderRadius: 12, padding: 4 }}>
        {[{ key: 'stats', label: '통계' }, { key: 'mastery', label: '약점 체크리스트' }].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 400,
              background: activeTab === tab.key ? '#fff' : 'transparent',
              color:      activeTab === tab.key ? '#1D4ED8' : '#6B7280',
              boxShadow:  activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 약점 체크리스트 탭 */}
      {activeTab === 'mastery' && (
        <MasteryBoard userId={user?.id} />
      )}

      {/* 통계 탭 */}
      {activeTab === 'stats' && <>
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

      {/* 현재 점수 + 오답 수 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">총 오답 수</p>
            <p className="text-4xl font-bold text-primary-600">{totalWrong}개</p>
          </div>
          {currentScore != null && (
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">입력한 현재 점수</p>
              <p className="text-3xl font-bold text-gray-900">{currentScore}점</p>
            </div>
          )}
        </div>
        {estimatedScore != null ? (
          <>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-sm text-gray-600 mb-1">오답 기반 추정 점수</p>
              <p className="text-2xl font-bold text-gray-700">{estimatedScore}점</p>
              <p className="text-xs text-gray-500 mt-1">
                저장한 오답 {totalWrong}개 기준, LC/RC 오답 비율로 산출한 참고용 점수예요.
              </p>
            </div>
          </>
        ) : totalWrong > 0 && (
          <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
            💡 오답을 50개 이상 기록하면 앱 기반 추정 점수를 계산할 수 있어요. (현재 {totalWrong}개)
          </p>
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

      {/* 세부 분석: 유료 전용 또는 블록들 */}
      {!subscribed && (segmentStats?.totalPart5 > 0 || segmentStats?.totalPart7 > 0 || segmentStats?.part2Pattern?.length > 0) && (
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 mb-4">
          <p className="text-sm font-medium text-amber-800">세부 문법·Part 7 유형·Part 2 패턴·시간 부족 분석은 유료 회원만 이용할 수 있어요.</p>
          <p className="text-xs text-amber-700 mt-1">설정에서 Pro/Elite 구독 후 이용해 보세요.</p>
        </div>
      )}

      {/* Part 5 문법 약점 (유료, 비율 표시) */}
      {subscribed && segmentStats?.part5Grammar?.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Part 5 문법 약점</h3>
          <p className="text-xs text-gray-500 mb-3">저장한 Part 5 오답 {segmentStats.totalPart5 || 0}개 기준 · 당신은 아래 유형에서 오답이 많아요</p>
          <ResponsiveContainer width="100%" height={Math.max(120, segmentStats.part5Grammar.length * 32)}>
            <BarChart
              data={segmentStats.part5Grammar.map((d) => {
                const totalPart5 = segmentStats.totalPart5 || 1
                const pct = Math.round((d.count / totalPart5) * 100)
                return { name: `${d.name} (${pct}%)`, nameRaw: d.name, count: d.count, pct }
              })}
              layout="vertical"
              margin={{ left: 8, right: 8 }}
            >
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value, name, props) => [`${value}개 (${props.payload.pct}%)`, '오답 수']} />
              <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Part 7 평균 풀이 시간 (유료) */}
      {subscribed && segmentStats?.avgPart7TimeSeconds != null && segmentStats.avgPart7TimeSeconds > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">Part 7 평균 풀이 시간</h3>
          <p className="text-2xl font-bold text-primary-600">
            {segmentStats.avgPart7TimeSeconds >= 60
              ? `${Math.floor(segmentStats.avgPart7TimeSeconds / 60)}분 ${segmentStats.avgPart7TimeSeconds % 60}초`
              : `${segmentStats.avgPart7TimeSeconds}초`}
          </p>
          <p className="text-xs text-gray-500 mt-1">풀이 시간을 입력한 Part 7 오답 기준 평균이에요.</p>
        </div>
      )}

      {/* Part 7 유형 (유료, 비율 표시) */}
      {subscribed && (segmentStats?.part7Passage?.length > 0 || segmentStats?.part7QuestionType?.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Part 7 유형별 오답</h3>
          <p className="text-xs text-gray-500 mb-3">지문/질문 유형별 집계</p>
          <p className="text-xs text-gray-500 mb-3">Part 7 오답 {segmentStats.totalPart7 || 0}개 기준</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {segmentStats.part7Passage?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">지문 유형</p>
                <ResponsiveContainer width="100%" height={Math.max(100, segmentStats.part7Passage.length * 28)}>
                  <BarChart
                    data={segmentStats.part7Passage.map((d) => {
                      const total = segmentStats.totalPart7 || 1
                      return { name: `${d.name} (${Math.round((d.count / total) * 100)}%)`, count: d.count }
                    })}
                    layout="vertical"
                    margin={{ left: 4, right: 4 }}
                  >
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {segmentStats.part7QuestionType?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">질문 유형</p>
                <ResponsiveContainer width="100%" height={Math.max(100, segmentStats.part7QuestionType.length * 28)}>
                  <BarChart
                    data={segmentStats.part7QuestionType.map((d) => {
                      const total = segmentStats.totalPart7 || 1
                      return { name: `${d.name} (${Math.round((d.count / total) * 100)}%)`, count: d.count }
                    })}
                    layout="vertical"
                    margin={{ left: 4, right: 4 }}
                  >
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1e40af" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Part 2 패턴 / 답 유형 (유료) */}
      {subscribed && (segmentStats?.part2Pattern?.length > 0 || segmentStats?.part2AnswerType?.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Part 2 패턴·답 유형</h3>
          <p className="text-xs text-gray-500 mb-3">질문 패턴/답 유형별 집계</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {segmentStats.part2Pattern?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">질문 패턴</p>
                <ul className="space-y-1">
                  {segmentStats.part2Pattern.slice(0, 6).map((d, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate mr-2">{d.name}</span>
                      <span className="font-medium text-gray-900">{d.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {segmentStats.part2AnswerType?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">답 유형</p>
                <ul className="space-y-1">
                  {segmentStats.part2AnswerType.slice(0, 6).map((d, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate mr-2">{d.name}</span>
                      <span className="font-medium text-gray-900">{d.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 시간 부족 비율 (유료) */}
      {subscribed && segmentStats && segmentStats.totalCount > 0 && segmentStats.timeoutCount > 0 && (
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 mb-4">
          <h3 className="font-semibold text-amber-900 mb-2">시간 부족으로 찍은 비율</h3>
          <p className="text-sm text-amber-800">
            전체 오답 <strong>{segmentStats.totalCount}개</strong> 중
            <strong> {segmentStats.timeoutCount}개</strong>(
            {Math.round((segmentStats.timeoutCount / segmentStats.totalCount) * 100)}%)가
            &quot;시간 부족으로 찍음&quot;으로 표시되었어요.
          </p>
          <p className="text-xs text-amber-700 mt-2">
            시간 관리 연습이나 문제 풀이 속도를 높이는 전략을 추천해요.
          </p>
        </div>
      )}

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
      </>}
    </div>
  )
}

export default StatsPage
