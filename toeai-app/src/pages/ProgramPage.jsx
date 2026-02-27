import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getProgramPlan,
  getWeeklyReports,
  startProgramV403,
  advanceToNextWeek,
} from '../services/programService'
import { isDiagnosticCompleted } from '../services/diagnosticService'
import { getSubscription } from '../services/subscription'
import { getScorePrediction, updateScorePrediction } from '../services/scorePredictionService'
import { downloadWeeklyReportAsPdf } from '../services/weeklyReportPdf'

const ProgramPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [reports, setReports] = useState([])
  const [diagnosticDone, setDiagnosticDone] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [scorePrediction, setScorePrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    if (!user) {
      setPlan(null)
      setReports([])
      setDiagnosticDone(false)
      setLoading(false)
      return
    }
    setError(null)
    try {
      const [p, r, done, sub] = await Promise.all([
        getProgramPlan(user.id),
        getWeeklyReports(user.id),
        isDiagnosticCompleted(user.id),
        getSubscription(user.id),
      ])
      setPlan(p)
      setReports(r || [])
      setDiagnosticDone(!!done)
      setSubscribed(!!sub.paid)
      if (sub.paid && p?.currentWeek >= 4) {
        const updated = await updateScorePrediction(user.id)
        setScorePrediction(updated || await getScorePrediction(user.id))
      } else {
        setScorePrediction(null)
      }
    } catch (e) {
      setError(e?.message || '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user?.id])

  const handleStart = async () => {
    if (!user) return
    setError(null)
    setStarting(true)
    try {
      await startProgramV403(user.id)
      await load()
    } catch (e) {
      setError(e?.message || '프로그램 시작에 실패했어요.')
    } finally {
      setStarting(false)
    }
  }

  const handleNextWeek = async () => {
    if (!user) return
    setError(null)
    setAdvancing(true)
    try {
      await advanceToNextWeek(user.id)
      await load()
    } catch (e) {
      setError(e?.message || '다음 주 진행에 실패했어요.')
    } finally {
      setAdvancing(false)
    }
  }

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
        <p className="text-gray-600">8주 프로그램을 사용하려면 로그인해 주세요.</p>
      </div>
    )
  }

  const currentPlan = plan?.plans?.find((p) => p.week === plan.currentWeek)
  const isActive = plan?.status === 'active'
  const currentWeek = plan?.currentWeek ?? 0
  const freeLimitReached = !subscribed && currentWeek > 2
  const canAdvance = isActive && currentWeek >= 1 && currentWeek < 8 && !freeLimitReached
  const showScorePrediction = subscribed && currentWeek >= 4 && scorePrediction

  return (
    <div className="p-4 pb-8">
      <h2 className="text-lg font-bold text-gray-800 mb-1">8주 프로그램</h2>
      <p className="text-sm text-gray-500 mb-4">
        진단 후 Week1부터 순차 진행해요. (무료: Week2까지 / Pro: Week8·PDF·점수예측)
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {plan?.status === 'none' && !diagnosticDone && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-gray-700 mb-4">
            <strong>진단 완료 전에는 Week1에 접근할 수 없어요.</strong> 먼저 정밀 진단을 진행해 주세요.
          </p>
          <button
            type="button"
            onClick={() => navigate('/diagnostic')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
          >
            진단 먼저 하기
          </button>
        </div>
      )}

      {plan?.status === 'none' && diagnosticDone && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-gray-700 mb-4">
            진단이 완료되었어요. <strong>고정 8주 구조</strong>(1–2 RC, 3–4 Part7, 5–6 LC, 7–8 실전)로 진행해요. 결제 후 Week1이 시작돼요.
          </p>
          {subscribed ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={starting}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {starting ? '시작 중…' : 'Week1 시작하기'}
            </button>
          ) : (
            <>
              <p className="text-sm text-amber-700 mb-3">8주 프로그램을 시작하려면 Pro 구독이 필요해요.</p>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
              >
                결제하고 Week1 시작하기
              </button>
            </>
          )}
        </div>
      )}

      {(plan?.status === 'active' || plan?.status === 'expired' || plan?.status === 'completed') && (
        <>
          {freeLimitReached && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              Week3부터는 <strong>Pro 구독</strong>이 필요해요. 설정에서 업그레이드할 수 있어요.
            </div>
          )}
          {showScorePrediction && (
            <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
              <p className="text-xs text-primary-600 font-medium">점수 예측 (Week4+)</p>
              <p className="text-lg font-bold text-primary-700">{scorePrediction.predicted_score}점</p>
              {scorePrediction.confidence_rate != null && (
                <p className="text-xs text-gray-600">신뢰도 약 {Math.round(scorePrediction.confidence_rate)}%</p>
              )}
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500">현재 주차</span>
              <span className="text-lg font-bold text-primary-600">
                {plan.currentWeek}주차 {plan.status === 'expired' && '(종료)'} {plan.status === 'completed' && '(완료)'}
              </span>
            </div>
            {currentPlan && (
              <>
                <p className="text-gray-700 text-sm mb-2">{currentPlan.strategy_text}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(currentPlan.focus_tags || []).map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Part {((currentPlan.focus_parts || [])).join(', ')} · 하루 권장 {currentPlan.daily_task_count}문항
                </p>
              </>
            )}
            {canAdvance && (
              <button
                type="button"
                onClick={handleNextWeek}
                disabled={advancing}
                className="mt-3 w-full py-2 border border-primary-600 text-primary-600 font-medium rounded-lg disabled:opacity-50"
              >
                {advancing ? '진행 중…' : '이 주 완료하고 다음 주로'}
              </button>
            )}
          </div>

          {reports.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <h3 className="px-4 py-3 font-medium text-gray-800 border-b border-gray-100">
                주간 리포트
              </h3>
              <ul className="divide-y divide-gray-100">
                {reports.map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-700">{r.week}주차</span>
                      <span className="flex items-center gap-2">
                        <span className="text-sm text-primary-600">
                          {r.estimated_score_end != null && `예상 ${r.estimated_score_end}점`}
                          {r.wrong_reduction_rate != null && (
                            <span className="text-green-600 ml-1">· 오답 {r.wrong_reduction_rate}%↓</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadWeeklyReportAsPdf(r)}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          PDF
                        </button>
                      </span>
                    </div>
                    {r.ai_feedback && (
                      <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap font-sans">{r.ai_feedback}</pre>
                    )}
                    {!r.ai_feedback && r.next_week_strategy && (
                      <p className="text-sm text-gray-600 mt-1">{r.next_week_strategy}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ProgramPage
