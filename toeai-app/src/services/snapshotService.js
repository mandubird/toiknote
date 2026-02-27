import { supabase } from '../lib/supabase'
import { fetchTagStats, calculateEstimatedScore } from './fetchTagStats'
import { getUserAccuracyStats } from './diagnosisService'

/**
 * 주차 시작 스냅샷 생성
 * @param {string} userId
 * @param {number} week
 */
export async function createWeekStartSnapshot(userId, week) {
  if (!userId || week < 1 || week > 8) return null
  const [tagStats, accuracyRows] = await Promise.all([
    fetchTagStats(userId),
    getUserAccuracyStats(userId),
  ])
  const estimated = calculateEstimatedScore(tagStats, 100, 100)
  const partAccuracy = {}
  const partAvgTime = {}
  ;(accuracyRows || []).forEach((r) => {
    partAccuracy[r.part] = r.accuracy_rate
    partAvgTime[r.part] = r.avg_solving_time
  })
  const totalWrong = tagStats.totalWrong || 0
  const { data } = await supabase.from('weekly_snapshots').insert({
    user_id: userId,
    week,
    snapshot_date: new Date().toISOString(),
    snapshot_type: 'week_start',
    total_wrong: totalWrong,
    total_solved: accuracyRows?.reduce((s, r) => s + (r.total_solved || 0), 0) || null,
    total_correct: accuracyRows?.reduce((s, r) => s + (r.correct_count || 0), 0) || null,
    accuracy_rate: accuracyRows?.length ? accuracyRows.reduce((s, r) => s + (r.accuracy_rate || 0), 0) / accuracyRows.length : null,
    part_accuracy: partAccuracy,
    part_avg_time: partAvgTime,
    tag_wrong_counts: tagStats.tagCounts || {},
    estimated_score: estimated,
  }).select().single()
  return data
}

/**
 * 주차 종료 스냅샷 생성 (현재 통계 기준)
 * @param {string} userId
 * @param {number} week
 */
export async function createWeekEndSnapshot(userId, week) {
  if (!userId || week < 1 || week > 8) return null
  const [tagStats, accuracyRows] = await Promise.all([
    fetchTagStats(userId),
    getUserAccuracyStats(userId),
  ])
  const estimated = calculateEstimatedScore(tagStats, 100, 100)
  const partAccuracy = {}
  const partAvgTime = {}
  ;(accuracyRows || []).forEach((r) => {
    partAccuracy[r.part] = r.accuracy_rate
    partAvgTime[r.part] = r.avg_solving_time
  })
  const totalWrong = tagStats.totalWrong || 0
  const { data } = await supabase.from('weekly_snapshots').insert({
    user_id: userId,
    week,
    snapshot_date: new Date().toISOString(),
    snapshot_type: 'week_end',
    total_wrong: totalWrong,
    total_solved: accuracyRows?.reduce((s, r) => s + (r.total_solved || 0), 0) || null,
    total_correct: accuracyRows?.reduce((s, r) => s + (r.correct_count || 0), 0) || null,
    accuracy_rate: accuracyRows?.length ? accuracyRows.reduce((s, r) => s + (r.accuracy_rate || 0), 0) / accuracyRows.length : null,
    part_accuracy: partAccuracy,
    part_avg_time: partAvgTime,
    tag_wrong_counts: tagStats.tagCounts || {},
    estimated_score: estimated,
  }).select().single()
  return data
}

/**
 * 해당 주차 시작/종료 스냅샷 조회
 * @param {string} userId
 * @param {number} week
 */
export async function getSnapshotsForWeek(userId, week) {
  const { data } = await supabase
    .from('weekly_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('week', week)
    .order('snapshot_date', { ascending: true })
  return data || []
}
