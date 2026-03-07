import { supabase } from '../lib/supabase'
import { fetchTagStats, calculateEstimatedScore } from './fetchTagStats'
import { getUserProfile } from './userProfile'
import { performCompleteDiagnosis, getScoreRange } from './diagnosisService'
import { createWeekStartSnapshot, createWeekEndSnapshot, getSnapshotsForWeek } from './snapshotService'
import { getTop10WeakTags } from './tagStatsService.js'
import { generateAICoachComment } from './aiCoachService.js'
import { countClearedThisWeek } from './clearWrongAnswer.js'

/** 점수 구간 라벨 (계획서: 600 이하는 제외, 700-800 / 800-900 템플릿만 사용) */
const BAND_700_800 = '700-800'
const BAND_800_900 = '800-900'

// v4.24: Supabase 프로젝트에 아직 user_program_plans 테이블이 없을 때
// 8주 프로그램 기능이 전체가 깨지는 것을 방지하기 위한 헬퍼
function isMissingUserProgramPlansTableError(error) {
  if (!error) return false
  const msg = `${error.message || ''} ${error.details || ''}`.toLowerCase()
  return (
    msg.includes('user_program_plans') &&
    (msg.includes('could not find the table') || msg.includes('does not exist'))
  )
}

/**
 * 추정 점수로 8주 프로그램 대상 구간 반환
 * @param {number} estimatedScore
 * @returns {'700-800'|'800-900'}
 */
export function getScoreBand(estimatedScore) {
  const s = Number(estimatedScore) || 0
  if (s >= 800) return BAND_800_900
  return BAND_700_800
}

/**
 * 프로그램 시작: 사용자 점수 구간 결정 → 템플릿으로 user_program_plans 8주 생성 → users 프로그램 필드 갱신
 * @param {string} userId
 * @returns {Promise<{ targetRange: string, currentWeek: number }>}
 */
export async function startProgram(userId) {
  if (!userId) throw new Error('로그인이 필요해요.')

  const [profile, tagStats] = await Promise.all([
    getUserProfile(userId),
    fetchTagStats(userId),
  ])
  const estimated = profile.currentScore > 0
    ? profile.currentScore
    : calculateEstimatedScore(tagStats, 100, 100)
  const targetRange = getScoreBand(estimated)

  const { data: templates, error: te } = await supabase
    .from('program_templates')
    .select('id, week, focus_tags, focus_parts, daily_task_count, strategy_text')
    .eq('target_range', targetRange)
    .order('week', { ascending: true })

  if (te || !templates?.length) throw new Error('해당 구간 템플릿을 불러올 수 없어요.')

  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 56)

  const plans = templates.map((t) => ({
    user_id: userId,
    week: t.week,
    focus_tags: t.focus_tags || [],
    focus_parts: t.focus_parts || [],
    daily_task_count: t.daily_task_count ?? 20,
    strategy_text: t.strategy_text || '',
  }))

  const { error: insertErr } = await supabase.from('user_program_plans').upsert(plans, {
    onConflict: 'user_id,week',
  })
  if (insertErr) {
    if (isMissingUserProgramPlansTableError(insertErr)) {
      console.warn('[startProgram] user_program_plans 테이블이 없어 계획 저장을 건너뜁니다.')
    } else {
      throw insertErr
    }
  }

  const { error: userErr } = await supabase
    .from('users')
    .update({
      program_status: 'active',
      program_start_date: startDate.toISOString(),
      program_end_date: endDate.toISOString(),
      current_week: 1,
      last_week_update: startDate.toISOString(),
    })
    .eq('id', userId)
  if (userErr) throw userErr

  await createWeekStartSnapshot(userId, 1).catch(() => {})
  return { targetRange, currentWeek: 1 }
}

/** v4.03: 고정 8주 구조 (1-2 RC, 3-4 Part7, 5-6 LC, 7-8 실전) */
const V403_FIXED_WEEKS = [
  { week: 1, focus_parts: [5, 6, 7], focus_tags: ['시제', '수일치', '관계대명사'], daily_task_count: 20, strategy_text: 'RC 집중 1주차: Part 5·6·7 기초' },
  { week: 2, focus_parts: [5, 6, 7], focus_tags: ['접속사', '전치사', '문맥'], daily_task_count: 25, strategy_text: 'RC 집중 2주차: 문법·문맥 완성' },
  { week: 3, focus_parts: [7], focus_tags: ['단일지문', '추론'], daily_task_count: 15, strategy_text: 'Part7 집중 1주차: 단일지문 속도' },
  { week: 4, focus_parts: [7], focus_tags: ['이중지문', '삼중지문', 'Paraphrasing'], daily_task_count: 15, strategy_text: 'Part7 집중 2주차: 복수지문' },
  { week: 5, focus_parts: [2, 3], focus_tags: ['우회답변', '세부정보'], daily_task_count: 25, strategy_text: 'LC 집중 1주차: Part 2·3' },
  { week: 6, focus_parts: [1, 4], focus_tags: ['함정', '추론'], daily_task_count: 20, strategy_text: 'LC 집중 2주차: Part 1·4' },
  { week: 7, focus_parts: [1, 2, 3, 4, 5, 6, 7], focus_tags: ['모의고사'], daily_task_count: 40, strategy_text: '실전 시뮬레이션' },
  { week: 8, focus_parts: [5, 7], focus_tags: ['약점 집중'], daily_task_count: 25, strategy_text: '점수 예측 + 최종 전략' },
]

const MAX_PROGRAM_DAYS = 100 // v4.26: 100일 프로젝트 최대값

/**
 * v4.26: 진단 완료 후 Week1 시작 (시험일 기반 100일 프로젝트)
 * @param {string} userId
 * @param {string|null} examDate - 'YYYY-MM-DD' 형식. 없으면 100일로 자동 설정
 */
export async function startProgramV403(userId, examDate = null) {
  if (!userId) throw new Error('로그인이 필요해요.')

  const plans = V403_FIXED_WEEKS.map((p) => ({
    user_id: userId,
    week: p.week,
    focus_tags: p.focus_tags || [],
    focus_parts: p.focus_parts || [],
    daily_task_count: p.daily_task_count ?? 20,
    strategy_text: p.strategy_text || '',
  }))

  const { error: insertErr } = await supabase.from('user_program_plans').upsert(plans, {
    onConflict: 'user_id,week',
  })
  if (insertErr) {
    if (isMissingUserProgramPlansTableError(insertErr)) {
      console.warn('[startProgramV403] user_program_plans 테이블이 없어 계획 저장을 건너뜁니다.')
    } else {
      throw insertErr
    }
  }

  const { data: userRow } = await supabase.from('users').select('bonus_days').eq('id', userId).maybeSingle()
  const bonusDays = Math.min(30, Math.max(0, Number(userRow?.bonus_days) || 0))

  const startDate = new Date()
  const maxEndDate = new Date(startDate)
  maxEndDate.setDate(maxEndDate.getDate() + MAX_PROGRAM_DAYS + bonusDays)

  // 시험일이 있으면 min(시험일, 오늘+100일) 적용
  let endDate = maxEndDate
  let parsedExamDate = null
  if (examDate) {
    parsedExamDate = new Date(examDate)
    parsedExamDate.setHours(23, 59, 59, 0)
    if (parsedExamDate < maxEndDate) {
      endDate = parsedExamDate
    }
  }

  const updatePayload = {
    program_status: 'active',
    program_start_date: startDate.toISOString(),
    program_end_date: endDate.toISOString(),
    current_week: 1,
    last_week_update: startDate.toISOString(),
  }
  if (parsedExamDate) {
    updatePayload.exam_date = examDate // 'YYYY-MM-DD'
  }

  const { error: userErr } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', userId)
  if (userErr) throw userErr

  await createWeekStartSnapshot(userId, 1).catch(() => {})

  // 약점 태그 기반 주차별 태그 배정 (v4.24)
  buildWeeklyTagPlans(userId)
    .then((tagPlans) => saveWeeklyTagPlans(userId, tagPlans))
    .catch(() => {})

  return { currentWeek: 1 }
}

/** v4.02: 약점 유형 → 포커스 태그 배열 */
function getTagsForWeakness(weakness) {
  const map = {
    '이중/삼중지문 시간': ['이중지문', '삼중지문', '시간 관리'],
    '관계대명사/접속사': ['관계대명사', '접속사'],
    '추론/Paraphrasing': ['추론', 'Paraphrasing'],
    '시제/수일치/품사': ['시제', '수일치', '품사'],
    '연결어/문장삽입': ['연결어', '문장삽입'],
    '시간 부족': ['시간 관리', '단일지문'],
    'Part 5 전반': ['시제', '관계대명사', '품사'],
    'Part 7 복수지문': ['이중지문', '삼중지문'],
    'Part 7 고난도 추론': ['추론', 'Paraphrasing'],
    '실수 제거': ['실수 유형', '시간 관리'],
  }
  return map[weakness] || [weakness]
}

/**
 * v4.02: 약점 기반 8주 루틴 자동 생성 후 user_program_plans에 저장
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function generatePersonalizedProgram(userId) {
  const diagnosis = await performCompleteDiagnosis(userId)
  if (!diagnosis) throw new Error('진단 결과를 불러올 수 없어요.')

  const prioritized = (diagnosis.confirmedWeaknesses || []).slice(0, 3)
  const program = []

  if (prioritized.length >= 1) {
    const w1 = prioritized[0]
    program.push(
      { week: 1, focus_parts: [w1.part], focus_tags: getTagsForWeakness(w1.patternWeakness), daily_task_count: 25, strategy_text: `${w1.patternWeakness} 집중 공략 (1순위 약점)` },
      { week: 2, focus_parts: [w1.part], focus_tags: getTagsForWeakness(w1.patternWeakness), daily_task_count: 30, strategy_text: `${w1.patternWeakness} 완성 주차` }
    )
  }
  if (prioritized.length < 2 && program.length > 0) {
    program.push(
      { week: 3, focus_parts: [5, 6], focus_tags: ['관계대명사', '접속사'], daily_task_count: 25, strategy_text: 'Part 5/6 연계 훈련' },
      { week: 4, focus_parts: [7], focus_tags: ['단일지문', '이중지문'], daily_task_count: 20, strategy_text: 'Part 7 속도 향상' }
    )
  }
  if (prioritized.length >= 2) {
    const w2 = prioritized[1]
    program.push(
      { week: 3, focus_parts: [w2.part], focus_tags: getTagsForWeakness(w2.patternWeakness), daily_task_count: 25, strategy_text: `${w2.patternWeakness} 집중 (2순위)` },
      { week: 4, focus_parts: [w2.part], focus_tags: getTagsForWeakness(w2.patternWeakness), daily_task_count: 30, strategy_text: `${w2.patternWeakness} 완성` }
    )
  }
  if (prioritized.length >= 3) {
    const w3 = prioritized[2]
    program.push({ week: 5, focus_parts: [w3.part], focus_tags: getTagsForWeakness(w3.patternWeakness), daily_task_count: 25, strategy_text: `${w3.patternWeakness} 집중 (3순위)` })
  }
  const filled = program.length
  if (filled < 5) program.push({ week: 5, focus_parts: [5, 6, 7], focus_tags: ['전체 균형'], daily_task_count: 30, strategy_text: '균형 훈련 주차' })
  program.push(
    { week: 6, focus_parts: [4, 7], focus_tags: ['추론', '시간 관리'], daily_task_count: 25, strategy_text: 'LC Part 4 + Part 7 속도' },
    { week: 7, focus_parts: [1, 2, 3, 4, 5, 6, 7], focus_tags: ['모의고사'], daily_task_count: 40, strategy_text: '실전 모의고사 집중' },
    { week: 8, focus_parts: prioritized.length ? [...new Set(prioritized.map((w) => w.part))] : [5, 7], focus_tags: prioritized.length ? prioritized.map((w) => w.patternWeakness) : ['약점 집중'], daily_task_count: 25, strategy_text: '최종 약점 제거 + 멘탈 관리' }
  )

  const plans = program.map((p) => ({
    user_id: userId,
    week: p.week,
    focus_tags: p.focus_tags || [],
    focus_parts: p.focus_parts || [],
    daily_task_count: p.daily_task_count ?? 20,
    strategy_text: p.strategy_text || '',
  }))

  const { error } = await supabase.from('user_program_plans').upsert(plans, {
    onConflict: 'user_id,week',
  })
  if (error) {
    if (isMissingUserProgramPlansTableError(error)) {
      console.warn('[generatePersonalizedProgram] user_program_plans 테이블이 없어 계획 저장을 건너뜁니다.')
    } else {
      throw error
    }
  }
  return plans
}

/**
 * v4.02: 맞춤 루틴으로 프로그램 시작 (약점 없으면 템플릿 사용)
 * @param {string} userId
 */
export async function startPersonalizedProgram(userId) {
  if (!userId) throw new Error('로그인이 필요해요.')
  const diagnosis = await performCompleteDiagnosis(userId)
  const hasWeaknesses = diagnosis?.confirmedWeaknesses?.length >= 1

  if (hasWeaknesses) {
    await generatePersonalizedProgram(userId)
  } else {
    await startProgram(userId)
  }

  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 56)

  const { error } = await supabase
    .from('users')
    .update({
      program_status: 'active',
      program_start_date: startDate.toISOString(),
      program_end_date: endDate.toISOString(),
      current_week: 1,
      last_week_update: startDate.toISOString(),
    })
    .eq('id', userId)
  if (error) throw error

  await createWeekStartSnapshot(userId, 1).catch(() => {})
  return { targetRange: diagnosis?.scoreRange || getScoreRange(diagnosis?.estimatedScore || 700), currentWeek: 1, personalized: hasWeaknesses }
}

/**
 * 사용자 프로그램 상태 + 주차별 계획 조회
 * @param {string} userId
 */
export async function getProgramPlan(userId) {
  if (!userId) return { status: 'none', currentWeek: 0, plans: [], userProgram: null }

  const [
    { data: userRow },
    { data: plans },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('program_status, program_start_date, program_end_date, current_week, last_week_update, exam_date')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('user_program_plans')
      .select('*')
      .eq('user_id', userId)
      .order('week', { ascending: true }),
  ])

  const status = userRow?.program_status || 'none'
  const currentWeek = Math.min(8, Math.max(0, Number(userRow?.current_week) || 0))

  return {
    status,
    currentWeek,
    programStartDate: userRow?.program_start_date ?? null,
    programEndDate: userRow?.program_end_date ?? null,
    lastWeekUpdate: userRow?.last_week_update ?? null,
    examDate: userRow?.exam_date ?? null,
    plans: plans || [],
    userProgram: userRow,
  }
}

const DAYS_TOTAL = 100

/**
 * v4.04 + v4.1: 대시보드 요약 (코칭 화면·60일 진행바·약점 TOP3·점수 이력)
 * @param {string} userId
 */
export async function getDashboardSummary(userId) {
  const empty = {
    current_week: 0,
    predicted_score: null,
    target_score: null,
    weekly_mission: null,
    accuracy_change: null,
    part7_time_change: null,
    days_elapsed: 0,
    days_total: DAYS_TOTAL,
    programStartDate: null,
    programEndDate: null,
    weakness_top3: [],
    score_history: [],
  }
  if (!userId) return empty

  const [plan, reports, profile, { data: scorePred }, tagStats, top10Weak, { data: clearedRows }] = await Promise.all([
    getProgramPlan(userId),
    getWeeklyReports(userId),
    getUserProfile(userId),
    supabase.from('score_prediction').select('predicted_score').eq('user_id', userId).maybeSingle(),
    fetchTagStats(userId),
    getTop10WeakTags(userId).catch(() => []),
    supabase.from('wrong_answers').select('part_number').eq('user_id', userId).not('cleared_at', 'is', null),
  ])

  // 파트별 클리어 수 집계
  const clearedPerPart = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }
  if (clearedRows) {
    clearedRows.forEach((row) => {
      const p = Number(row.part_number)
      if (p >= 1 && p <= 7) clearedPerPart[p] = (clearedPerPart[p] || 0) + 1
    })
  }

  const currentPlan = plan?.plans?.find((p) => p.week === plan.currentWeek)
  const lastReport = reports?.length ? reports[reports.length - 1] : null

  let daysElapsed = 0
  if (plan?.programStartDate) {
    const start = new Date(plan.programStartDate)
    const end = plan.programEndDate ? new Date(plan.programEndDate) : new Date()
    daysElapsed = Math.min(DAYS_TOTAL, Math.max(0, Math.floor((end - start) / (24 * 60 * 60 * 1000))))
  }

  const totalWrong = tagStats?.totalWrong || 1
  const weaknessTop3 =
    Array.isArray(top10Weak) && top10Weak.length > 0
      ? top10Weak.slice(0, 3).map((t) => ({
          tag: t.tagName,
          count: t.attemptCount,
          rate: Math.round((1 - t.accuracyRate) * 1000) / 10,
        }))
      : Object.entries(tagStats?.tagCounts || {})
          .map(([tag, count]) => ({ tag, count, rate: Math.round((Number(count) / totalWrong) * 1000) / 10 }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)

  const scoreHistory = (reports || []).map((r) => ({
    week: r.week,
    score: r.estimated_score_end ?? null,
    label: `Week ${r.week}`,
  })).filter((d) => d.score != null)

  return {
    current_week: plan?.currentWeek ?? 0,
    predicted_score: scorePred?.predicted_score ?? null,
    target_score: profile?.targetScore ?? null,
    weekly_mission: currentPlan?.strategy_text ?? null,
    accuracy_change: lastReport?.accuracy_change ?? null,
    part7_time_change: lastReport?.part7_time_change ?? null,
    days_elapsed: daysElapsed,
    days_total: DAYS_TOTAL,
    programStartDate: plan?.programStartDate ?? null,
    programEndDate: plan?.programEndDate ?? null,
    programStatus: plan?.status ?? 'none',
    weakness_top3: weaknessTop3,
    score_history: scoreHistory,
    part_counts: tagStats?.partCounts ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
    cleared_per_part: clearedPerPart,
  }
}

/**
 * 주간 리포트 목록 조회
 * @param {string} userId
 */
export async function getWeeklyReports(userId) {
  if (!userId) return []
  const { data } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('user_id', userId)
    .order('week', { ascending: true })
  return data || []
}

/**
 * 현재 주차 계획 1건 조회
 * @param {string} userId
 */
export async function getCurrentWeekPlan(userId) {
  const { plans, currentWeek } = await getProgramPlan(userId)
  const plan = plans?.find((p) => p.week === currentWeek)
  return plan ?? null
}

/**
 * 주간 리포트 생성: 스냅샷 있으면 오답 감소율·정확도 변화 반영, 없으면 기본 저장
 * @param {string} userId
 * @param {number} week
 */
export async function generateWeeklyReport(userId, week) {
  if (!userId || week < 1 || week > 8) return null

  const snapshots = await getSnapshotsForWeek(userId, week)
  const startSnap = snapshots?.find((s) => s.snapshot_type === 'week_start')
  const endSnap = snapshots?.find((s) => s.snapshot_type === 'week_end')

  const [{ data: plans }, tagStats] = await Promise.all([
    supabase.from('user_program_plans').select('strategy_text').eq('user_id', userId).order('week', { ascending: true }),
    fetchTagStats(userId),
  ])
  const estimatedScoreEnd = calculateEstimatedScore(tagStats, 100, 100)
  const nextPlan = plans?.find((p) => p.week === week + 1)
  const nextWeekStrategy = nextPlan?.strategy_text ?? null

  // 이번 주 클리어한 오답 수 집계 (스냅샷 기준 날짜)
  const weekStart = startSnap?.created_at
    ? new Date(startSnap.created_at)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const weekEnd = new Date()
  const clearedThisWeek = await countClearedThisWeek(userId, weekStart, weekEnd).catch(() => 0)

  let payload = {
    user_id: userId,
    week,
    estimated_score_start: null,
    estimated_score_end: estimatedScoreEnd,
    score_improvement: null,
    accuracy_change: null,
    part7_time_change: null,
    weak_tags_improvement: {},
    wrong_reduction_rate: null,
    wrong_reduction_count: null,
    next_week_strategy: nextWeekStrategy,
    completion_rate: null,
    ai_feedback: null,
    cleared_count: clearedThisWeek,
  }

  if (startSnap && endSnap) {
    const startWrong = Number(startSnap.total_wrong) || 0
    const endWrong = Number(endSnap.total_wrong) || 0
    const reductionCount = startWrong - endWrong
    const wrongReductionRate = startWrong > 0 ? Math.round((reductionCount / startWrong) * 1000) / 10 : null
    const accuracyStart = startSnap.accuracy_rate != null ? Number(startSnap.accuracy_rate) : null
    const accuracyEnd = endSnap.accuracy_rate != null ? Number(endSnap.accuracy_rate) : null
    const part7Start = startSnap.part_avg_time && typeof startSnap.part_avg_time === 'object' ? startSnap.part_avg_time['7'] : null
    const part7End = endSnap.part_avg_time && typeof endSnap.part_avg_time === 'object' ? endSnap.part_avg_time['7'] : null
    const part7Change = part7Start != null && part7End != null ? part7End - part7Start : null
    const tagImprovement = {}
    const startTags = startSnap.tag_wrong_counts && typeof startSnap.tag_wrong_counts === 'object' ? startSnap.tag_wrong_counts : {}
    Object.keys(startTags).forEach((tag) => {
      const s = Number(startTags[tag]) || 0
      const e = Number((endSnap.tag_wrong_counts && endSnap.tag_wrong_counts[tag]) || 0)
      tagImprovement[tag] = { start: s, end: e, reduction: s - e }
    })
    const accuracyChangeVal = accuracyStart != null && accuracyEnd != null
      ? Math.round((accuracyEnd - accuracyStart) * 10) / 10
      : 0
    const part7ChangeVal = part7Change ?? 0
    const estimatedScoreEndVal = endSnap.estimated_score != null ? Number(endSnap.estimated_score) : estimatedScoreEnd
    const estimatedScoreStartVal = startSnap.estimated_score != null ? Number(startSnap.estimated_score) : estimatedScoreEndVal
    const scoreChangeVal = estimatedScoreEndVal - estimatedScoreStartVal

    const aiFeedback = await generateAICoachComment({
      userId,
      weekNumber: week,
      accuracyChange: accuracyChangeVal,
      part7TimeChange: part7ChangeVal,
      predictedScore: estimatedScoreEndVal,
      predictedScoreChange: scoreChangeVal,
    }).catch(() => null)
    payload = {
      ...payload,
      estimated_score_start: startSnap.estimated_score != null ? Number(startSnap.estimated_score) : null,
      score_improvement: (endSnap.estimated_score != null && startSnap.estimated_score != null) ? Number(endSnap.estimated_score) - Number(startSnap.estimated_score) : null,
      accuracy_change: accuracyStart != null && accuracyEnd != null ? Math.round((accuracyEnd - accuracyStart) * 10) / 10 : null,
      part7_time_change: part7Change,
      weak_tags_improvement: tagImprovement,
      wrong_reduction_rate: wrongReductionRate,
      wrong_reduction_count: reductionCount,
      completion_rate: 100,
      ai_feedback: aiFeedback,
    }
  }

  const { data: inserted } = await supabase
    .from('weekly_reports')
    .upsert(payload, { onConflict: 'user_id,week' })
    .select()
    .single()
  return inserted
}

/**
 * 다음 주로 진행: current_week 증가, last_week_update 갱신, 해당 주 차 리포트 생성
 * @param {string} userId
 */
export async function advanceToNextWeek(userId) {
  const { status, currentWeek } = await getProgramPlan(userId)
  if (status !== 'active' || currentWeek >= 8) return { done: true, currentWeek }

  const nextWeek = currentWeek + 1
  await createWeekEndSnapshot(userId, currentWeek).catch(() => {})
  await generateWeeklyReport(userId, currentWeek)

  const { error } = await supabase
    .from('users')
    .update({
      current_week: nextWeek,
      last_week_update: new Date().toISOString(),
      ...(nextWeek >= 8 ? { program_status: 'completed' } : {}),
    })
    .eq('id', userId)
  if (error) throw error

  if (nextWeek <= 8) await createWeekStartSnapshot(userId, nextWeek).catch(() => {})
  return { done: nextWeek >= 8, currentWeek: nextWeek }
}

/**
 * v4.27: 날짜까지 남은 일수 (서비스 레이어용)
 */
function calcDaysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

/**
 * v4.27: 압축 플랜 뷰 모델 생성 (순수 함수 — DB 호출 없음)
 *
 * DB는 week 단위 그대로 유지.
 * 시험일까지 남은 일수 기준으로 week → block 동적 매핑.
 *
 * 압축 비율  = 56 / days_left
 * daily_task_count = min(round(avg_base × ratio), cap)
 *
 * D-57+   → null (압축 없음, week 그대로)
 * D-35~56 → 4 blocks: [1,2] [3,4] [5,6] [7,8]  cap=35
 * D-21~34 → 3 blocks: [1,2,3] [4,5,6] [7,8]    cap=35
 * D-20-   → 1 survival block                     cap=28
 *
 * @param {Array} plans  - user_program_plans rows (week 1~8)
 * @param {string} examDate - 'YYYY-MM-DD'
 * @returns {Array|null}
 */
export function buildCompressedPlan(plans, examDate) {
  if (!plans?.length || !examDate) return null

  const daysLeft = calcDaysUntil(examDate)
  if (daysLeft === null) return null

  // 티어 결정 (ProgramPage의 getCompressionTier와 동일 기준)
  let tier
  if (daysLeft > 56)      tier = 'none'
  else if (daysLeft >= 35) tier = 'light'
  else if (daysLeft >= 21) tier = 'medium'
  else                     tier = 'emergency'

  if (tier === 'none') return null

  const compressionRatio = 56 / Math.max(daysLeft, 1)

  // ── Survival mode (D-20 이하) ──────────────────────────────────────────
  if (tier === 'emergency') {
    const allTags  = [...new Set(plans.flatMap((p) => p.focus_tags  || []))]
    const allParts = [...new Set(plans.flatMap((p) => p.focus_parts || []))]
    const avgBase  = plans.reduce((s, p) => s + (p.daily_task_count ?? 20), 0) / plans.length
    return [{
      block_id:       1,
      label:          '핵심 집중 미션',
      week_label:     `Week 1~${plans.length}`,
      original_weeks: plans.map((p) => p.week),
      duration_days:  daysLeft,
      focus_tags:     allTags.slice(0, 5),
      focus_parts:    allParts.slice(0, 3),
      strategy_text:  '실전 최적화 집중 — 가장 취약한 파트 핵심 태그만',
      daily_task_count: Math.min(Math.round(avgBase * compressionRatio), 28),
      tier,
    }]
  }

  // ── Compressed mode (D-21~56) ──────────────────────────────────────────
  const BLOCK_GROUPS = tier === 'light'
    ? [[1, 2], [3, 4], [5, 6], [7, 8]]   // 4 blocks
    : [[1, 2, 3], [4, 5, 6], [7, 8]]     // 3 blocks
  const DAILY_CAP = 35

  return BLOCK_GROUPS.map((weekNums, idx) => {
    const weekPlans = plans.filter((p) => weekNums.includes(p.week))
    if (!weekPlans.length) return null

    const allTags  = [...new Set(weekPlans.flatMap((p) => p.focus_tags  || []))]
    const allParts = [...new Set(weekPlans.flatMap((p) => p.focus_parts || []))]

    // 일 평균 문제 수 × 압축 비율, cap 적용
    const avgBase = weekPlans.reduce((s, p) => s + (p.daily_task_count ?? 20), 0) / weekPlans.length
    const daily   = Math.min(Math.round(avgBase * compressionRatio), DAILY_CAP)

    // 기간 (block당 weeks 비율에 따라 배분)
    const durationDays = Math.max(1, Math.round(daysLeft * weekNums.length / 8))

    // 전략 텍스트 병합 (중복 제거, 최대 2개)
    const strategies   = [...new Set(weekPlans.map((p) => p.strategy_text).filter(Boolean))]
    const strategyText = strategies.slice(0, 2).join(' · ')

    const weekLabel = weekNums.length === 1
      ? `Week ${weekNums[0]}`
      : `Week ${weekNums[0]}~${weekNums[weekNums.length - 1]}`

    return {
      block_id:       idx + 1,
      label:          `집중 블록 ${idx + 1}`,
      week_label:     weekLabel,
      original_weeks: weekNums,
      duration_days:  durationDays,
      focus_tags:     allTags,
      focus_parts:    allParts,
      strategy_text:  strategyText,
      daily_task_count: daily,
      tier,
    }
  }).filter(Boolean)
}

/**
 * v4.27: 시험일 변경 — exam_date + program_end_date 재계산
 * program_start_date 기준 최대 100일(+bonus_days) 이내로 조정
 * @param {string} userId
 * @param {string} examDate - 'YYYY-MM-DD'
 * @returns {Promise<{ examDate: string, programEndDate: string }>}
 */
export async function updateExamDate(userId, examDate) {
  if (!userId || !examDate) throw new Error('필수 파라미터가 없습니다.')

  const { data: userRow } = await supabase
    .from('users')
    .select('program_start_date, bonus_days')
    .eq('id', userId)
    .maybeSingle()

  const startDate = userRow?.program_start_date
    ? new Date(userRow.program_start_date)
    : new Date()
  const bonusDays = Math.min(30, Math.max(0, Number(userRow?.bonus_days) || 0))

  const maxEndDate = new Date(startDate)
  maxEndDate.setDate(maxEndDate.getDate() + MAX_PROGRAM_DAYS + bonusDays)

  const parsedExamDate = new Date(examDate)
  parsedExamDate.setHours(23, 59, 59, 0)
  const endDate = parsedExamDate < maxEndDate ? parsedExamDate : maxEndDate

  const { error } = await supabase
    .from('users')
    .update({
      exam_date: examDate,
      program_end_date: endDate.toISOString(),
    })
    .eq('id', userId)

  if (error) throw error
  return { examDate, programEndDate: endDate.toISOString() }
}

/**
 * v4.22: 프로그램 연장 (재결제 시 endDate += days, 만료 경고 플래그 초기화)
 * @param {string} userId
 * @param {number} days 기본 30일
 * @returns {Promise<{ success: boolean, newEndDate: Date }>}
 */
export async function extendProgram(userId, days = 30) {
  if (!userId) throw new Error('사용자를 찾을 수 없습니다.')

  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('program_end_date, program_status')
    .eq('id', userId)
    .single()

  if (fetchErr || !user) throw new Error('사용자를 찾을 수 없습니다.')

  const baseDate = user.program_status === 'expired'
    ? new Date()
    : new Date(user.program_end_date || Date.now())

  const newEndDate = new Date(baseDate)
  newEndDate.setDate(newEndDate.getDate() + days)

  const { error: updateErr } = await supabase
    .from('users')
    .update({
      program_end_date: newEndDate.toISOString(),
      program_status: 'active',
      expiry_warning_sent_at: null,
    })
    .eq('id', userId)

  if (updateErr) throw new Error(updateErr.message)
  return { success: true, newEndDate }
}

/**
 * v4.24: 약점 Top10 기반 주차별 태그 배정 (8주)
 * @param {string} userId
 * @returns {Promise<Array<{ week: number, focusTagIds: string[], focusTagCodes: string[], dailyTarget: number, difficultyMix: string }>>}
 */
export async function buildWeeklyTagPlans(userId) {
  const weakTags = await getTop10WeakTags(userId).catch(() => [])

  if (weakTags.length === 0) {
    return [1, 2, 3, 4, 5, 6, 7, 8].map((week) => ({
      week,
      focusTagIds: [],
      focusTagCodes: [],
      dailyTarget: week <= 2 ? 25 : week <= 6 ? 20 : 30,
      difficultyMix: '2:1:1',
    }))
  }

  const grammarTags = weakTags.filter((t) => ['GRAMMAR', 'VOCAB', 'P5', 'P6'].includes(t.category)).slice(0, 3)
  const p7Tags = weakTags.filter((t) => t.category === 'P7').slice(0, 3)
  const lcTags = weakTags.filter((t) => t.category === 'LC').slice(0, 3)
  const metaTags = weakTags.filter((t) => t.category === 'META').slice(0, 2)

  const { data: trapTags } = await supabase
    .from('tag_master')
    .select('id, tag_code')
    .gte('tag_code', 'P7-091')
    .lte('tag_code', 'P7-097')
    .limit(2)

  const trapIds = trapTags?.map((t) => t.id) ?? []
  const trapCodes = trapTags?.map((t) => t.tag_code) ?? []

  return [
    { week: 1, focusTagIds: grammarTags.map((t) => t.tagId), focusTagCodes: grammarTags.map((t) => t.tagCode), dailyTarget: 25, difficultyMix: '2:1:1' },
    { week: 2, focusTagIds: grammarTags.map((t) => t.tagId), focusTagCodes: grammarTags.map((t) => t.tagCode), dailyTarget: 25, difficultyMix: '1:2:1' },
    { week: 3, focusTagIds: [...p7Tags.map((t) => t.tagId), ...trapIds], focusTagCodes: [...p7Tags.map((t) => t.tagCode), ...trapCodes], dailyTarget: 20, difficultyMix: '1:2:1' },
    { week: 4, focusTagIds: [...p7Tags.map((t) => t.tagId), ...trapIds], focusTagCodes: [...p7Tags.map((t) => t.tagCode), ...trapCodes], dailyTarget: 20, difficultyMix: '1:1:2' },
    { week: 5, focusTagIds: lcTags.map((t) => t.tagId), focusTagCodes: lcTags.map((t) => t.tagCode), dailyTarget: 25, difficultyMix: '2:1:1' },
    { week: 6, focusTagIds: lcTags.map((t) => t.tagId), focusTagCodes: lcTags.map((t) => t.tagCode), dailyTarget: 25, difficultyMix: '1:2:1' },
    { week: 7, focusTagIds: [...weakTags.slice(0, 3).map((t) => t.tagId), ...metaTags.map((t) => t.tagId)], focusTagCodes: [...weakTags.slice(0, 3).map((t) => t.tagCode), ...metaTags.map((t) => t.tagCode)], dailyTarget: 30, difficultyMix: '1:1:2' },
    { week: 8, focusTagIds: [...weakTags.slice(0, 5).map((t) => t.tagId), ...metaTags.map((t) => t.tagId)], focusTagCodes: [...weakTags.slice(0, 5).map((t) => t.tagCode), ...metaTags.map((t) => t.tagCode)], dailyTarget: 30, difficultyMix: '0:1:3' },
  ]
}

/**
 * v4.24: 주차별 태그 플랜을 user_program_plans에 반영 (focus_tag_ids만 갱신, 기존 focus_parts/strategy_text 유지)
 * @param {string} userId
 * @param {Array<{ week: number, focusTagIds: string[], focusTagCodes: string[], dailyTarget: number }>} plans
 */
const WEEK_PHASE_LABELS = {
  1: 'RC 집중 1주차',
  2: 'RC 집중 2주차',
  3: 'Part7 집중 1주차',
  4: 'Part7 집중 2주차',
  5: 'LC 집중 1주차',
  6: 'LC 집중 2주차',
  7: '실전 시뮬레이션',
  8: '최종 약점 제거',
}

export async function saveWeeklyTagPlans(userId, plans) {
  if (!plans?.length) return
  for (const p of plans) {
    const tagLabel = p.focusTagCodes?.length
      ? `집중 태그: ${p.focusTagCodes.slice(0, 3).join(', ')}`
      : '전체 균형'
    const strategyText = `${WEEK_PHASE_LABELS[p.week] ?? `${p.week}주차`} · ${tagLabel}`

    const { error } = await supabase
      .from('user_program_plans')
      .update({
        focus_tag_ids: p.focusTagIds ?? [],
        focus_tags: p.focusTagCodes ?? [],
        daily_task_count: p.dailyTarget ?? 20,
        strategy_text: strategyText,
      })
      .eq('user_id', userId)
      .eq('week', p.week)
    if (error) {
      if (isMissingUserProgramPlansTableError(error)) {
        console.warn('[saveWeeklyTagPlans] user_program_plans 테이블이 없어 업데이트를 건너뜁니다.')
        return
      }
      throw error
    }
  }
}
