import { supabase } from '../lib/supabase'

/**
 * visible_group_name → mastery_item_code 변환
 * 한글 그대로 코드로 사용 (URL-safe하게 정규화)
 */
function toItemCode(groupName) {
  return groupName.replace(/\s+/g, '_')
}

/**
 * auto_score + user_override → 최종 status 결정
 * @param {number} autoScore  0-100
 * @param {number} totalAttempts
 * @param {string|null} userOverride  'uncertain'|'needs_review'|'confident'|null
 * @returns {'not_started'|'in_progress'|'stabilizing'|'mastered'|'recheck'}
 */
function computeStatus(autoScore, totalAttempts, userOverride) {
  // 수동 재확인 요청 → 무조건 recheck
  if (userOverride === 'needs_review') return 'recheck'

  // 데이터 부족 → not_started
  if (totalAttempts < 3) return 'not_started'

  // auto 기본 판정
  let base
  if (autoScore >= 75 && totalAttempts >= 5) base = 'mastered'
  else if (autoScore >= 55) base = 'stabilizing'
  else base = 'in_progress'

  // user_override 보정
  if (userOverride === 'uncertain') {
    if (base === 'mastered') return 'stabilizing'
    if (base === 'stabilizing') return 'in_progress'
  }
  if (userOverride === 'confident') {
    if (base === 'in_progress' && autoScore >= 40) return 'stabilizing'
    if (base === 'stabilizing') return 'mastered'
  }

  return base
}

/**
 * status 별 코치 힌트 한 줄
 */
function buildCoachHint(name, status, autoScore) {
  switch (status) {
    case 'recheck':     return `${name} 최근 다시 흔들렸어요. 핵심 오답을 한 번 더 확인하세요.`
    case 'in_progress': return autoScore < 30
      ? `${name} 아직 기초 단계예요. 기본 패턴부터 반복 학습하세요.`
      : `${name} 서서히 잡히고 있어요. 조금 더 반복하면 안정화돼요.`
    case 'not_started': return `${name} 아직 풀이 데이터가 적어요. 오답을 몇 개 더 등록해보세요.`
    case 'stabilizing': return `${name} 거의 다 잡혔어요! 마지막 고빈출 유형만 한 번 더 확인해요.`
    case 'mastered':    return `${name} 현재 기준으로 완전히 잡혔어요. 가끔 리마인드만 하면 OK.`
    default:            return ''
  }
}

/**
 * status 정렬 우선순위 (작을수록 먼저)
 */
const STATUS_ORDER = { recheck: 0, in_progress: 1, not_started: 2, stabilizing: 3, mastered: 4 }

/**
 * 마스터리 보드 데이터 조회
 * @param {string} userId
 * @returns {Promise<Array<{
 *   code: string, name: string, status: string,
 *   autoScore: number, totalAttempts: number, accuracyRate: number,
 *   userOverride: string|null, coachHint: string
 * }>>}
 */
export async function getMasteryBoard(userId) {
  if (!userId) return []

  // 1. user_tag_stats + tag_master JOIN (visible_group_name 포함)
  const { data: tagStats, error } = await supabase
    .from('user_tag_stats')
    .select(`
      attempt_count,
      correct_count,
      tag:tag_master (
        visible_group_name
      )
    `)
    .eq('user_id', userId)
    .gt('attempt_count', 0)

  if (error) {
    console.error('getMasteryBoard tagStats 조회 실패:', error)
    return []
  }

  // 2. visible_group_name 별로 집계
  const groupMap = {}
  for (const row of tagStats ?? []) {
    const groupName = row.tag?.visible_group_name
    if (!groupName) continue
    if (!groupMap[groupName]) {
      groupMap[groupName] = { totalAttempts: 0, totalCorrect: 0 }
    }
    groupMap[groupName].totalAttempts += row.attempt_count ?? 0
    groupMap[groupName].totalCorrect  += row.correct_count  ?? 0
  }

  // 3. user_override 조회
  const { data: overrides } = await supabase
    .from('user_mastery_status')
    .select('mastery_item_code, user_override')
    .eq('user_id', userId)

  const overrideMap = {}
  for (const o of overrides ?? []) {
    overrideMap[o.mastery_item_code] = o.user_override
  }

  // 4. 각 그룹 → status 계산
  const items = Object.entries(groupMap).map(([name, agg]) => {
    const { totalAttempts, totalCorrect } = agg
    const accuracyRate = totalAttempts > 0 ? totalCorrect / totalAttempts : 0
    const autoScore    = Math.round(accuracyRate * 100)
    const code         = toItemCode(name)
    const userOverride = overrideMap[code] ?? null
    const status       = computeStatus(autoScore, totalAttempts, userOverride)
    const coachHint    = buildCoachHint(name, status, autoScore)

    return { code, name, status, autoScore, totalAttempts, accuracyRate, userOverride, coachHint }
  })

  // 5. 정렬: recheck → in_progress → not_started → stabilizing → mastered
  items.sort((a, b) => {
    const diff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    if (diff !== 0) return diff
    // 같은 status면 autoScore 낮은 순 (더 위험한 것 먼저)
    return a.autoScore - b.autoScore
  })

  return items
}

/**
 * 사용자 수동 체크 저장 (upsert)
 * @param {string} userId
 * @param {string} masteryItemCode
 * @param {string} masteryItemName
 * @param {'uncertain'|'needs_review'|'confident'|null} userOverride  null이면 초기화
 */
export async function setUserOverride(userId, masteryItemCode, masteryItemName, userOverride) {
  if (!userId || !masteryItemCode) return

  const { error } = await supabase
    .from('user_mastery_status')
    .upsert(
      {
        user_id:           userId,
        mastery_item_code: masteryItemCode,
        mastery_item_name: masteryItemName,
        user_override:     userOverride ?? null,
        updated_at:        new Date().toISOString(),
      },
      { onConflict: 'user_id,mastery_item_code' }
    )

  if (error) throw error
}
