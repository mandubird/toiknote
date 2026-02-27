import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getProgramPlan,
  getWeeklyReports,
  startPersonalizedProgram,
  advanceToNextWeek,
} from '../services/programService'
import { performCompleteDiagnosis } from '../services/diagnosisService'

const ProgramPage = () => {
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [reports, setReports] = useState([])
  const [diagnosis, setDiagnosis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    if (!user) {
      setPlan(null)
      setReports([])
      setDiagnosis(null)
      setLoading(false)
      return
    }
    setError(null)
    try {
      const [p, r, d] = await Promise.all([
        getProgramPlan(user.id),
        getWeeklyReports(user.id),
        performCompleteDiagnosis(user.id).catch(() => null),
      ])
      setPlan(p)
      setReports(r || [])
      setDiagnosis(d)
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
      await startPersonalizedProgram(user.id)
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
  const canAdvance = isActive && plan?.currentWeek >= 1 && plan?.currentWeek < 8

  return (
    <div className="p-4 pb-8">
      <h2 className="text-lg font-bold text-gray-800 mb-1">8주 프로그램</h2>
      <p className="text-sm text-gray-500 mb-4">
        점수 구간별 주차 학습 루틴과 주간 리포트로 진행해요.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {plan?.status === 'none' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          {diagnosis && (
            <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
              <p className="text-xs text-primary-600 font-medium mb-1">진단 결과</p>
              <p className="text-sm text-gray-800">
                {diagnosis.scoreRange} · {diagnosis.primaryWeakness || '약점 분석 중'}
              </p>
              {diagnosis.recommendedStrategy && (
                <p className="text-xs text-gray-600 mt-1">{diagnosis.recommendedStrategy}</p>
              )}
            </div>
          )}
          <p className="text-gray-700 mb-4">
            현재 오답·점수 기준으로 <strong>맞춤 8주 루틴</strong>을 만들고, 주차별 미션과 주간 리포트를 제공해요.
          </p>
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {starting ? '시작 중…' : '8주 프로그램 시작하기'}
          </button>
        </div>
      )}

      {(plan?.status === 'active' || plan?.status === 'expired') && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500">현재 주차</span>
              <span className="text-lg font-bold text-primary-600">
                {plan.currentWeek}주차 {plan.status === 'expired' && '(종료)'}
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
                      <span className="text-sm text-primary-600">
                        {r.estimated_score_end != null && `예상 ${r.estimated_score_end}점`}
                        {r.wrong_reduction_rate != null && (
                          <span className="text-green-600 ml-1">· 오답 {r.wrong_reduction_rate}%↓</span>
                        )}
                      </span>
                    </div>
                    {r.next_week_strategy && (
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
