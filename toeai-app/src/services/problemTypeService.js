import { supabase } from '../lib/supabase'

/**
 * 파트별 문제유형 목록 (2단 카테고리)
 * @param {number} part 1–7
 * @returns {Promise<Array<{ id: number, part: number, category_level1: string, category_level2: string }>>}
 */
export async function fetchProblemTypesByPart(part) {
  const p = Number(part)
  if (p < 1 || p > 7) return []
  const { data, error } = await supabase
    .from('problem_types')
    .select('id, part, category_level1, category_level2')
    .eq('part', p)
    .order('category_level1', { ascending: true })
    .order('category_level2', { ascending: true })

  if (error) {
    console.warn('problem_types 조회 실패:', error)
    return []
  }
  return data || []
}

/**
 * 문제유형에 연결된 추천 태그
 * @param {number} problemTypeId
 */
export async function fetchTagDictionaryByProblemType(problemTypeId) {
  if (problemTypeId == null || problemTypeId === '') return []
  const { data, error } = await supabase
    .from('tag_dictionary')
    .select('id, tag_name')
    .eq('problem_type_id', problemTypeId)
    .order('id', { ascending: true })

  if (error) {
    console.warn('tag_dictionary 조회 실패:', error)
    return []
  }
  return data || []
}
