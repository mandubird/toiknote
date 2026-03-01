/**
 * v4.1: 주간 리포트 상세 /report/:weekNumber
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getWeeklyReports } from '../services/programService'
import { downloadWeeklyReportAsPdf } from '../services/weeklyReportPdf'

const ReportPage = () => {
  const { weekNumber } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const week = Math.max(1, Math.min(8, parseInt(weekNumber, 10) || 1))
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    getWeeklyReports(user.id)
      .then((reports) => (reports && reports.find((r) => r.week === week)) || null)
      .then(setReport)
      .catch(() => setReport(null))
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

      {!report ? (
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
