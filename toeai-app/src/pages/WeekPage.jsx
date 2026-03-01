/**
 * v4.1: 주차별 학습 화면 /week/:weekNumber
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProgramPlan, getWeeklyReports } from '../services/programService'

const WeekPage = () => {
  const { weekNumber } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const week = Math.max(1, Math.min(8, parseInt(weekNumber, 10) || 1))
  const [plan, setPlan] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    Promise.all([getProgramPlan(user.id), getWeeklyReports(user.id)])
      .then(([p, reports]) => {
        setPlan(p)
        setReport(reports && reports.find((r) => r.week === week))
      })
      .catch(() => {})
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

  const currentPlan = plan && plan.plans && plan.plans.find((p) => p.week === week)
  const canAccess = plan && plan.currentWeek >= week

  if (!canAccess) {
    return (
      <div className="p-4">
        <p className="text-gray-600">Week {week}은 아직 진행 전이에요.</p>
        <button type="button" onClick={() => navigate('/dashboard')} className="mt-3 text-primary-600 font-medium">
          대시보드로
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Week {week} / 8</h1>
        <button type="button" onClick={() => navigate('/dashboard')} className="text-sm text-primary-600">
          대시보드
        </button>
      </div>

      {currentPlan && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <section>
            <h2 className="text-sm font-medium text-gray-500 mb-2">이번 주 집중 영역</h2>
            <p className="text-gray-800">{currentPlan.strategy_text}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {(currentPlan.focus_tags || []).map((t) => (
                <span key={t} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded">
                  {t}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Part {(currentPlan.focus_parts || []).join(', ')} · 하루 권장 {currentPlan.daily_task_count}문항
            </p>
          </section>

          {report && report.completion_rate != null && (
            <section>
              <h2 className="text-sm font-medium text-gray-500 mb-2">진행률</h2>
              <p className="text-gray-700">이번 주 완료율: {Math.round(Number(report.completion_rate))}%</p>
              <div className="h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full"
                  style={{ width: `${Math.min(100, Number(report.completion_rate) || 0)}%` }}
                />
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={() => navigate('/program')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
          >
            학습 시작
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('/report/' + week)}
        className="mt-4 w-full py-2 border border-gray-300 text-gray-700 rounded-lg"
      >
        Week {week} 리포트 보기
      </button>
    </div>
  )
}

export default WeekPage
