import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getProgramPlan,
  getWeeklyReports,
  startProgramV403,
  advanceToNextWeek,
  updateExamDate,
  buildCompressedPlan,
} from '../services/programService'
import { isDiagnosticCompleted } from '../services/diagnosticService'
import { getSubscription } from '../services/subscription'
import { getScorePrediction, updateScorePrediction } from '../services/scorePredictionService'
import { downloadWeeklyReportAsPdf } from '../services/weeklyReportPdf'

/**
 * v4.27: D-day → 압축 티어
 * 'none'    D-57 이상 (정상)
 * 'light'   D-35~56 (2주 블록, 4개 집중)
 * 'medium'  D-21~34 (3주 그룹, 3개 집중)
 * 'emergency' D-20 이내 (긴급 — 핵심 미션만)
 */
function getCompressionTier(dday) {
  if (dday === null || dday === undefined || dday > 56) return 'none'
  if (dday >= 35) return 'light'
  if (dday >= 21) return 'medium'
  return 'emergency'
}

const COMPRESSION_INFO = {
  light: {
    icon: '🤖',
    label: 'AI 압축 모드',
    getText: (dday, blockCount) =>
      `시험까지 ${dday}일 남았습니다. AI가 8주 플랜을 ${blockCount}개 집중 블록으로 최적화했습니다.`,
    color: 'bg-blue-50 border-blue-200 text-blue-800',
  },
  medium: {
    icon: '⚡',
    label: 'AI 압축 모드',
    getText: (dday, blockCount) =>
      `시험까지 ${dday}일 남았습니다. AI가 8주 플랜을 ${blockCount}개 집중 블록으로 압축했습니다.`,
    color: 'bg-orange-50 border-orange-200 text-orange-800',
  },
  emergency: {
    icon: '🚨',
    label: '긴급 집중 모드',
    getText: (dday) =>
      `시험까지 ${dday}일 — 핵심 약점 미션으로 전환했습니다. 가장 점수 영향이 큰 파트만 집중합니다.`,
    color: 'bg-red-50 border-red-200 text-red-800',
  },
}

// 오늘 기준 최소 날짜 (내일부터 선택 가능)
function getTomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// D-day 계산 (시험일까지 남은 날)
function calcDday(examDate) {
  if (!examDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(examDate)
  exam.setHours(0, 0, 0, 0)
  return Math.ceil((exam - today) / (1000 * 60 * 60 * 24))
}

// 프로그램 진행률 (%)
function calcProgress(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()
  if (now >= end) return 100
  if (now <= start) return 0
  return Math.round(((now - start) / (end - start)) * 100)
}

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
  const [examDateInput, setExamDateInput] = useState('')
  // 시험일 변경 (v4.27)
  const [examDateEdit, setExamDateEdit] = useState(false)
  const [newExamDateInput, setNewExamDateInput] = useState('')
  const [savingExamDate, setSavingExamDate] = useState(false)

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
    if (!examDateInput) {
      setError('시험일을 먼저 선택해 주세요.')
      return
    }
    setError(null)
    setStarting(true)
    try {
      await startProgramV403(user.id, examDateInput)
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

  const handleExamDateUpdate = async () => {
    if (!user || !newExamDateInput) return
    setError(null)
    setSavingExamDate(true)
    try {
      await updateExamDate(user.id, newExamDateInput)
      setExamDateEdit(false)
      setNewExamDateInput('')
      await load()
    } catch (e) {
      setError(e?.message || '시험일 변경에 실패했어요.')
    } finally {
      setSavingExamDate(false)
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
        <p className="text-gray-600">100일 프로젝트를 사용하려면 로그인해 주세요.</p>
      </div>
    )
  }

  const currentPlan = plan?.plans?.find((p) => p.week === plan.currentWeek)
  const isActive = plan?.status === 'active'
  const currentWeek = plan?.currentWeek ?? 0
  const freeLimitReached = !subscribed && currentWeek > 2
  const canAdvance = isActive && currentWeek >= 1 && currentWeek < 8 && !freeLimitReached
  const showScorePrediction = subscribed && currentWeek >= 4 && scorePrediction

  const dday = calcDday(plan?.examDate)
  const progress = calcProgress(plan?.programStartDate, plan?.programEndDate)
  const compressionTier = getCompressionTier(dday)

  // v4.27: 압축 뷰 모델 (compressionTier !== 'none' 일 때만 생성)
  const compressedBlocks = (compressionTier !== 'none' && plan?.plans?.length && plan?.examDate)
    ? buildCompressedPlan(plan.plans, plan.examDate)
    : null
  const currentBlock = compressedBlocks?.find((b) =>
    b.original_weeks.includes(plan?.currentWeek ?? 0)
  ) ?? compressedBlocks?.[0] ?? null

  return (
    <div className="p-4 pb-8">
      <h2 className="text-lg font-bold text-gray-800 mb-1">시험일 기준 전략 플랜</h2>
      {(!plan || plan?.status === 'none') && (
        <p className="text-sm text-gray-500 mb-4">
          시험일을 입력하면 AI가 맞춤 플랜을 만들어줘요.
        </p>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {plan?.status === 'none' && !diagnosticDone && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-gray-700 mb-4">
            <strong>진단을 완료해야 전략 플랜이 시작돼요.</strong> 먼저 정밀 진단을 진행해 주세요.
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
            진단이 완료되었어요. 시험일을 입력하면 맞춤 루틴이 시작돼요. <span className="text-gray-500 text-sm">(최대 100일)</span>
          </p>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">목표 시험일 <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={examDateInput}
              min={getTomorrowStr()}
              onChange={(e) => {
                setExamDateInput(e.target.value)
                setError(null)
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            />
            {examDateInput && (
              <p className="text-xs text-primary-600 mt-1">
                시험까지 {calcDday(examDateInput)}일 · 프로그램 기간 최대 100일
              </p>
            )}
          </div>

          {subscribed ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={starting || !examDateInput}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {starting ? '시작 중…' : 'D-day 프로젝트 시작하기'}
            </button>
          ) : (
            <>
              <p className="text-sm text-amber-700 mb-3">100일 프로젝트를 시작하려면 Pro 구독이 필요해요.</p>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
              >
                결제하고 시작하기
              </button>
            </>
          )}
        </div>
      )}

      {(plan?.status === 'active' || plan?.status === 'expired' || plan?.status === 'completed') && (
        <>
          {/* D-day 배너 */}
          {dday !== null && dday >= 0 && plan?.status === 'active' && (
            <div className="mb-2 p-4 bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs opacity-80 mb-0.5">토익 시험까지</p>
                  <p className="text-2xl font-bold">D-{dday}</p>
                  {plan?.examDate && (
                    <p className="text-xs opacity-70 mt-0.5">시험일: {plan.examDate}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewExamDateInput(plan?.examDate ?? '')
                    setExamDateEdit((v) => !v)
                    setError(null)
                  }}
                  className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg font-medium"
                >
                  {examDateEdit ? '✕ 취소' : '시험일 변경'}
                </button>
              </div>
              <div className="mt-2 bg-white/20 rounded-full h-1.5">
                <div
                  className="bg-white rounded-full h-1.5 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs opacity-70 mt-1">프로그램 진행률 {progress}%</p>
            </div>
          )}

          {/* 시험일 변경 인라인 폼 */}
          {examDateEdit && plan?.status === 'active' && (
            <div className="mb-2 p-3 bg-white border border-primary-200 rounded-xl shadow-sm">
              <p className="text-xs font-medium text-gray-600 mb-2">새 시험일을 선택하세요</p>
              <input
                type="date"
                value={newExamDateInput}
                min={getTomorrowStr()}
                onChange={(e) => setNewExamDateInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white mb-2"
              />
              {newExamDateInput && (
                <p className="text-xs text-primary-600 mb-2">
                  변경 후 D-{calcDday(newExamDateInput)}일 남음
                </p>
              )}
              <button
                type="button"
                onClick={handleExamDateUpdate}
                disabled={savingExamDate || !newExamDateInput}
                className="w-full py-2 bg-primary-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {savingExamDate ? '저장 중…' : '시험일 저장'}
              </button>
            </div>
          )}

          {/* 압축 모드 배너 (D-day 기반 자동 표시) */}
          {compressionTier !== 'none' && plan?.status === 'active' && (() => {
            const info = COMPRESSION_INFO[compressionTier]
            const blockCount = compressedBlocks?.length ?? 0
            return (
              <div className={`mb-4 p-3 border rounded-xl flex items-start gap-2 ${info.color}`}>
                <span className="text-lg leading-none mt-0.5">{info.icon}</span>
                <div>
                  <p className="text-xs font-bold mb-0.5">{info.label}</p>
                  <p className="text-xs">{info.getText(dday, blockCount)}</p>
                </div>
              </div>
            )
          })()}

          {dday !== null && dday < 0 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium text-center">
              시험 완료! 결과가 기대돼요 🎉
            </div>
          )}

          {showScorePrediction && (
            <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
              <p className="text-xs text-primary-600 font-medium">점수 예측</p>
              <p className="text-lg font-bold text-primary-700">{scorePrediction.predicted_score}점</p>
              {scorePrediction.confidence_rate != null && (
                <p className="text-xs text-gray-600">신뢰도 약 {Math.round(scorePrediction.confidence_rate)}%</p>
              )}
            </div>
          )}
          {freeLimitReached ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4 text-center">
              <p className="text-base font-bold text-amber-800 mb-1">전체 플랜은 Pro 전용이에요</p>
              <p className="text-sm text-amber-700 mb-4">
                Pro로 업그레이드하면 전체 전략 플랜 + PDF 리포트 + 점수 예측까지 이용할 수 있어요.
              </p>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="w-full py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 active:scale-95 transition"
              >
                Pro로 업그레이드하기
              </button>
            </div>
          ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            {compressedBlocks && currentBlock ? (
              /* ── 압축 모드 ── */
              <>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">현재 집중 블록</p>
                    <p className="text-lg font-bold text-primary-600">{currentBlock.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {currentBlock.duration_days}일 집중 구간
                    </p>
                  </div>
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-medium shrink-0">
                    AI 압축
                  </span>
                </div>
                {currentBlock.strategy_text && (
                  <p className="text-gray-700 text-sm mb-2">{currentBlock.strategy_text}</p>
                )}
                {currentBlock.focus_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {currentBlock.focus_tags.slice(0, 5).map((t) => (
                      <span key={t} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {currentBlock.focus_parts?.length > 0 && `Part ${currentBlock.focus_parts.join(', ')} · `}
                  하루 권장{' '}
                  <span className="font-semibold text-primary-700">{currentBlock.daily_task_count}문항</span>
                  <span className="text-gray-400"> (cap 적용)</span>
                </p>

                {/* 블록 타임라인 */}
                {compressedBlocks.length > 1 && (
                  <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
                    {compressedBlocks.map((block, idx) => {
                      const maxWeek = Math.max(...block.original_weeks)
                      const isDone = (plan?.currentWeek ?? 0) > maxWeek
                      const isCurrent = block.block_id === currentBlock.block_id
                      return (
                        <div key={block.block_id} className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                                ${isCurrent ? 'bg-primary-600 text-white ring-2 ring-primary-300' : isDone ? 'bg-emerald-400 text-white' : 'bg-gray-200 text-gray-400'}`}
                            >
                              {isDone ? '✓' : block.block_id}
                            </div>
                            <span className={`text-[10px] mt-0.5 ${isCurrent ? 'text-primary-600 font-semibold' : 'text-gray-400'}`}>
                              {block.label.replace('집중 ', '')}
                            </span>
                          </div>
                          {idx < compressedBlocks.length - 1 && (
                            <div className="w-6 h-px bg-gray-300 mb-3" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              /* ── 일반 모드 ── */
              <>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-500">현재 플랜</span>
                  <span className="text-sm font-medium text-primary-600">
                    {plan.status === 'expired' ? '종료' : plan.status === 'completed' ? '완료' : '진행 중'}
                  </span>
                </div>
                {currentPlan && (
                  <>
                    <p className="text-gray-700 text-sm mb-2">{currentPlan.strategy_text}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(currentPlan.focus_tags || []).map((t) => (
                        <span key={t} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Part {(currentPlan.focus_parts || []).join(', ')} · 하루 권장 {currentPlan.daily_task_count}문항
                    </p>
                  </>
                )}
              </>
            )}

            {canAdvance && (
              <button
                type="button"
                onClick={handleNextWeek}
                disabled={advancing}
                className="mt-3 w-full py-2 border border-primary-600 text-primary-600 font-medium rounded-lg disabled:opacity-50"
              >
                {advancing ? '진행 중…' : '이 구간 완료하고 다음으로'}
              </button>
            )}
          </div>
          )}

          {reports.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <h3 className="px-4 py-3 font-medium text-gray-800 border-b border-gray-100">
                주간 리포트
              </h3>
              <ul className="divide-y divide-gray-100">
                {reports.map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-700">구간 {r.week}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-sm text-primary-600">
                          {r.estimated_score_end != null && `예상 ${r.estimated_score_end}점`}
                          {r.wrong_reduction_rate != null && (
                            <span className="text-green-600 ml-1">· 오답 {r.wrong_reduction_rate}%↓</span>
                          )}
                          {r.cleared_count > 0 && (
                            <span className="text-emerald-600 ml-1">· 클리어 {r.cleared_count}문제</span>
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
