import { supabase } from '../lib/supabase'

/**
 * v4.02: 풀이 기록 (정답률 추적용)
 * 오답 저장 시에는 wrong_answers만 사용하고, 별도로 맞은 문제를 기록할 때 이 함수 사용
 * @param {string} userId
 * @param {{ part: number, isCorrect: boolean, solvingTime?: number, sessionType?: 'mock_test'|'practice'|'review' }} payload
 */
export async function recordSolvedQuestion(userId, payload) {
  if (!userId || payload.part < 1 || payload.part > 7) return null
  const { data } = await supabase
    .from('solved_questions')
    .insert({
      user_id: userId,
      part: payload.part,
      is_correct: Boolean(payload.isCorrect),
      solving_time: payload.solvingTime ?? null,
      session_type: payload.sessionType ?? 'practice',
    })
    .select()
    .single()
  return data
}
