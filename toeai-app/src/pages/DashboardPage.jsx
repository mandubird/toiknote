/**
 * v4.1: 토답 900 점프 프로젝트 - 메인 대시보드
 * Day X/60 진행바, 현재/목표 점수, 이번 주 미션, 약점 TOP3, 점수 변화 그래프
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardSummary } from '../services/programService'

const DashboardPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setData(null)
      setLoading(false)
      return
    }
    getDashboardSummary(user.id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [user?.id])

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

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-bold text-gray-900 mb-4">토답 900 점프 프로젝트</h1>

      {!inProgram ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-700 mb-4">8주 프로그램을 시작하면 여기에 진행 상황이 표시돼요.</p>
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
            8주 프로그램 보기
          </button>
        </div>
      ) : (
        <>
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
                <p className="text-lg font-bold text-primary-700">{data.predicted_score ?? '-'}점</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">목표 점수</p>
                <p className="text-lg font-bold text-gray-800">{data.target_score ?? '-'}점</p>
              </div>
            </div>
          </div>

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

          {/* 약점 TOP 3 */}
          {data.weakness_top3?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-800 mb-3">AI 분석 약점 TOP 3</h3>
              <ul className="space-y-2">
                {data.weakness_top3.map((w, idx) => (
                  <li key={w.tag} className="flex items-center gap-2 text-sm">
                    <span>{idx + 1}️⃣</span>
                    <span className="font-medium text-gray-800">{w.tag}</span>
                    <span className="text-gray-500">(오답률 {w.rate}%)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 점수 변화 그래프 */}
          {data.score_history?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-800 mb-3">예상 점수 변화</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.score_history} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[600, 990]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}점`, '예상 점수']} />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              {data.score_history.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Week {data.current_week}: {data.predicted_score ?? '-'}점
                  {data.accuracy_change != null && data.accuracy_change > 0 && (
                    <span className="text-green-600 ml-1">(+{data.accuracy_change}%) ↗️</span>
                  )}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DashboardPage
