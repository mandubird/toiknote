import { supabase } from '../lib/supabase'

/**
 * wrong_answers에서 Part 5 문법 / Part 7 유형 / Part 2 패턴 / 시간 부족 집계
 * @param {string} userId
 * @returns {Promise<{ part5Grammar: Array<{ name: string, count: number, sub?: Record<string,number> }>, part7Passage: Array<{ name: string, count: number }>, part7QuestionType: Array<{ name: string, count: number }>, part2Pattern: Array<{ name: string, count: number }>, part2AnswerType: Array<{ name: string, count: number }>, timeoutCount: number, totalCount: number }>}
 */
export async function fetchSegmentStats(userId) {
  if (!userId) {
    return {
      part5Grammar: [],
      part7Passage: [],
      part7QuestionType: [],
      part2Pattern: [],
      part2AnswerType: [],
      timeoutCount: 0,
      totalCount: 0,
      totalPart5: 0,
      totalPart7: 0,
      avgPart7TimeSeconds: null,
    }
  }

  const { data, error } = await supabase
    .from('wrong_answers')
    .select('part_number, grammar_category, grammar_sub_type, passage_type, question_type, question_pattern, answer_type, timeout_flag, solving_time')
    .eq('user_id', userId)

  if (error) {
    console.error('fetchSegmentStats', error)
    return {
      part5Grammar: [],
      part7Passage: [],
      part7QuestionType: [],
      part2Pattern: [],
      part2AnswerType: [],
      timeoutCount: 0,
      totalCount: 0,
      totalPart5: 0,
      totalPart7: 0,
      avgPart7TimeSeconds: null,
    }
  }

  const rows = data || []
  const totalCount = rows.length

  const part5 = rows.filter((r) => r.part_number === 5)
  const part7 = rows.filter((r) => r.part_number === 7)
  const part2 = rows.filter((r) => r.part_number === 2)
  const totalPart5 = part5.length
  const totalPart7 = part7.length

  const part7WithTime = part7.filter((r) => r.solving_time != null && r.solving_time >= 0)
  const avgPart7TimeSeconds =
    part7WithTime.length > 0
      ? Math.round(part7WithTime.reduce((sum, r) => sum + Number(r.solving_time), 0) / part7WithTime.length)
      : null

  const countBy = (arr, key, subKey = null) => {
    const map = {}
    const subMap = subKey ? {} : null
    arr.forEach((r) => {
      const v = r[key]
      const label = v && String(v).trim() ? String(v).trim() : '(미분류)'
      map[label] = (map[label] || 0) + 1
      if (subKey && r[subKey] && String(r[subKey]).trim()) {
        const subLabel = String(r[subKey]).trim()
        if (!subMap[label]) subMap[label] = {}
        subMap[label][subLabel] = (subMap[label][subLabel] || 0) + 1
      }
    })
    const list = Object.entries(map)
      .map(([name, count]) => ({ name, count, ...(subMap?.[name] && { sub: subMap[name] }) }))
      .sort((a, b) => b.count - a.count)
    return list
  }

  const part5Grammar = countBy(part5, 'grammar_category', 'grammar_sub_type')
  const part7Passage = countBy(part7, 'passage_type')
  const part7QuestionType = countBy(part7, 'question_type')
  const part2Pattern = countBy(part2, 'question_pattern')
  const part2AnswerType = countBy(part2, 'answer_type')

  const timeoutCount = rows.filter((r) => r.timeout_flag === true).length

  return {
    part5Grammar,
    part7Passage,
    part7QuestionType,
    part2Pattern,
    part2AnswerType,
    timeoutCount,
    totalCount,
    totalPart5,
    totalPart7,
    avgPart7TimeSeconds,
  }
}
