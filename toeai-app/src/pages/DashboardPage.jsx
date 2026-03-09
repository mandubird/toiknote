/**
 * v4.1 + v4.20: 대시보드 (진행바, 미션, 약점, 그래프, 추천 섹션, 뱃지)
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardSummary } from '../services/programService'
import { getReferralStats, getOrCreateReferralCode } from '../services/referralService'
import ReviewForm from '../components/ReviewForm'
import ExpiryWarningBanner from '../components/ExpiryWarningBanner'
import ExpiryModal from '../components/ExpiryModal'
import ScoreGaugeCard from '../components/ScoreGaugeCard'
import WeaknessRoadmapCard from '../components/WeaknessRoadmapCard'
import ScoreBandStrategyCard from '../components/ScoreBandStrategyCard'

const BADGE_INFO = { none: null, challenger: { emoji: '🥉', name: 'Challenger' }, elite: { emoji: '🥈', name: 'Elite' }, '900': { emoji: '🥇', name: '900 달성' } }

/**
 * #10 OneLineCoachAdvice: 약점 Top1 + 시간압박 여부로 40자 이내 한 줄 조언
 */
function buildOneLineAdvice(weaknesses) {
  if (!weaknesses?.length) return null
  const top = weaknesses[0]
  if (!top?.tag) return null
  if (top.hasTimePressure) {
    return `${top.tag} — 시간 압박 해소가 먼저. 풀이 속도부터 잡으세요`
  }
  const freq = top.frequencyWeight >= 1.6 ? '고빈출 ' : top.frequencyWeight >= 1.3 ? '빈출 ' : ''
  return `${freq}${top.tag} 집중 공략이 지금 점수 올릴 가장 빠른 길`
}

// 파트별 메타 정보
const PART_META = {
  1: { label: 'Part 1', name: '사진묘사', section: 'LC' },
  2: { label: 'Part 2', name: '질의응답', section: 'LC' },
  3: { label: 'Part 3', name: '짧은 대화', section: 'LC' },
  4: { label: 'Part 4', name: '설명문', section: 'LC' },
  5: { label: 'Part 5', name: '단문 공란', section: 'RC' },
  6: { label: 'Part 6', name: '장문 공란', section: 'RC' },
  7: { label: 'Part 7', name: '독해', section: 'RC' },
}

function getPartColor(wrong, cleared) {
  if (wrong === 0) return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', dot: 'bg-gray-300' }
  const remaining = wrong - cleared
  if (remaining === 0) return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-400' }
  if (remaining <= 5) return { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', dot: 'bg-yellow-400' }
  if (remaining <= 15) return { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-400' }
  return { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-400' }
}

function PartMapSection({ partCounts, clearedPerPart, onPartClick }) {
  const lcParts = [1, 2, 3, 4]
  const rcParts = [5, 6, 7]
  const totalWrong = Object.values(partCounts).reduce((s, v) => s + v, 0)
  const totalCleared = Object.values(clearedPerPart).reduce((s, v) => s + v, 0)

  const renderPart = (partNum) => {
    const meta = PART_META[partNum]
    const wrong = partCounts[partNum] ?? 0
    const cleared = clearedPerPart[partNum] ?? 0
    const color = getPartColor(wrong, cleared)
    const noData = wrong === 0

    return (
      <button
        key={partNum}
        type="button"
        onClick={() => onPartClick(partNum)}
        className={`flex items-center gap-2 p-2.5 rounded-lg border ${color.bg} ${color.border} text-left w-full transition-opacity active:opacity-70`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${noData ? 'text-gray-400 line-through' : color.text}`}>
            {meta.label}
          </p>
          <p className="text-xs text-gray-500 truncate">{meta.name}</p>
        </div>
        <div className="text-right shrink-0">
          {noData ? (
            <span className="text-xs text-gray-300">—</span>
          ) : (
            <>
              <p className={`text-xs font-bold ${color.text}`}>{wrong - cleared > 0 ? `${wrong - cleared}개` : '완료'}</p>
              {cleared > 0 && <p className="text-xs text-emerald-600">✓{cleared}</p>}
            </>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-800">📊 파트별 오답 지도</h3>
        {totalWrong > 0 && (
          <span className="text-xs text-gray-500">
            전체 {totalWrong}개 · 클리어 {totalCleared}개
          </span>
        )}
      </div>
      {totalWrong === 0 ? (
        <p className="text-sm text-gray-400 text-center py-2">오답이 없어요. 학습을 시작해보세요!</p>
      ) : (
        <div className="flex gap-3">
          {/* LC */}
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-600 mb-1.5">🎧 LC</p>
            <div className="space-y-1.5">
              {lcParts.map(renderPart)}
            </div>
          </div>
          {/* RC */}
          <div className="flex-1">
            <p className="text-xs font-medium text-violet-600 mb-1.5">📖 RC</p>
            <div className="space-y-1.5">
              {rcParts.map(renderPart)}
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2.5">
        <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />많음
        <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mx-1 ml-2" />조금
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mx-1 ml-2" />완료
        <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mx-1 ml-2" />없음
      </p>
    </div>
  )
}

const DashboardPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [referralStats, setReferralStats] = useState(null)
  const [referralCode, setReferralCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setData(null)
      setReferralStats(null)
      setReferralCode(null)
      setLoading(false)
      return
    }
    Promise.all([getDashboardSummary(user.id), getReferralStats(user.id)])
      .then(([d, r]) => {
        setData(d)
        setReferralStats(r)
      })
      .catch(() => { setData(null); setReferralStats(null) })
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || !referralStats) return
    getOrCreateReferralCode(user.id).then(setReferralCode)
  }, [user?.id, referralStats])

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
        <p className="text-gray-600">로그인하면 대시보드를 볼 수 있어요.</p>
      </div>
    )
  }

  const inProgram = data?.current_week >= 1
  const progressPercent = data?.days_total ? Math.min(100, (data.days_elapsed / data.days_total) * 100) : 0
  // #10 OneLineCoachAdvice
  const oneLineAdvice = buildOneLineAdvice(data?.weakness_top3)

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-bold text-gray-900 mb-4">토답 900 점프 프로젝트</h1>

      {!inProgram ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-700 mb-4">100일 프로젝트를 시작하면 여기에 진행 상황이 표시돼요.</p>
          <button
            type="button"
            onClick={() => navigate('/diagnostic')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
          >
            진단하고 시작하기
          </button>
          <button
            type="button"
            onClick={() => navigate('/program')}
            className="w-full mt-2 py-2 border border-gray-300 text-gray-700 rounded-lg"
          >
            100일 프로젝트 보기
          </button>
        </div>
      ) : (
        <>
          {referralStats?.badgeLevel && referralStats.badgeLevel !== 'none' && BADGE_INFO[referralStats.badgeLevel] && (
            <div className="mb-4 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
                <span>{BADGE_INFO[referralStats.badgeLevel].emoji}</span>
                <span>{BADGE_INFO[referralStats.badgeLevel].name}</span>
              </span>
            </div>
          )}

          <ExpiryModal programEndDate={data.programEndDate} programStatus={data.programStatus} />
          <ExpiryWarningBanner programEndDate={data.programEndDate} programStatus={data.programStatus} />

          {/* 상단: Day X/60 진행바 + 점수 */}
          <div className="bg-primary-50 rounded-xl border border-primary-100 p-4 mb-4">
            <p className="text-sm font-medium text-primary-800 mb-1">
              Day {data.days_elapsed} / {data.days_total}
            </p>
            <div className="h-2 bg-primary-200 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-primary-600 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500">현재 예상 점수</p>
                <p className="text-lg font-bold text-primary-700">
                  {data.predicted_score != null ? `${data.predicted_score}점` : '미입력'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">목표 점수</p>
                <p className="text-lg font-bold text-gray-800">
                  {data.target_score != null ? `${data.target_score}점` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* #10 OneLineCoachAdvice */}
          {oneLineAdvice && (
            <div className="bg-primary-600 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
              <span className="text-white text-base shrink-0">💬</span>
              <p className="text-sm font-medium text-white leading-snug">{oneLineAdvice}</p>
            </div>
          )}

          {/* #8 ScoreBandStrategyCard */}
          <ScoreBandStrategyCard currentScore={data.current_score} />

          {/* 이번 주 미션 카드 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded">Week {data.current_week}</span>
              <button
                type="button"
                onClick={() => navigate('/program')}
                className="text-sm text-primary-600 font-medium"
              >
                상세 →
              </button>
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">이번 주 목표</h3>
            <p className="text-gray-800 mb-4">{data.weekly_mission ?? '-'}</p>
            <button
              type="button"
              onClick={() => navigate('/program')}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
            >
              오늘 학습 시작 🎯
            </button>
          </div>

          {data.predicted_score != null ? (
            <ScoreGaugeCard
              currentScore={data.predicted_score}
              targetScore={data.target_score ?? 900}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm text-center">
              <p className="text-sm text-gray-500">오답을 찍으면 AI가 예상 점수를 계산해줘요 📸</p>
            </div>
          )}

          {/* 파트별 오답 지도 */}
          <PartMapSection
            partCounts={data.part_counts ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }}
            clearedPerPart={data.cleared_per_part ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }}
            onPartClick={(partNum) => navigate(`/home?part=${partNum}`)}
          />

          {/* #7 WeaknessRoadmapCard */}
          <WeaknessRoadmapCard weaknesses={data.weakness_top3} />

          {/* 점수 변화 그래프 */}
          {data.score_history?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-800 mb-3">예상 점수 변화</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.score_history} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    domain={[
                      (dataMin) => Math.max(0, Math.floor((dataMin - 50) / 50) * 50),
                      990,
                    ]}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v) => [`${v}점`, '예상 점수']} />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2">
                Week {data.current_week}: {data.predicted_score != null ? `${data.predicted_score}점` : '-'}
                {data.accuracy_change != null && data.accuracy_change > 0 && (
                  <span className="text-green-600 ml-1">(+{data.accuracy_change}%) ↗️</span>
                )}
              </p>
            </div>
          )}

          {/* v4.21: 후기 작성 */}
          <div className="mb-4">
            <ReviewForm userId={user.id} />
          </div>

          {/* v4.20: 친구 초대 섹션 */}
          {referralCode && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">🎁 친구 초대하고 보너스 받기</h3>
              <div className="mb-2 text-xs text-gray-600">
                <p>👥 1명 초대 시 +7일 · 🎯 3명 누적 시 +21일 추가</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-2">
                <code className="flex-1 truncate text-sm font-mono">{referralCode}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}?ref=${referralCode}`)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="shrink-0 rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  {copied ? '복사됨!' : '복사'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                초대한 친구: {referralStats?.referralCount ?? 0}명 · 받은 보너스: {referralStats?.bonusDays ?? 0}일
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DashboardPage
