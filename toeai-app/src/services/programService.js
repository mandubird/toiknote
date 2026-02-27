import { supabase } from '../lib/supabase'
import { fetchTagStats, calculateEstimatedScore } from './fetchTagStats'
import { getUserProfile } from './userProfile'
import { performCompleteDiagnosis, getScoreRange } from './diagnosisService'
import { createWeekStartSnapshot, createWeekEndSnapshot, getSnapshotsForWeek } from './snapshotService'

/** 점수 구간 라벨 (계획서: 600 이하는 제외, 700-800 / 800-900 템플릿만 사용) */
const BAND_700_800 = '700-800'
const BAND_800_900 = '800-900'

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
  if (insertErr) throw insertErr

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

/**
 * v4.03: 진단 완료 후 Week1 시작 (고정 8주 구조)
 * @param {string} userId
 */
export async function startProgramV403(userId) {
  if (!userId) throw new Error('로그인이 필요해요.')

  const plans = V403_FIXED_WEEKS.map((p) => ({
    user_id: userId,
    week: p.week,
    focus_tags: p.focus_tags || [],
    focus_parts: p.focus_parts || [],
    daily_task_count: p.daily_task_count ?? 20,
    strategy_text: p.strategy_text || '',
  }))

  const { error: insertErr } = await supabase.from('user_program_plans').upsert(plans, { onConflict: 'user_id,week' })
  if (insertErr) throw insertErr

  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 56)

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

  const { error } = await supabase.from('user_program_plans').upsert(plans, { onConflict: 'user_id,week' })
  if (error) throw error
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
      .select('program_status, program_start_date, program_end_date, current_week, last_week_update')
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
    plans: plans || [],
    userProgram: userRow,
  }
}

/**
 * v4.04: 대시보드 요약 (코칭 화면용)
 * @param {string} userId
 * @returns {Promise<{ current_week: number, predicted_score: number|null, target_score: number|null, weekly_mission: string|null, accuracy_change: number|null, part7_time_change: number|null }>}
 */
export async function getDashboardSummary(userId) {
  if (!userId) {
    return { current_week: 0, predicted_score: null, target_score: null, weekly_mission: null, accuracy_change: null, part7_time_change: null }
  }
  const [plan, reports, profile, { data: scorePred }] = await Promise.all([
    getProgramPlan(userId),
    getWeeklyReports(userId),
    getUserProfile(userId),
    supabase.from('score_prediction').select('predicted_score').eq('user_id', userId).maybeSingle(),
  ])
  const currentPlan = plan?.plans?.find((p) => p.week === plan.currentWeek)
  const lastReport = reports?.length ? reports[reports.length - 1] : null
  return {
    current_week: plan?.currentWeek ?? 0,
    predicted_score: scorePred?.predicted_score ?? null,
    target_score: profile?.targetScore ?? null,
    weekly_mission: currentPlan?.strategy_text ?? null,
    accuracy_change: lastReport?.accuracy_change ?? null,
    part7_time_change: lastReport?.part7_time_change ?? null,
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
    const accChangeText = accuracyStart != null && accuracyEnd != null
      ? (accuracyEnd - accuracyStart >= 0 ? `+${Math.round((accuracyEnd - accuracyStart) * 10) / 10}%` : `${Math.round((accuracyEnd - accuracyStart) * 10) / 10}%`)
      : '-'
    const line1 = `현재 정확도: ${accuracyEnd != null ? Math.round(accuracyEnd * 10) / 10 : '-'}%`
    const line2 = `전주 대비 변화: ${accChangeText}`
    const line3 = nextPlan?.strategy_text ? `이번 주 집중: ${nextPlan.strategy_text}` : '이번 주 집중 포인트를 유지해 주세요.'
    const line4 = nextWeekStrategy ? `다음 주 전략: ${nextWeekStrategy}` : '다음 주에도 꾸준히 진행해 주세요.'
    const aiFeedback = [line1, line2, line3, line4].join('\n')
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
